import { describe, expect, it, vi } from "vitest";
import { handleConsole } from "../src/console";
import type { RuntimeEnv } from "../src/runtime";

const origin = "https://monitor.example.com";
const authenticated = { access: { aud: "test-audience", getIdentity: async () => ({ email: "owner@example.com" }) } };

function fixture(sent: string[] = []) {
	const get = vi.fn().mockImplementation(async () => JSON.stringify({ sent, lastRun: "2026-10-11T03:00:00.000Z" }));
	const env: RuntimeEnv = {
		STATE: { get, put: vi.fn(), list: vi.fn(), delete: vi.fn(), getWithMetadata: vi.fn() },
		AI: { run: vi.fn() },
		AI_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8", FEED_URL: "https://lowendtalk.com/categories/offers/feed.rss",
		LOOKBACK_DAYS: "7", MAX_POSTS: "60", CLASSIFY_BATCH_SIZE: "1", REQUIRE_SERVER_TAG: "true",
		INTERVAL_MINUTES: "60", NOTIFY_URL: "https://notify.portcloud.online", NOTIFY_TIMEOUT: "60",
		SMTP_HOST: "smtp.qq.com", SMTP_PORT: "465", NOTIFY_KEY: "", NOTIFY_TO: "",
	};
	return { env, get };
}

function req(path: string, init?: RequestInit) { return new Request(origin + path, init); }

describe("console authorization and input boundaries", () => {
	it("拒绝所有未认证页面与接口，伪造身份头不能授权，且不读取状态", async () => {
		const { env, get } = fixture();
		for (const path of ["/", "/api/overview", "/api/records", "/api/runs", "/api/runs/anything", "/api/test"]) {
			const response = await handleConsole(req(path, { headers: {
				"Cf-Access-Authenticated-User-Email": "owner@example.com", "Cf-Access-Jwt-Assertion": "forged",
			} }), env, {});
			expect(response.status).toBe(403);
			expect(response.headers.get("Cache-Control")).toBe("no-store");
		}
		expect(get).not.toHaveBeenCalled();
	});

	it("Access 未提供身份或身份查询失败时不能返回页面数据", async () => {
		const { env, get } = fixture();
		const missing = await handleConsole(req("/api/records"), env, { access: {
			aud: "test-audience", getIdentity: async () => undefined,
		} });
		expect(missing.status).toBe(403);
		const failed = await handleConsole(req("/api/records"), env, { access: {
			aud: "test-audience", getIdentity: async () => { throw new Error("internal credential secret"); },
		} });
		expect(failed.status).toBe(500);
		expect(await failed.text()).not.toContain("internal credential secret");
		expect(get).not.toHaveBeenCalled();
	});

	it("记录页按最新记录优先返回，末页和超出范围不重复首尾记录", async () => {
		const { env } = fixture(["https://a.example/1", "https://a.example/2", "https://a.example/3", "https://a.example/4", "https://a.example/5"]);
		const pages = [];
		for (const page of [1, 2, 3, 4]) {
			const response = await handleConsole(req(`/api/records?page=${page}&pageSize=2`), env, authenticated);
			pages.push(await response.json());
		}
		expect(pages).toEqual([
			{ items: ["https://a.example/5", "https://a.example/4"], page: 1, pageSize: 2, total: 5 },
			{ items: ["https://a.example/3", "https://a.example/2"], page: 2, pageSize: 2, total: 5 },
			{ items: ["https://a.example/1"], page: 3, pageSize: 2, total: 5 },
			{ items: [], page: 4, pageSize: 2, total: 5 },
		]);
	});

	it("概要显示通道状态但不泄露配置中的密钥和收件邮箱", async () => {
		const { env } = fixture();
		Object.assign(env, {
			NOTIFY_KEY: "private-notify-key", NOTIFY_TO: "private-recipient@example.com",
			SMTP_USER: "private-smtp-user@example.com", SMTP_PASS: "private-smtp-password",
			MAIL_TO: "private-mail-to@example.com",
		});
		const response = await handleConsole(req("/api/overview"), env, authenticated);
		expect(response.status).toBe(200);
		const body = await response.text();
		expect(JSON.parse(body).channels).toEqual(["Portcloud Notify", "SMTP"]);
		for (const secret of ["private-notify-key", "private-recipient@", "private-smtp-user@", "private-smtp-password", "private-mail-to@"]) {
			expect(body).not.toContain(secret);
		}
	});

	it("拒绝非法分页和越界 pageSize，不将大批数据回传", async () => {
		const { env, get } = fixture();
		for (const query of ["page=0", "page=-1", "page=1.5", "page=1e3", "pageSize=101", "pageSize=0", "page=1000001"]) {
			const response = await handleConsole(req(`/api/records?${query}`), env, authenticated);
			expect(response.status).toBe(400);
		}
		expect(get).not.toHaveBeenCalled();
	});

	it("GET 不能触发测试，跨站请求即使已登录也被拒绝", async () => {
		const { env, get } = fixture();
		const getResponse = await handleConsole(req("/api/test"), env, authenticated);
		expect(getResponse.status).toBe(405);
		expect(getResponse.headers.get("Allow")).toBe("POST");
		for (const headers of [
			{ Origin: "https://attacker.example", "Content-Type": "application/json" },
			{ "Content-Type": "application/json" },
			{ Origin: origin, "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" },
		]) {
			const response = await handleConsole(req("/api/test", { method: "POST", headers, body: '{"kind":"mail"}' }), env, authenticated);
			expect(response.status).toBe(403);
		}
		expect(get).not.toHaveBeenCalled();
	});

	it("拒绝非 JSON、无效 JSON、未知测试和超限请求体", async () => {
		const { env, get } = fixture();
		for (const [contentType, body] of [
			["text/plain", '{"kind":"mail"}'], ["application/json", "{"],
			["application/json", '{"kind":"run"}'], ["application/json", '{"kind":"toString"}'],
			["application/json", "null"], ["application/json", " ".repeat(4097)],
		]) {
			const response = await handleConsole(req("/api/test", { method: "POST", headers: {
				Origin: origin, "Content-Type": contentType!,
			}, body: body! }), env, authenticated);
			expect(response.status).toBe(400);
		}
		expect(get).not.toHaveBeenCalled();
	});

	it("日志详情 id 不能用来读取其它 KV 键", async () => {
		const { env, get } = fixture();
		for (const path of ["/api/runs/let-monitor-state-v1", "/api/runs/console-run:secret", "/api/runs/invalid"]) {
			const response = await handleConsole(req(path), env, authenticated);
			expect(response.status).toBe(404);
		}
		expect(get).not.toHaveBeenCalled();
	});
});
