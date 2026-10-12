import { describe, expect, it, vi } from "vitest";
import { buildConfig, ConsoleTestError, handleCron, runConsoleTest, type RuntimeEnv } from "../src/runtime";
import { createRedactor, getRunPage, listRuns, LOG_RETENTION_DAYS, RUN_PREFIX, RunLog, type RunSummary } from "../src/run-store";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const KEY = "notify-secret-value";
const PASS = "smtp-password-value";
const quiet = () => {};
const verdict = JSON.stringify([{ i: 0, tags: ["vps"], prices: [{ amount: 5, currency: "USD", period: "month" }], zh: "测试 VPS 摘要" }]);
const rss = `<rss><channel>
<item><title>Latest VPS</title><link>https://example.invalid/latest</link><pubDate>Sun, 11 Oct 2026 11:00:00 GMT</pubDate><description>Latest VPS with 2GB RAM</description></item>
<item><title>Earlier VPS</title><link>https://example.invalid/earlier</link><pubDate>Sun, 11 Oct 2026 10:00:00 GMT</pubDate><description>Earlier VPS with 1GB RAM</description></item>
</channel></rss>`;

function memoryKv() {
	const entries = new Map<string, { value: string; metadata: unknown; options: KVNamespacePutOptions }>();
	const get = vi.fn().mockImplementation(async (key: string) => entries.get(key)?.value ?? null);
	const put = vi.fn().mockImplementation(async (key: string, value: string, options: KVNamespacePutOptions = {}) => {
		entries.set(key, { value, metadata: options.metadata, options });
	});
	const list = vi.fn().mockImplementation(async (options: KVNamespaceListOptions = {}) => {
		const keys = [...entries.keys()].filter((key) => key.startsWith(options.prefix ?? "")).sort();
		const start = Number(options.cursor ?? 0);
		const end = Math.min(keys.length, start + (options.limit ?? 1000));
		const page = keys.slice(start, end).map((name) => ({ name, metadata: entries.get(name)?.metadata }));
		return end < keys.length ? { keys: page, list_complete: false, cursor: String(end), cacheStatus: null } : { keys: page, list_complete: true, cacheStatus: null };
	});
	const state: KVNamespace = { get, put, list, delete: vi.fn(), getWithMetadata: vi.fn() };
	return { state, entries, get, put, list };
}

function env(state: KVNamespace, overrides: Partial<RuntimeEnv> & { SMTP_PASS?: string; PC_KEY?: string } = {}): RuntimeEnv {
	return {
		STATE: state,
		AI: { run: vi.fn() },
		AI_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8",
		FEED_URL: "https://lowendtalk.com/categories/offers/feed.rss",
		LOOKBACK_DAYS: "7",
		MAX_POSTS: "60",
		CLASSIFY_BATCH_SIZE: "1",
		REQUIRE_SERVER_TAG: "true",
		INTERVAL_MINUTES: "60",
		NOTIFY_URL: "https://notify.portcloud.online",
		NOTIFY_TIMEOUT: "60",
		SMTP_HOST: "smtp.qq.com",
		SMTP_PORT: "465",
		NOTIFY_KEY: KEY,
		NOTIFY_TO: "reader@example.invalid",
		...overrides,
	};
}

const feedFetch: typeof fetch = async () => new Response(rss);

describe("notification configuration", () => {
	it("预设忽略无效渠道类型和缺省目标，但必须有 Key", () => {
		const kv = memoryKv();
		const configured = env(kv.state, { NOTIFY_USE_PRESET: "true", NOTIFY_TYPE: "invalid", NOTIFY_TO: "" });
		expect(buildConfig(configured).notifyUsePreset).toBe(true);
		expect(() => buildConfig({ ...configured, NOTIFY_KEY: "" })).toThrow(/NOTIFY_KEY/);
	});

	it("普通模式拒绝未知类型，预设开关拒绝无效布尔值", () => {
		const kv = memoryKv();
		expect(() => buildConfig(env(kv.state, { NOTIFY_TYPE: "invalid" }))).toThrow(/NOTIFY_TYPE/);
		expect(() => buildConfig(env(kv.state, { NOTIFY_USE_PRESET: "invalid" }))).toThrow(/NOTIFY_USE_PRESET/);
	});
});

