// Worker bindings and run execution; each invocation owns its own persisted log buffer.
import { buildAlert, buildDigest, classify, fetchFeed, merge, parsePosts, runPipeline, sendMail } from "./monitor";
import type { Deps, MonitorConfig, PipelineState, RunHandlers } from "./monitor";
import { createRedactor, RunLog } from "./run-store";
import type { RunKind } from "./run-store";

export type RuntimeEnv = Omit<Env, "AI" | "NOTIFY_USE_PRESET" | "NOTIFY_TYPE"> & {
	AI: Pick<Ai, "run">;
	NOTIFY_USE_PRESET?: string;
	NOTIFY_TYPE?: string;
};

const CLASSIFY_RESPONSE_FORMAT = {
	type: "json_schema",
	json_schema: {
		type: "array",
		items: {
			type: "object",
			properties: {
				i: { type: "integer" },
				tags: { type: "array", items: { type: "string" } },
				prices: {
					type: "array",
					items: {
						type: "object",
						properties: {
							amount: { type: "number" },
							currency: { type: ["string", "null"] },
							period: { type: "string" },
						},
						required: ["amount", "currency", "period"],
						additionalProperties: false,
					},
				},
				zh: { type: "string" },
			},
			required: ["i", "tags", "prices", "zh"],
			additionalProperties: false,
		},
	},
};

const STATE_KEY = "let-monitor-state-v1";

export interface RuntimeDeps extends Deps {
	loadState?: () => Promise<PipelineState>;
	saveState?: (state: PipelineState) => Promise<void>;
	aiChat?: (system: string, user: string) => Promise<string>;
	sendMail?: (subject: string, html: string, text: string) => Promise<void>;
}

function readInt(raw: string | undefined, fallback: number): number {
	const n = parseInt(raw ?? "", 10);
	return Number.isFinite(n) ? n : fallback;
}

type AppEnv = RuntimeEnv & {
	NOTIFY_URL?: string;
	NOTIFY_TIMEOUT?: string;
	NOTIFY_KEY?: string;
	NOTIFY_TO?: string;
	PC_URL?: string;
	PC_TIMEOUT?: string;
	PC_KEY?: string;
	PC_TO?: string;
	SMTP_HOST?: string;
	SMTP_PORT?: string;
	SMTP_USER?: string;
	SMTP_PASS?: string;
	MAIL_TO?: string;
};

function envStr(env: AppEnv, key: "NOTIFY_KEY" | "NOTIFY_TO" | "PC_KEY" | "PC_TO" | "SMTP_USER" | "SMTP_PASS" | "MAIL_TO"): string {
	const v = env[key];
	return typeof v === "string" ? v : "";
}

export function buildConfig(env: AppEnv): MonitorConfig {
	const requireTag = String(env.REQUIRE_SERVER_TAG);
	const notifyTimeoutRaw = readInt(String(env.NOTIFY_TIMEOUT ?? env.PC_TIMEOUT), 60);
	const smtpPortRaw = readInt(String(env.SMTP_PORT ?? "465"), 465);
	const presetRaw = (env.NOTIFY_USE_PRESET || "false").trim().toLowerCase();
	if (!["true", "false", "1", "0", "yes", "no", "on", "off"].includes(presetRaw)) {
		throw new Error("NOTIFY_USE_PRESET 必须是布尔值（true/false、1/0、yes/no、on/off）");
	}
	const notifyUsePreset = ["true", "1", "yes", "on"].includes(presetRaw);
	const notifyType = notifyUsePreset ? "email" : env.NOTIFY_TYPE || "email";
	if (notifyType !== "email" && notifyType !== "ntfy") {
		throw new Error("NOTIFY_TYPE 必须是 email 或 ntfy");
	}
	const notifyKey = envStr(env, "NOTIFY_KEY") || envStr(env, "PC_KEY");
	if (notifyUsePreset && !notifyKey) throw new Error("发送预设需要配置 NOTIFY_KEY");
	return {
		feedUrl: String(env.FEED_URL),
		lookbackDays: readInt(String(env.LOOKBACK_DAYS), 7),
		maxPosts: readInt(String(env.MAX_POSTS), 60),
		classifyBatchSize: readInt(String(env.CLASSIFY_BATCH_SIZE), 1),
		requireServerTag: requireTag !== "false" && requireTag !== "0",
		intervalMinutes: readInt(String(env.INTERVAL_MINUTES), 60),
		aiModel: String(env.AI_MODEL),
		notifyUrl: String(env.NOTIFY_URL ?? env.PC_URL ?? "https://notify.portcloud.online").replace(/\/+$/, ""),
		notifyKey,
		notifyUsePreset,
		notifyType,
		notifyTo: notifyUsePreset ? "" : envStr(env, "NOTIFY_TO") || envStr(env, "PC_TO"),
		notifyTimeout: notifyTimeoutRaw > 0 ? notifyTimeoutRaw : 60,
		smtpHost: String(env.SMTP_HOST ?? "smtp.qq.com"),
		smtpPort: smtpPortRaw > 0 ? smtpPortRaw : 465,
		smtpUser: envStr(env, "SMTP_USER"),
		smtpPass: envStr(env, "SMTP_PASS"),
		smtpTo: envStr(env, "MAIL_TO"),
	};
}

