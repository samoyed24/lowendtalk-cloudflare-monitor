// One completed run per KV key; inverted timestamps make KV's lexical order newest-first.
export const RUN_PREFIX = "console-run:";
export const LOG_RETENTION_DAYS = 30;
const MAX_LOG_ENTRIES = 300;
const MAX_MESSAGE_CHARS = 2000;
const encoder = new TextEncoder();

export type RunKind = "cron" | "feed" | "preview" | "mail";
export interface RunSummary {
	id: string;
	kind: RunKind;
	actor: string;
	startedAt: string;
	finishedAt: string;
	status: "success" | "failed";
	message: string;
}
export interface LogEntry {
	at: string;
	message: string;
}
interface StoredRun {
	run: RunSummary;
	items: LogEntry[];
	dropped: number;
}

export function createRedactor(secrets: readonly string[]): (message: string) => string {
	const values = [...new Set(secrets.filter(Boolean).flatMap((secret) => [secret, encodeURIComponent(secret), JSON.stringify(secret).slice(1, -1)]))]
		.sort((a, b) => b.length - a.length);
	return (message) => {
		let safe = message;
		for (const secret of values) {
			safe = safe.split(secret).join("[REDACTED]");
			// Upstream fetch/AI errors may already have been clipped mid-credential.
			if (secret.length > 4) {
				const start = safe.lastIndexOf(secret.slice(0, 4));
				if (start >= 0 && secret.startsWith(safe.slice(start))) safe = safe.slice(0, start) + "[REDACTED]";
			}
		}
		return safe
			.replace(/\b(Bearer|Basic)\s+[^\s"'<>]+/gi, "$1 [REDACTED]")
			.replace(/((?:["']?(?:api[_-]?key|access[_-]?token|token|password|passwd|secret|authorization|notify_key|pc_key|smtp_pass)["']?)\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s&,;<>]+)/gi, "$1[REDACTED]")
			.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@");
	};
}

function truncate(message: string): string {
	const suffix = " … [truncated]";
	return message.length <= MAX_MESSAGE_CHARS ? message : message.slice(0, MAX_MESSAGE_CHARS - suffix.length) + suffix;
}

// Limit the JSON-encoded byte length, including escapes, not just UTF-16 length.
function fitJsonString(value: string, bytes: number): string {
	if (encoder.encode(JSON.stringify(value)).byteLength <= bytes) return value;
	let low = 0;
	let high = value.length;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		if (encoder.encode(JSON.stringify(value.slice(0, mid) + "…")).byteLength <= bytes) low = mid;
		else high = mid - 1;
	}
	return value.slice(0, low) + "…";
}

export class RunLog {
	readonly id: string;
	private readonly startedAt: string;
	private readonly entries: LogEntry[] = [];
	private dropped = 0;

	constructor(
		private readonly kind: RunKind,
		private readonly actor: string,
		private readonly redact: (message: string) => string,
		private readonly nowMs: () => number = Date.now,
		private readonly output: (message: string) => void = console.log,
	) {
		const startedMs = nowMs();
		this.id = `${String(9999999999999 - startedMs).padStart(13, "0")}-${crypto.randomUUID()}`;
		this.startedAt = new Date(startedMs).toISOString();
	}

	readonly log = (message: string): void => {
		const safe = this.redact(message);
		const entry = { at: new Date(this.nowMs()).toISOString(), message: truncate(safe) };
		if (this.entries.length < MAX_LOG_ENTRIES) this.entries.push(entry);
		else {
			// Keep the first 299 entries plus the latest, so completion/failure is always visible.
			this.entries[MAX_LOG_ENTRIES - 1] = entry;
			this.dropped++;
		}
		this.output(safe);
	};

	async save(state: KVNamespace, status: RunSummary["status"], message: string): Promise<void> {
		const run: RunSummary = {
			id: this.id,
			kind: this.kind,
			actor: fitJsonString(this.redact(this.actor), 400),
			startedAt: this.startedAt,
			finishedAt: new Date(this.nowMs()).toISOString(),
			status,
			message: "",
		};
		const fixedBytes = encoder.encode(JSON.stringify(run)).byteLength - 2;
		run.message = fitJsonString(this.redact(message), 1024 - fixedBytes);
		const record: StoredRun = { run, items: this.entries, dropped: this.dropped };
		await state.put(RUN_PREFIX + this.id, JSON.stringify(record), {
			expirationTtl: LOG_RETENTION_DAYS * 24 * 60 * 60,
			metadata: run,
		});
	}
}

function boundedPageSize(pageSize: number): number {
	return Number.isFinite(pageSize) ? Math.min(100, Math.max(1, Math.floor(pageSize))) : 20;
}

export async function listRuns(state: KVNamespace, cursor: string | undefined, pageSize: number): Promise<{ items: RunSummary[]; nextCursor: string | null }> {
	const result = await state.list<RunSummary>({
		prefix: RUN_PREFIX,
		limit: boundedPageSize(pageSize),
		...(cursor === undefined ? {} : { cursor }),
	});
	return {
		items: result.keys.flatMap((key) => key.metadata === undefined || key.metadata === null ? [] : [key.metadata]),
		nextCursor: result.list_complete ? null : result.cursor,
	};
}

export async function getRunPage(state: KVNamespace, id: string, page: number, pageSize: number): Promise<{
	run: RunSummary; items: LogEntry[]; page: number; pageSize: number; total: number; dropped: number;
} | null> {
	const raw = await state.get(RUN_PREFIX + id);
	if (raw === null) return null;
	const record = JSON.parse(raw) as StoredRun;
	const size = boundedPageSize(pageSize);
	const currentPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const start = (currentPage - 1) * size;
	return { run: record.run, items: record.items.slice(start, start + size), page: currentPage, pageSize: size, total: record.items.length, dropped: record.dropped };
}