describe("run store", () => {
	it("persists once with 30-day TTL, bounded metadata, redacted/truncated logs and offset pages", async () => {
		const kv = memoryKv();
		const output = vi.fn();
		const run = new RunLog("preview", '用户"\\'.repeat(1000), createRedactor([KEY]), () => NOW, output);
		for (let i = 0; i < 305; i++) run.log(`entry ${i}: ${KEY} ${"x".repeat(2500)}`);
		await run.save(kv.state, "success", `${KEY} ${"长摘要\n\"".repeat(2000)}`);
		expect(kv.put).toHaveBeenCalledTimes(1);
		const saved = kv.entries.get(RUN_PREFIX + run.id);
		expect(saved?.options.expirationTtl).toBe(LOG_RETENTION_DAYS * 86400);
		expect(new TextEncoder().encode(JSON.stringify(saved?.metadata)).byteLength).toBeLessThanOrEqual(1024);
		expect(saved?.value).not.toContain(KEY);
		expect(output).toHaveBeenCalledTimes(305);
		expect(output.mock.calls[0]?.[0]).toContain("[REDACTED]");
		const detail = await getRunPage(kv.state, run.id, 15, 20);
		expect(detail?.total).toBe(300);
		expect(detail?.dropped).toBe(5);
		expect(detail?.items).toHaveLength(20);
		expect(detail?.items.at(-1)?.message).toContain("entry 304");
		expect(detail?.items[0]?.message.length).toBeLessThanOrEqual(2000);
		expect(detail?.items[0]?.message).toContain("[truncated]");
		expect(await getRunPage(kv.state, "missing", 1, 20)).toBeNull();
	});

	it("lists newest first using metadata only and follows cursors", async () => {
		const kv = memoryKv();
		const ids: string[] = [];
		for (let i = 0; i < 3; i++) {
			const run = new RunLog("feed", "reader@example.invalid", (message) => message, () => NOW + i, quiet);
			ids.push(run.id);
			await run.save(kv.state, "success", `run ${i}`);
		}
		const first = await listRuns(kv.state, undefined, 2);
		expect(first.items.map((run) => run.id)).toEqual([ids[2], ids[1]]);
		expect(first.nextCursor).toBe("2");
		const second = await listRuns(kv.state, first.nextCursor ?? undefined, 2);
		expect(second.items.map((run) => run.id)).toEqual([ids[0]]);
		expect(second.nextCursor).toBeNull();
		expect(kv.get).not.toHaveBeenCalled();
		await listRuns(kv.state, undefined, 1000);
		expect(kv.list.mock.calls.at(-1)?.[0].limit).toBe(100);
		expect(await getRunPage(kv.state, ids[0] ?? "", 1, 1000)).toMatchObject({ pageSize: 100 });
	});

	it("retains a cursor on an empty incomplete KV page", async () => {
		const kv = memoryKv();
		kv.list.mockResolvedValueOnce({ keys: [], list_complete: false, cursor: "tombstone-cursor", cacheStatus: null });
		expect(await listRuns(kv.state, undefined, 20)).toEqual({ items: [], nextCursor: "tombstone-cursor" });
	});

	it("redacts encoded credentials, JSON escapes, headers and URL credentials", () => {
		const redact = createRedactor(["secret /+", 'pass"word']);
		const safe = redact('secret /+ secret%20%2F%2B pass\\"word Authorization: Bearer hidden-token https://user:hidden-pass@example.invalid/?token=hidden-query');
		for (const secret of ["secret /+", "secret%20%2F%2B", 'pass\\"word', "hidden-token", "hidden-pass", "hidden-query"]) expect(safe).not.toContain(secret);
		expect(safe).toContain("[REDACTED]");
		expect(createRedactor([KEY])(`clipped upstream error: ${KEY.slice(0, 12)}`)).toBe("clipped upstream error: [REDACTED]");
	});
});