export async function loadStateFromKv(env: Pick<Env, "STATE">, d: Deps = {}): Promise<PipelineState> {
	try {
		const raw = await env.STATE.get(STATE_KEY);
		if (!raw) return { sent: [] };
		const data: unknown = JSON.parse(raw);
		if (typeof data === "object" && data !== null && "sent" in data && Array.isArray(data.sent)) {
			const sent = data.sent.filter((u): u is string => typeof u === "string");
			const lastRun = "lastRun" in data && typeof data.lastRun === "string" ? data.lastRun : undefined;
			return lastRun === undefined ? { sent } : { sent, lastRun };
		}
		(d.log ?? ((msg: string) => console.log(JSON.stringify({ scope: "state", msg }))))("状态损坏，按空状态处理");
		return { sent: [] };
	} catch {
		(d.log ?? ((msg: string) => console.log(JSON.stringify({ scope: "state", msg }))))("状态损坏，按空状态处理");
		return { sent: [] };
	}
}

// Workers AI 的 chat 输出：{ response }（文本或 JSON Mode 数组），或 { choices[0].message.content }。
function extractAiText(out: unknown): string {
	if (typeof out !== "object" || out === null) return "";
	if ("response" in out && typeof out.response === "string" && out.response) return out.response;
	if ("choices" in out && Array.isArray(out.choices)) {
		const first: unknown = out.choices[0];
		if (typeof first === "object" && first !== null && "message" in first) {
			const msg: unknown = first.message;
			if (typeof msg === "object" && msg !== null && "content" in msg && typeof msg.content === "string") {
				return msg.content;
			}
		}
		if (typeof first === "object" && first !== null && "text" in first && typeof first.text === "string") {
			return first.text;
		}
	}
	if ("response" in out && Array.isArray(out.response)) return JSON.stringify(out.response);
	return "";
}

async function aiChatViaBinding(env: RuntimeEnv, model: string, system: string, user: string, d: Deps): Promise<string> {
	const isQwen = model === "@cf/qwen/qwen3-30b-a3b-fp8";
	let last: unknown = null;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const out: unknown = await env.AI.run(
				model as Parameters<Ai["run"]>[0],
				{
					messages: [
						{ role: "system", content: system },
						{ role: "user", content: isQwen ? `${user}\n/no_think` : user },
					],
					temperature: 0,
					max_tokens: 8000,
					...(isQwen ? { response_format: CLASSIFY_RESPONSE_FORMAT } : {}),
				} as Record<string, unknown>,
			);
			const text = extractAiText(out);
			if (!text) throw new Error(`AI 响应里没有文本: ${JSON.stringify(out)?.slice(0, 300)}`);
			return text;
		} catch (exc) {
			last = exc;
			if (exc instanceof Error && /没有文本/.test(exc.message)) throw exc;
			(d.log ?? console.log)(`AI 调用失败 (${attempt}/3): ${exc instanceof Error ? exc.message.slice(0, 200) : String(exc).slice(0, 200)}`);
			if (attempt < 3 && d.sleep !== undefined) await d.sleep(5000 * attempt);
			else if (attempt < 3) {
				const { promise, resolve } = Promise.withResolvers<void>();
				setTimeout(resolve, 5000 * attempt);
				await promise;
			}
		}
	}
	throw new Error(`AI 调用失败: ${last instanceof Error ? last.message : String(last)}`);
}

export class ConsoleTestError extends Error {
	readonly runId: string;

	constructor(message: string, runId: string) {
		super(message);
		this.name = "ConsoleTestError";
		this.runId = runId;
	}
}

function createExecution(env: AppEnv, kind: RunKind, actor: string, deps: RuntimeDeps, output: (message: string) => void) {
	const cfg = buildConfig(env);
	const secrets = Object.entries(env)
		.filter(([key, value]) => typeof value === "string" && /(?:key|token|secret|pass(?:word)?)$/i.test(key))
		.map(([, value]) => String(value));
	const redact = createRedactor(secrets);
	const run = new RunLog(kind, actor, redact, deps.nowMs ?? Date.now, output);
	const d: RuntimeDeps = { ...deps, log: run.log };
	const handlers: RunHandlers = {
		loadState: d.loadState ?? (() => loadStateFromKv(env, d)),
		saveState: d.saveState ?? ((state) => env.STATE.put(STATE_KEY, JSON.stringify(state))),
		aiChat: d.aiChat ?? ((system, user) => aiChatViaBinding(env, cfg.aiModel, system, user, d)),
		send: d.sendMail ?? ((subject, html, text) => sendMail(subject, html, text, cfg, d)),
	};
	return { cfg, redact, run, d, handlers };
}

