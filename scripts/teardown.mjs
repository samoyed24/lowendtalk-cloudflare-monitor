// 删除部署：Worker + 它真正绑定的 KV namespace。
//
// 用法（在仓库根目录执行）：
//   CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy \
//     node scripts/teardown.mjs --confirm=<Worker 名称> [--keep-kv]
//
// 安全设计（重要）：
//   · 只删「该 Worker 的绑定里真实引用」的 KV，绝不按名字猜。
//   · 删除前检查该 KV 是否还被别的 Worker 引用；被引用则跳过（避免误删共用资源）。
//   · --confirm 必须与配置里的 Worker 名称完全一致。
//   · Worker 已不存在时不删通用命名的 KV，只清理明确属于它的 <worker>-state。

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const keepKv = args.includes("--keep-kv");
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

const workerName = (() => {
	const text = readFileSync(configPath, "utf8");
	const m = text.match(/"name"\s*:\s*"([^"]+)"/);
	if (!m) {
		console.error(`错误：在 ${configPath} 里找不到 name`);
		process.exit(1);
	}
	return m[1];
})();

console.log(`配置中的 Worker 名称：${workerName}`);
if (confirm !== workerName) {
	console.error(`::error::确认字符串不匹配。要删除请传入 --confirm=${workerName}`);
	process.exit(1);
}

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

/** 取某个 Worker 脚本的 KV 绑定：[{ name, namespace_id }]。 */
const kvBindings = async (script) => {
	try {
		const settings = await api(`/accounts/${accountId}/workers/scripts/${script}/settings`);
		return (settings.bindings ?? []).filter((b) => b.type === "kv_namespace");
	} catch (exc) {
		if (exc.status === 404) return null; // 脚本不存在
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

// 找出这些 namespace 是否还被其它 Worker 引用。
const namespaces = await api(`/accounts/${accountId}/storage/kv/namespaces`);
const titleOf = new Map(namespaces.map((n) => [n.id, n.title]));
const candidateIds = new Set((bindings ?? []).map((b) => b.namespace_id));

const referencedByOthers = new Map(); // namespace_id -> [worker names]
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

if (keepKv) {
	console.log("已保留 KV namespace（--keep-kv）。");
	process.exit(0);
}

console.log("--- 处理 KV namespace ---");
const toDelete = [];
if (bindings === null) {
	// Worker 已不存在：只清理由它的名字派生的 KV，避免误删共用资源。
	const derived = `${workerName}-state`;
	const hit = namespaces.find((n) => n.title === derived);
	if (hit) toDelete.push(hit);
	else console.log(`未找到 ${derived}，跳过。`);
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

console.log("完成。");