describe("console tests", () => {
	it("previews only the latest post without channel prerequisites, state reads/writes or email", async () => {
		const kv = memoryKv();
		const loadState = vi.fn();
		const saveState = vi.fn();
		const sendMail = vi.fn();
		const aiChat = vi.fn(async (_system: string, _user: string) => verdict);
		const result = await runConsoleTest(env(kv.state, { NOTIFY_KEY: "", NOTIFY_TO: "" }), "preview", "reader@example.invalid", {
			fetchImpl: feedFetch, nowMs: () => NOW, log: quiet, loadState, saveState, sendMail, aiChat,
		});
		expect(aiChat).toHaveBeenCalledTimes(1);
		expect(aiChat.mock.calls[0]?.[1]).toContain("Latest VPS");
		expect(aiChat.mock.calls[0]?.[1]).not.toContain("Earlier VPS");
		expect(result.result.html).toContain("测试 VPS 摘要");
		expect(result.result.message).toContain("不改状态、不发信");
		expect(loadState).not.toHaveBeenCalled();
		expect(saveState).not.toHaveBeenCalled();
		expect(sendMail).not.toHaveBeenCalled();
		expect(kv.get).not.toHaveBeenCalled();
		expect(kv.put).toHaveBeenCalledTimes(1);
		expect(kv.put.mock.calls[0]?.[0]).toBe(RUN_PREFIX + result.runId);
		expect(await getRunPage(kv.state, result.runId, 1, 20)).toMatchObject({ run: { kind: "preview", actor: "reader@example.invalid", status: "success" } });
	});

	it("returns feed counts and keeps concurrent invocation logs isolated", async () => {
		const kv = memoryKv();
		const [a, b] = await Promise.all([
			runConsoleTest(env(kv.state), "feed", "a@example.invalid", { fetchImpl: async () => new Response(rss.replaceAll("Latest VPS", "Request A title")), nowMs: () => NOW, log: quiet }),
			runConsoleTest(env(kv.state), "feed", "b@example.invalid", { fetchImpl: async () => new Response(rss.replaceAll("Latest VPS", "Request B title")), nowMs: () => NOW, log: quiet }),
		]);
		expect(a.runId).not.toBe(b.runId);
		expect(a.result.message).toContain("2 条");
		expect(a.result.message).toContain("Request A title");
		expect(kv.entries.get(RUN_PREFIX + a.runId)?.value).not.toContain("Request B title");
		expect(kv.entries.get(RUN_PREFIX + b.runId)?.value).not.toContain("Request A title");
	});

	it("persists fetch failures and returns a redacted runId error without sending alerts", async () => {
		const kv = memoryKv();
		const sendMail = vi.fn();
		const output = vi.fn();
		const error = await runConsoleTest(env(kv.state, { SMTP_PASS: PASS }), "feed", "reader@example.invalid", {
			fetchImpl: async () => { throw new Error(`${KEY} ${PASS} Bearer unknown-token`); }, sleep: async () => {}, nowMs: () => NOW, log: output, sendMail,
		}).catch((exc: unknown) => exc);
		expect(error).toBeInstanceOf(ConsoleTestError);
		if (!(error instanceof ConsoleTestError)) throw error;
		expect(error.runId).toMatch(/^\d{13}-[0-9a-f-]{36}$/);
		for (const value of [error.message, kv.entries.get(RUN_PREFIX + error.runId)?.value ?? "", JSON.stringify(output.mock.calls)]) {
			expect(value).not.toContain(KEY);
			expect(value).not.toContain(PASS);
			expect(value).not.toContain("unknown-token");
		}
		expect(sendMail).not.toHaveBeenCalled();
		expect(await getRunPage(kv.state, error.runId, 1, 20)).toMatchObject({ run: { status: "failed" } });
	});

	it("captures binding AI retry logs and completion", async () => {
		const kv = memoryKv();
		const workerEnv = env(kv.state);
		const aiRun = vi.fn().mockRejectedValueOnce(new Error(KEY)).mockResolvedValue({ response: verdict });
		workerEnv.AI = { run: aiRun };
		const result = await runConsoleTest(workerEnv, "preview", "reader@example.invalid", { fetchImpl: feedFetch, sleep: async () => {}, nowMs: () => NOW, log: quiet });
		expect(aiRun).toHaveBeenCalledTimes(2);
		const detail = await getRunPage(kv.state, result.runId, 1, 20);
		expect(detail?.items.some((entry) => entry.message.includes("AI 调用失败 (1/3): [REDACTED]"))).toBe(true);
		expect(detail?.items.at(-1)?.message).toContain("不发信");
	});

	it("uses configured Notify mail with delivery logs and never updates dedup", async () => {
		const kv = memoryKv();
		const fetchImpl: typeof fetch = vi.fn(async (url: RequestInfo | URL) => String(url).endsWith("/api/v1/send")
			? Response.json({ log_id: 7 }, { status: 201 })
			: Response.json({ log_id: 7, status: "success", failure_reason: null }));
		const saveState = vi.fn();
		const result = await runConsoleTest(env(kv.state), "mail", "reader@example.invalid", { fetchImpl, sleep: async () => {}, nowMs: () => NOW, log: quiet, saveState });
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(result.result.message).toContain("测试邮件已");
		expect(saveState).not.toHaveBeenCalled();
		expect(kv.put).toHaveBeenCalledTimes(1);
		expect(kv.put.mock.calls[0]?.[0]).toBe(RUN_PREFIX + result.runId);
		expect((await getRunPage(kv.state, result.runId, 1, 20))?.items.some((entry) => entry.message.includes("Portcloud"))).toBe(true);
	});

	it("预设受理拒绝记录失败，不保存去重状态或回退重发", async () => {
		const kv = memoryKv();
		const fetchImpl = vi.fn<typeof fetch>(async () =>
			Response.json({ error: { code: "NO_PRESET", message: "未配置发送预设" } }, { status: 400 }));
		const saveState = vi.fn();
		const error = await runConsoleTest(
			env(kv.state, { NOTIFY_USE_PRESET: "true", NOTIFY_TYPE: "invalid", NOTIFY_TO: "" }),
			"mail", "reader@example.invalid", { fetchImpl, log: quiet, nowMs: () => NOW, saveState },
		).catch((exc: unknown) => exc);
		expect(error).toBeInstanceOf(ConsoleTestError);
		if (!(error instanceof ConsoleTestError)) throw error;
		expect(error.message).toContain("NO_PRESET");
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(saveState).not.toHaveBeenCalled();
		expect(await getRunPage(kv.state, error.runId, 1, 20)).toMatchObject({ run: { status: "failed" } });
	});

	it("surfaces persistence failure after test delivery without resending or claiming mail failure", async () => {
		const kv = memoryKv();
		kv.put.mockRejectedValue(new Error(`KV unavailable ${KEY}`));
		const sendMail = vi.fn(async () => {});
		const error = await runConsoleTest(env(kv.state), "mail", "reader@example.invalid", { sendMail, nowMs: () => NOW, log: quiet }).catch((exc: unknown) => exc);
		expect(error).toBeInstanceOf(ConsoleTestError);
		if (!(error instanceof ConsoleTestError)) throw error;
		expect(error.message).toContain("测试邮件已");
		expect(error.message).toContain("运行日志保存失败");
		expect(error.message).not.toContain(KEY);
		expect(sendMail).toHaveBeenCalledTimes(1);
		expect(kv.put).toHaveBeenCalledTimes(1);
	});

	it("retains the task failure when persistence also fails", async () => {
		const kv = memoryKv();
		kv.put.mockRejectedValue(new Error(`storage problem ${KEY}`));
		const error = await runConsoleTest(env(kv.state), "mail", "reader@example.invalid", { sendMail: async () => { throw new Error(`original mail problem ${KEY}`); }, nowMs: () => NOW, log: quiet }).catch((exc: unknown) => exc);
		expect(error).toBeInstanceOf(ConsoleTestError);
		if (!(error instanceof ConsoleTestError)) throw error;
		expect(error.message).toContain("original mail problem");
		expect(error.message).toContain("storage problem");
		expect(error.message).not.toContain(KEY);
	});
});