export async function handleCron(env: RuntimeEnv, cron: string, deps: RuntimeDeps = {}, scheduledAt?: number): Promise<void> {
	const { cfg, run, d, handlers, redact } = createExecution(
		env, "cron", "cron", deps,
		deps.log ?? ((msg) => console.log(JSON.stringify({ scope: "cron", cron, msg }))),
	);
	run.log(`开始（cron=${cron}）`);
	let failed = false;
	let failure: unknown;
	let message = "";
	try {
		const result = await runPipeline(cfg, { scheduledAt }, handlers, d);
		message = `完成（cron=${cron}）：${result.emailed ? `已推送 ${result.items ?? 0} 条` : "无新增"}`;
		run.log(message);
	} catch (exc) {
		failed = true;
		failure = exc;
		const err = redact(`${exc instanceof Error ? exc.constructor.name : typeof exc}: ${exc instanceof Error ? exc.message : String(exc)}`);
		message = `运行失败: ${err}`;
		run.log(message);
		try {
			const alert = buildAlert(err);
			await handlers.send(alert.subject, alert.html, alert.text);
		} catch (alertExc) {
			run.log(`告警邮件也发不出去: ${alertExc instanceof Error ? alertExc.message : String(alertExc)}`);
		}
	}
	// Persistence is outside the pipeline/alert catch: a delivered email must not become a mail failure.
	try {
		await run.save(env.STATE, failed ? "failed" : "success", message);
	} catch (storageExc) {
		const storageError = redact(storageExc instanceof Error ? storageExc.message : String(storageExc));
		run.log(`运行日志保存失败: ${storageError}`);
		if (!failed) throw new Error(`${message}；运行日志保存失败: ${storageError}`);
	}
	if (failed) throw failure;
}

export async function runConsoleTest(env: RuntimeEnv, kind: Exclude<RunKind, "cron">, actor: string, deps: RuntimeDeps = {}): Promise<{
	runId: string; result: { message: string; html?: string };
}> {
	const { cfg, run, d, handlers, redact } = createExecution(
		env, kind, actor, deps,
		deps.log ?? ((msg) => console.log(JSON.stringify({ scope: "console-test", kind, msg }))),
	);
	const nowMs = d.nowMs ?? Date.now;
	run.log(`开始控制台测试：${kind}`);
	let result: { message: string; html?: string } | undefined;
	let failure: string | undefined;
	try {
		if (kind === "mail") {
			const text = `LowEndTalk 控制台测试邮件\n\n这是手动触发的测试邮件，不会改变帖子处理状态。\n时间：${new Date(nowMs()).toISOString()}`;
			await handlers.send("[LET] 控制台测试邮件", "<p>LowEndTalk 控制台测试邮件：发信通道连接成功。本次测试不会改变帖子处理状态。</p>", text);
			result = { message: "测试邮件已通过所有已配置通道发送；未修改帖子处理状态。" };
		} else {
			const feed = await fetchFeed(cfg, d);
			const posts = parsePosts(feed, kind === "preview" ? { ...cfg, maxPosts: 1 } : cfg, nowMs());
			if (kind === "feed") {
				result = { message: `RSS 抓取成功：${feed.items.length} 条，窗口内保留 ${posts.length} 条。最新标题：${posts[0]?.title.slice(0, 200) ?? "（窗口内无帖子）"}` };
			} else {
				const items = merge(await classify(posts, cfg, handlers.aiChat, d), posts, cfg.requireServerTag);
				const digest = buildDigest(items, nowMs());
				result = {
					message: `已预览最新 ${posts.length} 条帖子，匹配 ${items.length} 条；忽略去重、不改状态、不发信。${posts[0] === undefined ? "" : ` 最新标题：${posts[0].title.slice(0, 200)}`}`,
					html: digest.html,
				};
			}
		}
		result.message = redact(result.message).slice(0, 500);
		run.log(result.message);
	} catch (exc) {
		failure = redact(exc instanceof Error ? exc.message : String(exc)).slice(0, 2000);
		run.log(`控制台测试失败: ${failure}`);
	}
	let storageFailure: string | undefined;
	try {
		await run.save(env.STATE, failure === undefined ? "success" : "failed", failure ?? result?.message ?? "");
	} catch (exc) {
		storageFailure = redact(exc instanceof Error ? exc.message : String(exc)).slice(0, 500);
		run.log(`运行日志保存失败: ${storageFailure}`);
	}
	if (failure !== undefined) {
		throw new ConsoleTestError(`${failure}${storageFailure === undefined ? "" : `；运行日志保存也失败: ${storageFailure}`}`, run.id);
	}
	if (storageFailure !== undefined) {
		throw new ConsoleTestError(`${result?.message ?? "测试已完成"} 但运行日志保存失败: ${storageFailure}`, run.id);
	}
	// All successful branches produce a result; this also guards against an invalid untyped caller.
	if (result === undefined) throw new ConsoleTestError("未知测试类型", run.id);
	return { runId: run.id, result };
}
