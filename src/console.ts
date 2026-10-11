import { renderConsole } from "./console-ui";
import { buildConfig, ConsoleTestError, loadStateFromKv, runConsoleTest } from "./runtime";
import type { RuntimeEnv } from "./runtime";
import { getRunPage, listRuns } from "./run-store";

const RUN_ID = /^\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secure(response: Response, nonce?: string): Response {
	response.headers.set("Cache-Control", "no-store");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Referrer-Policy", "no-referrer");
	response.headers.set("Content-Security-Policy", nonce
		? `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
		: "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
	return response;
}

function json(value: unknown, status = 200): Response {
	return secure(Response.json(value, { status }));
}

function integer(params: URLSearchParams, key: string, fallback: number, max: number): number {
	const raw = params.get(key);
	if (raw === null) return fallback;
	if (!/^[1-9]\d{0,6}$/.test(raw)) throw new BadRequest(`${key} 必须是正整数`);
	const value = Number(raw);
	if (value > max) throw new BadRequest(`${key} 不能超过 ${max}`);
	return value;
}

class BadRequest extends Error {}

// Limit streamed bodies as well as Content-Length; neither anonymous nor authenticated
// callers can make the login/API handler buffer an unbounded request.
async function testKind(request: Request): Promise<"feed" | "preview" | "mail"> {
	const contentType = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
	if (contentType !== "application/json") throw new BadRequest("请求必须使用 application/json");
	const reader = request.body?.getReader();
	if (!reader) throw new BadRequest("缺少测试参数");
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 4096) {
				await reader.cancel();
				throw new BadRequest("请求体不能超过 4096 字节");
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
	let data: unknown;
	try { data = JSON.parse(new TextDecoder().decode(body)); }
	catch { throw new BadRequest("请求体不是合法 JSON"); }
	if (typeof data !== "object" || data === null || !("kind" in data)
		|| (data.kind !== "feed" && data.kind !== "preview" && data.kind !== "mail")) {
		throw new BadRequest("未知的测试类型");
	}
	return data.kind;
}

export async function handleConsole(request: Request, env: RuntimeEnv, ctx: Pick<ExecutionContext, "access">): Promise<Response> {
	const url = new URL(request.url);
	// This context is supplied by Cloudflare after Access authentication. Client
	// headers such as Cf-Access-Authenticated-User-Email are never an authority.
	if (!ctx.access) return json({ error: "需要 Cloudflare Access 登录。请为此 Worker 启用 Access 并选择 Cloudflare 账号策略。" }, 403);
	try {
		const identity = await ctx.access.getIdentity();
		if (!identity?.email) return json({ error: "无法确认登录用户身份" }, 403);

		if (url.pathname === "/api/test") {
			if (request.method !== "POST") return methodNotAllowed("POST");
			if (request.headers.get("Origin") !== url.origin
				|| request.headers.get("Sec-Fetch-Site") === "cross-site") {
				return json({ error: "拒绝跨站测试请求" }, 403);
			}
			const kind = await testKind(request);
			return json(await runConsoleTest(env, kind, identity.email));
		}
		if (request.method !== "GET") return methodNotAllowed("GET");

		if (url.pathname === "/") {
			const { html, nonce } = renderConsole();
			return secure(new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }), nonce);
		}
		if (url.pathname === "/api/overview") {
			const state = await loadStateFromKv(env);
			const config = buildConfig(env);
			const channels = [];
			if (config.notifyKey && config.notifyTo) channels.push("Portcloud Notify");
			if (config.smtpUser && config.smtpPass && config.smtpTo) channels.push("SMTP");
			return json({ email: identity.email, processed: state.sent.length, lastRun: state.lastRun ?? null,
				intervalMinutes: config.intervalMinutes, aiModel: config.aiModel, channels, logRetentionDays: 30 });
		}
		if (url.pathname === "/api/records") {
			const page = integer(url.searchParams, "page", 1, 1_000_000);
			const pageSize = integer(url.searchParams, "pageSize", 20, 100);
			const state = await loadStateFromKv(env);
			const end = Math.max(0, state.sent.length - (page - 1) * pageSize);
			const items = state.sent.slice(Math.max(0, end - pageSize), end).reverse();
			return json({ items, page, pageSize, total: state.sent.length });
		}
		if (url.pathname === "/api/runs") {
			const pageSize = integer(url.searchParams, "pageSize", 20, 100);
			const cursor = url.searchParams.get("cursor") || undefined;
			if (cursor && cursor.length > 2048) throw new BadRequest("cursor 过长");
			return json(await listRuns(env.STATE, cursor, pageSize));
		}
		if (url.pathname.startsWith("/api/runs/")) {
			const id = url.pathname.slice("/api/runs/".length);
			if (!RUN_ID.test(id)) return json({ error: "运行记录不存在" }, 404);
			const page = integer(url.searchParams, "page", 1, 1_000_000);
			const pageSize = integer(url.searchParams, "pageSize", 20, 100);
			const detail = await getRunPage(env.STATE, id, page, pageSize);
			return detail ? json(detail) : json({ error: "运行记录不存在或已过期" }, 404);
		}
		return json({ error: "Not found" }, 404);
	} catch (exc) {
		if (exc instanceof BadRequest) return json({ error: exc.message }, 400);
		if (exc instanceof ConsoleTestError) return json({ error: exc.message, runId: exc.runId }, 502);
		console.error(JSON.stringify({ scope: "console", msg: "管理端请求失败", path: url.pathname }));
		return json({ error: "管理端请求失败，请查看 Worker 日志" }, 500);
	}
}

function methodNotAllowed(allow: string): Response {
	const response = json({ error: `此接口只接受 ${allow}` }, 405);
	response.headers.set("Allow", allow);
	return response;
}