describe("cron persistence", () => {
	it("persists pipeline completion and keeps existing sent/lastRun semantics", async () => {
		const kv = memoryKv();
		const saveState = vi.fn(async () => {});
		const sendMail = vi.fn(async () => {});
		await handleCron(env(kv.state), "0 * * * *", { loadState: async () => ({ sent: [] }), saveState, sendMail, aiChat: async () => verdict, fetchImpl: feedFetch, nowMs: () => NOW, log: quiet }, NOW - 1000);
		expect(sendMail).toHaveBeenCalledTimes(1);
		expect(saveState).toHaveBeenCalledWith({ sent: ["https://example.invalid/latest", "https://example.invalid/earlier"], lastRun: new Date(NOW - 1000).toISOString() });
		const runs = await listRuns(kv.state, undefined, 20);
		expect(runs.items).toHaveLength(1);
		expect(runs.items[0]).toMatchObject({ kind: "cron", actor: "cron", status: "success", startedAt: new Date(NOW).toISOString(), finishedAt: new Date(NOW).toISOString() });
		expect(runs.items[0]?.message).toContain("已推送");
	});

	it("does not send an alert for persistence failure after delivery", async () => {
		const kv = memoryKv();
		kv.put.mockRejectedValue(new Error("log storage unavailable"));
		const sendMail = vi.fn(async () => {});
		const saveState = vi.fn(async () => {});
		const promise = handleCron(env(kv.state), "0 * * * *", { loadState: async () => ({ sent: [] }), saveState, sendMail, aiChat: async () => verdict, fetchImpl: feedFetch, nowMs: () => NOW, log: quiet });
		await expect(promise).rejects.toThrow("运行日志保存失败");
		expect(sendMail).toHaveBeenCalledTimes(1);
		expect(saveState).toHaveBeenCalledTimes(1);
		expect(kv.put).toHaveBeenCalledTimes(1);
	});

	it("alerts on the original task failure, persists failure and rethrows the original", async () => {
		const kv = memoryKv();
		const original = new Error(`AI failed ${KEY}`);
		const sendMail = vi.fn(async (_subject: string, _html: string, _text: string) => {});
		const saveState = vi.fn();
		await expect(handleCron(env(kv.state), "0 * * * *", { loadState: async () => ({ sent: [] }), saveState, sendMail, aiChat: async () => { throw original; }, fetchImpl: feedFetch, nowMs: () => NOW, log: quiet })).rejects.toBe(original);
		expect(sendMail).toHaveBeenCalledTimes(1);
		expect(sendMail.mock.calls[0]?.[0]).toContain("监控运行失败");
		expect(JSON.stringify(sendMail.mock.calls)).not.toContain(KEY);
		expect(saveState).not.toHaveBeenCalled();
		const summary = (await listRuns(kv.state, undefined, 20)).items[0] as RunSummary;
		expect(summary.status).toBe("failed");
		expect(kv.entries.get(RUN_PREFIX + summary.id)?.value).not.toContain(KEY);
	});

	it("does not mask the original cron failure if alert and storage both fail", async () => {
		const kv = memoryKv();
		kv.put.mockRejectedValue(new Error("storage failed"));
		const original = new Error("original AI failure");
		const output = vi.fn();
		await expect(handleCron(env(kv.state), "0 * * * *", { loadState: async () => ({ sent: [] }), sendMail: async () => { throw new Error("alert failed"); }, aiChat: async () => { throw original; }, fetchImpl: feedFetch, nowMs: () => NOW, log: output })).rejects.toBe(original);
		expect(JSON.stringify(output.mock.calls)).toContain("告警邮件也发不出去");
		expect(JSON.stringify(output.mock.calls)).toContain("运行日志保存失败");
		expect(kv.put).toHaveBeenCalledTimes(1);
	});
});
