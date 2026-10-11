// 卸载：删除 Worker 与它绑定的 KV namespace（整服务一起删，不保留半个）。
//
// 用法（在仓库根目录执行）：
//   CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy \
//     node scripts/teardown.mjs --confirm=delete-let-monitor [--config=wrangler.jsonc]
//
// 安全设计：
//   · --confirm 必须是固定确认串 CONFIRM_PHRASE，防止误触发。
//   · 只删「该 Worker 的绑定里真实引用」的 KV，绝不按名字猜。
//   · 删除前检查该 KV 是否还被别的 Worker 引用；被引用则跳过（避免误删共用资源）。
//   · Worker 已不存在时只清理它名下的 <worker>-state。

import { readFileSync } from "node:fs";

/** 固定确认串：必须原样传入才会执行删除。 */
export const CONFIRM_PHRASE = "delete-let-monitor";

const args = process.argv.slice(2);
const confirm = args.find((a) => a.startsWith("--confirm="))?.slice("--confirm=".length) ?? "";
const configPath = args.find((a) => a.startsWith("--config="))?.slice("--config=".length) ?? "wrangler.jsonc";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!accountId) {
	console.error("错误：需要 CLOUDFLARE_ACCOUNT_ID 环境变量。");
	process.exit(1);
}
if (!token) {
	console.error("错误：需要 CLOUDFLARE_API_TOKEN 环境变量。");
	process.exit(1);
}

if (confirm !== CONFIRM_PHRASE) {
	console.error(`::error::确认串不匹配。要执行删除，请传入 --confirm=${CONFIRM_PHRASE}`);
	process.exit(1);
}

const workerName = (() => {
	const text = readFileSync(configPath, "utf8");
	const m = text.match(/"name"\s*:\s*"([^"]+)"/);
	if (!m) {
		console.error(`错误：在 ${configPath} 里找不到 name`);
		process.exit(1);
	}
	return m[1];
})();

console.log(`确认串正确，目标 Worker：${workerName}`);

const api = async (path, method = "GET") => {
	const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		method,
		headers: { Authorization: `Bearer ${token}` },
	});
	const body = await r.json().catch(() => null);
	if (!r.ok || body === null || body.success === false) {
		const msg = body?.errors?.[0]?.message ?? `HTTP ${r.status}`;
		const err = new Error(msg);
		err.status = r.status;
		throw err;
	}
	return body.result;
};

/** 取某个 Worker 脚本的 KV 绑定：[{ name, namespace_id }]；脚本不存在返回 null。 */
const kvBindings = async (script) => {
	try {
		const settings = await api(`/accounts/${accountId}/workers/scripts/${script}/settings`);
		return (settings.bindings ?? []).filter((b) => b.type === "kv_namespace");
	} catch (exc) {
		if (exc.status === 404) return null;
		throw exc;
	}
};

console.log("--- 读取该 Worker 的 KV 绑定 ---");
const bindings = await kvBindings(workerName);
if (bindings === null) {
	console.log(`Worker ${workerName} 不存在。`);
} else if (bindings.length === 0) {
	console.log("该 Worker 没有 KV 绑定。");
} else {
	for (const b of bindings) console.log(`  binding=${b.name} namespace=${b.namespace_id}`);
}

const namespaces = await api(`/accounts/${accountId}/storage/kv/namespaces`);
const titleOf = new Map(namespaces.map((n) => [n.id, n.title]));
const candidateIds = new Set((bindings ?? []).map((b) => b.namespace_id));

// 这些 namespace 是否还被其它 Worker 引用。
const referencedByOthers = new Map();
if (candidateIds.size > 0) {
	const scripts = await api(`/accounts/${accountId}/workers/scripts`);
	for (const s of scripts) {
		if (s.id === workerName) continue;
		const other = await kvBindings(s.id);
		if (other === null) continue;
		for (const b of other) {
			if (candidateIds.has(b.namespace_id)) {
				referencedByOthers.set(b.namespace_id, [...(referencedByOthers.get(b.namespace_id) ?? []), s.id]);
			}
		}
	}
}

console.log("--- 删除 Worker（含 Cron 触发器）---");
if (bindings === null) {
	console.log(`Worker ${workerName} 已不存在，跳过。`);
} else {
	await api(`/accounts/${accountId}/workers/scripts/${workerName}?force=true`, "DELETE");
	console.log(`已删除 Worker：${workerName}`);
}

console.log("--- 删除 KV namespace ---");
const toDelete = [];
if (bindings === null) {
	// Worker 已不存在：只清理由它名字派生的 KV，避免误删共用资源。
	const derived = namespaces.find((n) => n.title === `${workerName}-state`);
	if (derived) toDelete.push(derived);
	else console.log(`未找到 ${workerName}-state，跳过。`);
} else {
	for (const b of bindings) {
		const others = referencedByOthers.get(b.namespace_id);
		if (others !== undefined && others.length > 0) {
			console.log(`::warning::跳过 ${titleOf.get(b.namespace_id) ?? b.namespace_id}：仍被其它 Worker 引用（${others.join(", ")}）`);
			continue;
		}
		const ns = namespaces.find((n) => n.id === b.namespace_id);
		if (ns === undefined) {
			console.log(`namespace ${b.namespace_id} 已不存在，跳过。`);
			continue;
		}
		toDelete.push(ns);
	}
}

for (const ns of toDelete) {
	console.log(`删除 KV namespace：${ns.title}（${ns.id}）`);
	await api(`/accounts/${accountId}/storage/kv/namespaces/${ns.id}`, "DELETE");
}

console.log("完成：Worker 与相关 KV 均已删除。");
