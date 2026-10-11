export function renderConsole(): { html: string; nonce: string } {
	const nonce = crypto.randomUUID();
	const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>LowEndTalk Monitor · Portcloud Notify</title>
<style nonce="${nonce}">
:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17243b;background:#f3f6fb;line-height:1.6;font-synthesis:none;--muted:#526078;--line:#dce3ef;--primary:#244ed8;--danger:#a12828}
*{box-sizing:border-box}body{margin:0}button,select{font:inherit}button,a,select{-webkit-tap-highlight-color:transparent}button{cursor:pointer;border:1px solid var(--line);border-radius:9px;background:#fff;color:#17243b;padding:.55rem .9rem;min-height:44px;font-weight:600}button:hover:not(:disabled){background:#edf2ff;border-color:#a5b8ec}button:disabled,select:disabled{cursor:wait;opacity:.55}button.primary{background:var(--primary);border-color:var(--primary);color:#fff}button.primary:hover:not(:disabled){background:#193eb6}button.danger{color:var(--danger);border-color:#e9b9b9;background:#fff8f8}a{color:#244ed8;text-underline-offset:3px}a:hover{color:#1637a1}:focus-visible{outline:3px solid #7994fa;outline-offset:3px}[hidden]{display:none!important}.shell{max-width:1120px;margin:0 auto;padding:28px 24px 40px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}.brand h1{font-size:1.65rem;line-height:1.25;letter-spacing:-.04em;margin:0 0 4px}.brand p{margin:0;font-size:.9rem;color:var(--muted)}.brand-tag{color:var(--primary);font-weight:700}.account{text-align:right;font-size:.85rem;min-width:0}.account p{margin:0 0 4px;overflow-wrap:anywhere}.account a{color:var(--muted)}.card{border:1px solid var(--line);border-radius:15px;background:#fff;box-shadow:0 3px 12px #1b2c4d04}.overview{padding:22px;margin-bottom:22px}.section-heading{display:flex;justify-content:space-between;align-items:center;gap:16px}.section-heading h2,.panel h2{font-size:1.15rem;margin:0}.eyebrow{font-size:.78rem;color:var(--primary);font-weight:700;letter-spacing:.04em;margin:0 0 4px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:20px 0 0}.metric{border-left:3px solid #dce6ff;padding-left:14px;min-width:0}.metric dt{font-size:.83rem;color:var(--muted)}.metric dd{margin:4px 0 0;overflow-wrap:anywhere;font-weight:650}.metric .number{font-size:1.6rem;line-height:1.35}.config-line{margin:18px 0 0;font-size:.85rem;color:var(--muted);overflow-wrap:anywhere}.status{font-size:.88rem;color:var(--muted);min-height:1.4em;margin:12px 0 0;overflow-wrap:anywhere}.status:empty{min-height:0;margin:0}.status.is-error{color:var(--danger);background:#fff3f3;padding:10px 12px;border-radius:8px}.auth-help{margin:8px 0 0;font-size:.88rem}.tabs{display:flex;gap:6px;border-bottom:1px solid var(--line);margin-bottom:20px}.tabs button{border:0;background:transparent;border-radius:8px 8px 0 0;padding:12px 18px;color:var(--muted);border-bottom:3px solid transparent}.tabs button[aria-selected="true"]{color:var(--primary);background:#e9efff;border-bottom-color:var(--primary)}.panel{padding:22px}.description{color:var(--muted);font-size:.9rem;margin:6px 0 0}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:20px 0 12px;font-size:.88rem}.page-size{display:flex;gap:8px;align-items:center}.page-size select{border:1px solid var(--line);border-radius:8px;background:#fff;color:#17243b;padding:7px 28px 7px 10px;min-height:40px}.empty{padding:36px 16px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:10px;margin:16px 0}.records,.runs,.messages{list-style:none;padding:0;margin:0}.record{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #edf0f6}.record-index{font-size:.8rem;color:var(--muted);min-width:32px;padding-top:3px}.record-url{overflow-wrap:anywhere;min-width:0;font-size:.92rem}.record-note{display:block;color:var(--muted);font-size:.8rem;margin-top:3px}.pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:18px}.pagination p{margin:0;font-size:.85rem;color:var(--muted)}.page-actions{display:flex;gap:8px}.runs{display:grid;gap:10px}.run-button{display:block;text-align:left;width:100%;font-weight:400;padding:14px 16px}.run-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.run-kind{font-weight:700}.badge{display:inline-block;border-radius:999px;padding:2px 9px;font-size:.77rem;font-weight:650;background:#e9f7ef;color:#17633e}.badge.failed{background:#fdeaea;color:var(--danger)}.run-time{color:var(--muted);font-size:.82rem;margin-left:auto}.run-message{display:block;overflow-wrap:anywhere;font-size:.92rem;margin:7px 0 4px}.run-actor{display:block;font-size:.8rem;color:var(--muted);overflow-wrap:anywhere}.detail-header{margin:16px 0}.detail-header h2{margin-bottom:4px}.run-id{color:var(--muted);font: .8rem ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;margin:0}.run-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px;background:#f7f9fd;border-radius:10px;padding:16px;margin:16px 0}.run-meta div{min-width:0}.run-meta dt{font-size:.8rem;color:var(--muted)}.run-meta dd{margin:2px 0 0;font-size:.9rem;overflow-wrap:anywhere}.run-meta .wide{grid-column:1/-1}.message{border-bottom:1px solid #edf0f6;padding:12px 0}.message time{font-size:.78rem;color:var(--muted)}.message pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.85rem;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0 0}.test-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:20px}.test-card{border:1px solid var(--line);border-radius:12px;padding:18px;display:flex;flex-direction:column;align-items:flex-start}.test-card h3{font-size:1rem;margin:0 0 8px}.test-card p{font-size:.86rem;color:var(--muted);margin:0 0 16px;flex:1}.test-card button{width:100%}.test-card.mail{border-color:#e9caca}.test-note{font-size:.84rem;color:var(--muted);margin:16px 0 0}.test-result{margin-top:20px;padding:16px;border-radius:10px;border:1px solid var(--line);background:#f7f9fd}.test-result.success{background:#f1faf5;border-color:#bfdfcc}.test-result.error{background:#fff4f4;border-color:#e9b9b9}.test-result h3{font-size:1rem;margin:0 0 8px}.test-result p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.9rem}.test-result .run-id{margin-top:10px}.test-result button{margin-top:12px}.preview{margin-top:22px}.preview h3{font-size:1rem;margin:0 0 4px}.preview p{font-size:.84rem;color:var(--muted);margin:0 0 12px}.preview iframe{display:block;width:100%;height:480px;border:1px solid var(--line);border-radius:10px;background:#fff}.footer{margin-top:22px;color:var(--muted);font-size:.8rem;text-align:center}.noscript{padding:16px;border:1px solid #e9b9b9;border-radius:10px;background:#fff4f4;margin-bottom:20px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:800px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.test-grid{grid-template-columns:1fr}.test-card{padding:16px}.test-card p{margin-bottom:12px}.test-card button{width:auto}.run-time{width:100%;margin-left:0}.shell{padding:20px 16px 30px}}
@media(max-width:480px){.topbar{align-items:flex-start;flex-direction:column;gap:12px}.account{text-align:left}.brand h1{font-size:1.4rem}.panel,.overview{padding:17px}.section-heading{align-items:flex-start}.metrics{gap:16px 10px}.metric{padding-left:10px}.metric dd{font-size:.88rem}.metric .number{font-size:1.4rem}.tabs{gap:0}.tabs button{flex:1;padding:11px 8px;font-size:.9rem}.toolbar{gap:10px}.run-meta{grid-template-columns:1fr}.pagination{align-items:flex-start}.pagination p{width:100%}.page-actions{width:100%}.page-actions button{flex:1}.preview iframe{height:400px}}
</style>
</head>
<body>
<div class="shell">
<header class="topbar">
<div class="brand"><h1>LowEndTalk Monitor</h1><p>低价信息监控 <span aria-hidden="true">/</span> <span class="brand-tag">Portcloud Notify</span></p></div>
<div class="account"><p id="account-email">正在读取登录账号…</p><a href="/cdn-cgi/access/logout">退出 Cloudflare Access</a></div>
</header>
<noscript><div class="noscript">控制台需要 JavaScript 才能读取数据和执行测试。请启用 JavaScript 后重新打开本页。</div></noscript>
<main>
<section class="card overview" aria-labelledby="overview-heading">
<div class="section-heading"><div><p class="eyebrow">监控概览</p><h2 id="overview-heading">当前运行状态</h2></div><button id="refresh" type="button">刷新数据</button></div>
<dl class="metrics">
<div class="metric"><dt>已处理 URL</dt><dd class="number" id="overview-processed">—</dd></div>
<div class="metric"><dt>上次状态更新</dt><dd id="overview-last-run">—</dd></div>
<div class="metric"><dt>推送间隔</dt><dd id="overview-interval">—</dd></div>
<div class="metric"><dt>发信通道</dt><dd id="overview-channels">—</dd></div>
</dl>
<p class="config-line">Workers AI 模型：<span id="overview-model">—</span> · 日志保留 <span id="overview-retention">30</span> 天</p>
<p id="overview-status" class="status" role="status" aria-live="polite"></p>
<p id="auth-help" class="auth-help" hidden><a href="/">重新进入控制台并验证账号</a></p>
</section>
<div class="tabs" role="tablist" aria-label="控制台功能">
<button id="tab-records" type="button" role="tab" aria-selected="true" aria-controls="panel-records" tabindex="0" data-tab="records">已处理记录</button>
<button id="tab-runs" type="button" role="tab" aria-selected="false" aria-controls="panel-runs" tabindex="-1" data-tab="runs">运行日志</button>
<button id="tab-tests" type="button" role="tab" aria-selected="false" aria-controls="panel-tests" tabindex="-1" data-tab="tests">功能测试</button>
</div>
<section id="panel-records" class="card panel" role="tabpanel" aria-labelledby="tab-records">
<h2>已处理 URL</h2><p class="description">按最近处理顺序展示。已处理不等于已发送邮件；不符合推送条件的帖子也会记入去重状态。</p>
<div class="toolbar"><span id="records-count">尚未读取记录</span><label class="page-size" for="records-size">每页<select id="records-size"><option value="20">20 条</option><option value="50">50 条</option><option value="100">100 条</option></select></label></div>
<p id="records-status" class="status" role="status" aria-live="polite"></p>
<p id="records-empty" class="empty" hidden>还没有已处理记录。定时任务运行后，可刷新查看。</p>
<ol id="records-list" class="records" aria-label="已处理 URL 列表"></ol>
<nav class="pagination" aria-label="已处理记录分页"><p id="records-page">第 1 页</p><div class="page-actions"><button id="records-prev" type="button" disabled>上一页</button><button id="records-next" type="button" disabled>下一页</button></div></nav>
</section>
<section id="panel-runs" class="card panel" role="tabpanel" aria-labelledby="tab-runs" hidden>
<div id="run-list-view">
<h2>运行日志</h2><p class="description">最近 30 天的定时任务与手动测试，最新运行在前。仅按页读取，点击某次运行查看日志详情。</p>
<div class="toolbar"><span>任务完成后保存日志；KV 同步可能稍有延迟。</span><label class="page-size" for="runs-size">每页<select id="runs-size"><option value="20">20 次</option><option value="50">50 次</option><option value="100">100 次</option></select></label></div>
<p id="runs-status" class="status" role="status" aria-live="polite"></p>
<p id="runs-empty" class="empty" hidden>暂时没有可见的运行日志。新完成的任务可能需要等待 KV 同步后再刷新。</p>
<ul id="runs-list" class="runs" aria-label="运行记录"></ul>
<nav class="pagination" aria-label="运行记录分页"><p id="runs-page">第 1 页</p><div class="page-actions"><button id="runs-prev" type="button" disabled>上一页</button><button id="runs-next" type="button" disabled>下一页</button></div></nav>
</div>
<div id="run-detail" hidden>
<button id="detail-back" type="button">返回运行列表</button>
<div class="detail-header"><h2 id="detail-heading" tabindex="-1">运行日志详情</h2><p id="detail-id" class="run-id"></p></div>
<dl class="run-meta">
<div><dt>任务类型</dt><dd id="detail-kind">—</dd></div><div><dt>执行结果</dt><dd id="detail-result">—</dd></div>
<div><dt>开始时间</dt><dd id="detail-start">—</dd></div><div><dt>完成时间</dt><dd id="detail-finish">—</dd></div>
<div class="wide"><dt>执行账号</dt><dd id="detail-actor">—</dd></div><div class="wide"><dt>运行摘要</dt><dd id="detail-summary">—</dd></div>
</dl>
<div class="toolbar"><span id="detail-count">尚未读取日志</span><label class="page-size" for="detail-size">每页<select id="detail-size"><option value="20">20 条</option><option value="50">50 条</option><option value="100">100 条</option></select></label></div>
<p id="detail-status" class="status" role="status" aria-live="polite"></p>
<p id="detail-empty" class="empty" hidden>本次运行没有保存日志消息。</p>
<ol id="detail-list" class="messages" aria-label="本次运行日志消息"></ol>
<nav class="pagination" aria-label="日志消息分页"><p id="detail-page">第 1 页</p><div class="page-actions"><button id="detail-prev" type="button" disabled>上一页</button><button id="detail-next" type="button" disabled>下一页</button></div></nav>
</div>
</section>
<section id="panel-tests" class="card panel" role="tabpanel" aria-labelledby="tab-tests" hidden>
<h2>功能测试</h2><p class="description">测试只会在点击按钮后执行。RSS 和 AI 预览不发送邮件；只有「发送测试邮件」会真实发信。</p>
<div class="test-grid">
<article class="test-card"><h3>RSS 抓取测试</h3><p>验证当前 RSS 源能否抓取与解析，不触发邮件推送。</p><button type="button" data-test="feed">测试 RSS</button></article>
<article class="test-card"><h3>AI 单篇预览</h3><p>选取一篇帖子进行 AI 处理并预览结果。不写入已处理记录、不发送邮件；运行日志仍会保存。</p><button type="button" class="primary" data-test="preview">生成单篇预览</button></article>
<article class="test-card mail"><h3>真实测试邮件</h3><p>通过当前配置的发信通道向已配置的收件地址发送真实测试邮件。点击后必须再次确认。</p><button type="button" class="danger" data-test="mail">发送测试邮件</button></article>
</div>
<p class="test-note">执行期间请保持页面连接，所有测试按钮将暂时禁用。请求不会自动重试；如连接中断，任务可能已执行，请先查看运行日志，避免重复发信。</p>
<div id="test-result" class="test-result" aria-live="polite" aria-atomic="true" hidden>
<h3 id="test-result-heading"></h3><p id="test-result-message"></p><p id="test-run-id" class="run-id" hidden></p><button id="test-view-run" type="button" hidden>查看此次运行日志</button>
</div>
<section id="preview-section" class="preview" aria-labelledby="preview-heading" hidden><h3 id="preview-heading">AI 生成内容预览</h3><p>内容显示在隔离的 iframe 中，不能执行脚本或操作控制台；外部资源不会加载。</p><iframe id="preview-frame" title="AI 单篇邮件预览（隔离内容）" sandbox="" referrerpolicy="no-referrer"></iframe></section>
</section>
</main>
<footer class="footer">Cloudflare Access 账号验证 · KV 数据可能存在短暂同步延迟，任务完成后可手动刷新 · 运行日志保留 30 天</footer>
</div>
<script nonce="${nonce}">
'use strict';
(function () {
  const byId = function (id) { return document.getElementById(id); };
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const testButtons = Array.from(document.querySelectorAll('[data-test]'));
  const state = {
    active: 'records', refreshBusy: false, testing: false, overviewRequest: 0, testRunId: null,
    records: { page: 1, pageSize: 20, total: 0, loaded: false, busy: false, request: 0 },
    runs: { cursor: null, nextCursor: null, stack: [], pageSize: 20, loaded: false, busy: false, request: 0, count: 0 },
    detail: { id: null, page: 1, pageSize: 20, total: 0, busy: false, request: 0 }
  };
  const kindNames = { cron: '定时任务', feed: 'RSS 测试', preview: 'AI 单篇预览', mail: '测试邮件' };

  class ApiError extends Error {
    constructor(message, runId, auth) {
      super(message);
      this.runId = typeof runId === 'string' ? runId : null;
      this.auth = Boolean(auth);
    }
  }
  const text = function (value) { return value === null || value === undefined ? '—' : String(value); };
  const setText = function (id, value) { byId(id).textContent = text(value); };
  const formatTime = function (value) {
    if (!value) return '尚未运行';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleString('zh-CN', { hour12: false });
  };
  const kindName = function (kind) { return Object.hasOwn(kindNames, kind) ? kindNames[kind] : text(kind); };
  function status(id, message, error) {
    const node = byId(id);
    node.textContent = message;
    node.classList.toggle('is-error', Boolean(error));
    node.setAttribute('role', error ? 'alert' : 'status');
    node.setAttribute('aria-live', error ? 'assertive' : 'polite');
  }
  function reportError(id, error) {
    status(id, error instanceof Error ? error.message : '请求失败，请稍后刷新。', true);
    if (error instanceof ApiError && error.auth) byId('auth-help').hidden = false;
  }
  async function api(path, options) {
    let response;
    try {
      response = await fetch(path, Object.assign({
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
      }, options));
    } catch {
      throw new ApiError('无法连接接口，可能是网络中断或登录会话已过期。请检查网络并重新进入控制台；测试不会自动重试。');
    }
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json') || contentType.includes('+json');
    let data = null;
    if (isJson) {
      try { data = await response.json(); }
      catch { throw new ApiError('接口返回了无法读取的 JSON，请稍后刷新。'); }
    }
    const object = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    if (response.status === 401 || response.status === 403) {
      const message = object && typeof object.error === 'string' ? object.error : '登录已过期，或当前账号没有访问权限。';
      throw new ApiError(message + ' 请检查 Cloudflare Access 授权并重新进入控制台。', object && object.runId, true);
    }
    if (response.redirected || contentType.includes('text/html')) {
      throw new ApiError('接口返回了登录页面，Cloudflare Access 会话可能已过期。请重新进入控制台并验证账号。', null, true);
    }
    if (!response.ok) {
      throw new ApiError(object && typeof object.error === 'string' ? object.error : '接口请求失败（HTTP ' + response.status + '）。', object && object.runId);
    }
    if (!object) throw new ApiError('接口未返回预期的 JSON 数据，请稍后刷新。');
    if (typeof object.error === 'string') throw new ApiError(object.error, object.runId);
    return object;
  }
  function query(path, values) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(function (entry) {
      if (entry[1] !== null && entry[1] !== undefined) params.set(entry[0], String(entry[1]));
    });
    return path + '?' + params.toString();
  }
  function refreshButton() {
    byId('refresh').disabled = state.refreshBusy || state.testing;
    setText('refresh', state.refreshBusy ? '正在刷新…' : '刷新数据');
  }
  async function loadOverview() {
    const request = ++state.overviewRequest;
    byId('overview-heading').closest('section').setAttribute('aria-busy', 'true');
    status('overview-status', '正在读取监控状态…');
    ['overview-processed', 'overview-last-run', 'overview-interval', 'overview-channels', 'overview-model'].forEach(function (id) { setText(id, '—'); });
    try {
      const data = await api('/api/overview');
      if (request !== state.overviewRequest) return;
      setText('account-email', data.email);
      setText('overview-processed', data.processed);
      setText('overview-last-run', formatTime(data.lastRun));
      setText('overview-interval', text(data.intervalMinutes) + ' 分钟');
      setText('overview-channels', Array.isArray(data.channels) && data.channels.length ? data.channels.join('、') : '未配置发信通道');
      setText('overview-model', data.aiModel);
      setText('overview-retention', data.logRetentionDays);
      status('overview-status', '已更新 · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '（当前浏览器时区）');
    } catch (error) {
      if (request !== state.overviewRequest) return;
      setText('account-email', '账号状态读取失败');
      reportError('overview-status', error);
    } finally {
      if (request === state.overviewRequest) byId('overview-heading').closest('section').setAttribute('aria-busy', 'false');
    }
  }
  function numberedPage(prefix, itemState) {
    const pages = Math.max(1, Math.ceil(itemState.total / itemState.pageSize));
    setText(prefix + '-page', '第 ' + itemState.page + ' / ' + pages + ' 页 · 共 ' + itemState.total + ' 条');
    byId(prefix + '-prev').disabled = itemState.busy || itemState.page <= 1;
    byId(prefix + '-next').disabled = itemState.busy || itemState.page * itemState.pageSize >= itemState.total;
    byId(prefix + '-size').disabled = itemState.busy;
  }
  async function loadRecords() {
    const records = state.records;
    const request = ++records.request;
    records.busy = true;
    records.loaded = false;
    records.total = 0;
    byId('panel-records').setAttribute('aria-busy', 'true');
    byId('records-list').replaceChildren();
    byId('records-empty').hidden = true;
    setText('records-count', '正在读取第 ' + records.page + ' 页…');
    status('records-status', '正在读取已处理记录…');
    numberedPage('records', records);
    try {
      const data = await api(query('/api/records', { page: records.page, pageSize: records.pageSize }));
      if (request !== records.request) return;
      if (!Array.isArray(data.items)) throw new ApiError('记录接口返回格式异常，请稍后刷新。');
      records.page = data.page;
      records.pageSize = data.pageSize;
      records.total = data.total;
      const fragment = document.createDocumentFragment();
      data.items.forEach(function (raw, index) {
        const item = document.createElement('li');
        item.className = 'record';
        const number = document.createElement('span');
        number.className = 'record-index';
        number.textContent = String((records.page - 1) * records.pageSize + index + 1);
        number.setAttribute('aria-hidden', 'true');
        const body = document.createElement('div');
        body.className = 'record-url';
        let url = null;
        if (typeof raw === 'string') {
          try {
            const parsed = new URL(raw);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') url = parsed;
          } catch { /* 非 URL 只作为文本显示。 */ }
        }
        const label = document.createElement(url ? 'a' : 'span');
        label.textContent = text(raw);
        if (url) {
          label.href = url.href;
          label.target = '_blank';
          label.rel = 'noopener noreferrer';
        }
        const note = document.createElement('span');
        note.className = 'record-note';
        note.textContent = url ? '已处理 · 不一定已发邮件 · 在新标签页打开' : '已处理 · 非 HTTP(S) 地址，不可打开';
        body.append(label, note);
        item.append(number, body);
        fragment.append(item);
      });
      byId('records-list').replaceChildren(fragment);
      byId('records-empty').hidden = data.items.length !== 0;
      records.loaded = true;
      setText('records-count', '共 ' + records.total + ' 个已处理 URL · 本页 ' + data.items.length + ' 条');
      status('records-status', '');
    } catch (error) {
      if (request !== records.request) return;
      setText('records-count', '记录读取失败');
      reportError('records-status', error);
    } finally {
      if (request === records.request) {
        records.busy = false;
        byId('panel-records').setAttribute('aria-busy', 'false');
        numberedPage('records', records);
      }
    }
  }
  function runsPaging() {
    const runs = state.runs;
    setText('runs-page', '第 ' + (runs.stack.length + 1) + ' 页 · 本页 ' + runs.count + ' 次运行');
    byId('runs-prev').disabled = runs.busy || runs.stack.length === 0;
    byId('runs-next').disabled = runs.busy || !runs.nextCursor;
    byId('runs-size').disabled = runs.busy;
  }
  async function loadRuns() {
    const runs = state.runs;
    const request = ++runs.request;
    runs.busy = true;
    runs.loaded = false;
    runs.count = 0;
    runs.nextCursor = null;
    byId('run-list-view').setAttribute('aria-busy', 'true');
    byId('runs-list').replaceChildren();
    byId('runs-empty').hidden = true;
    status('runs-status', '正在读取运行记录…');
    runsPaging();
    try {
      const data = await api(query('/api/runs', { cursor: runs.cursor, pageSize: runs.pageSize }));
      if (request !== runs.request) return;
      if (!Array.isArray(data.items)) throw new ApiError('运行记录接口返回格式异常，请稍后刷新。');
      const fragment = document.createDocumentFragment();
      data.items.forEach(function (run) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'run-button';
        button.dataset.runId = run.id;
        const line = document.createElement('span');
        line.className = 'run-line';
        const kind = document.createElement('span');
        kind.className = 'run-kind';
        kind.textContent = kindName(run.kind);
        const badge = document.createElement('span');
        badge.className = run.status === 'success' ? 'badge' : 'badge failed';
        badge.textContent = run.status === 'success' ? '成功' : '失败';
        const time = document.createElement('span');
        time.className = 'run-time';
        time.textContent = formatTime(run.startedAt);
        line.append(kind, badge, time);
        const message = document.createElement('span');
        message.className = 'run-message';
        message.textContent = text(run.message);
        const actor = document.createElement('span');
        actor.className = 'run-actor';
        actor.textContent = '执行账号：' + text(run.actor) + ' · 点击查看日志';
        button.append(line, message, actor);
        button.addEventListener('click', function () { openRun(run.id); });
        item.append(button);
        fragment.append(item);
      });
      byId('runs-list').replaceChildren(fragment);
      runs.count = data.items.length;
      runs.nextCursor = typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null;
      runs.loaded = true;
      byId('runs-empty').hidden = data.items.length !== 0;
      status('runs-status', '');
    } catch (error) {
      if (request !== runs.request) return;
      reportError('runs-status', error);
    } finally {
      if (request === runs.request) {
        runs.busy = false;
        byId('run-list-view').setAttribute('aria-busy', 'false');
        runsPaging();
      }
    }
  }
  function closeDetail() {
    const selected = state.detail.id;
    state.detail.request++;
    state.detail.id = null;
    state.detail.page = 1;
    state.detail.total = 0;
    state.detail.busy = false;
    byId('run-detail').hidden = true;
    byId('run-detail').setAttribute('aria-busy', 'false');
    byId('run-list-view').hidden = false;
    byId('detail-list').replaceChildren();
    setText('detail-id', '');
    status('detail-status', '');
    return selected;
  }
  function activateTab(name, load) {
    closeDetail();
    state.active = name;
    tabs.forEach(function (tab) {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      byId('panel-' + tab.dataset.tab).hidden = !selected;
    });
    if (load !== false) {
      if (name === 'records' && !state.records.loaded && !state.records.busy) void loadRecords();
      if (name === 'runs' && !state.runs.loaded && !state.runs.busy) void loadRuns();
    }
  }
  function openRun(id) {
    if (typeof id !== 'string' || !id) return;
    activateTab('runs', false);
    state.detail.id = id;
    state.detail.page = 1;
    state.detail.total = 0;
    byId('run-list-view').hidden = true;
    byId('run-detail').hidden = false;
    setText('detail-id', '运行 ID：' + id);
    ['detail-kind', 'detail-result', 'detail-start', 'detail-finish', 'detail-actor', 'detail-summary'].forEach(function (field) { setText(field, '—'); });
    byId('detail-heading').focus();
    void loadDetail();
  }
  async function loadDetail() {
    const detail = state.detail;
    const id = detail.id;
    if (!id) return;
    const request = ++detail.request;
    detail.busy = true;
    detail.total = 0;
    byId('run-detail').setAttribute('aria-busy', 'true');
    byId('detail-list').replaceChildren();
    byId('detail-empty').hidden = true;
    setText('detail-count', '正在读取日志…');
    status('detail-status', '正在读取本次运行日志…');
    numberedPage('detail', detail);
    try {
      const data = await api(query('/api/runs/' + encodeURIComponent(id), { page: detail.page, pageSize: detail.pageSize }));
      if (request !== detail.request || id !== detail.id) return;
      if (!data.run || data.run.id !== id || !Array.isArray(data.items)) throw new ApiError('日志详情接口返回格式异常，请稍后刷新。');
      const run = data.run;
      setText('detail-kind', kindName(run.kind));
      setText('detail-result', run.status === 'success' ? '成功' : '失败');
      setText('detail-start', formatTime(run.startedAt));
      setText('detail-finish', formatTime(run.finishedAt));
      setText('detail-actor', run.actor);
      setText('detail-summary', run.message);
      detail.page = data.page;
      detail.pageSize = data.pageSize;
      detail.total = data.total;
      const fragment = document.createDocumentFragment();
      data.items.forEach(function (entry) {
        const item = document.createElement('li');
        item.className = 'message';
        const time = document.createElement('time');
        time.textContent = formatTime(entry.at);
        if (typeof entry.at === 'string') time.dateTime = entry.at;
        const message = document.createElement('pre');
        message.textContent = text(entry.message);
        item.append(time, message);
        fragment.append(item);
      });
      byId('detail-list').replaceChildren(fragment);
      setText('detail-count', '共 ' + detail.total + ' 条日志 · 本页 ' + data.items.length + ' 条' + (data.dropped > 0 ? ' · 超出上限未保存 ' + data.dropped + ' 条' : ''));
      byId('detail-empty').hidden = data.items.length !== 0;
      status('detail-status', '');
    } catch (error) {
      if (request !== detail.request || id !== detail.id) return;
      setText('detail-count', '日志读取失败');
      reportError('detail-status', error);
    } finally {
      if (request === detail.request && id === detail.id) {
        detail.busy = false;
        byId('run-detail').setAttribute('aria-busy', 'false');
        numberedPage('detail', detail);
      }
    }
  }
  function resetRuns() {
    state.runs.request++;
    state.runs.cursor = null;
    state.runs.nextCursor = null;
    state.runs.stack = [];
    state.runs.loaded = false;
    state.runs.busy = false;
    state.runs.count = 0;
    byId('runs-list').replaceChildren();
    byId('runs-empty').hidden = true;
    byId('run-list-view').setAttribute('aria-busy', 'false');
    status('runs-status', '');
    runsPaging();
  }
  async function refresh() {
    if (state.refreshBusy || state.testing) return;
    state.refreshBusy = true;
    refreshButton();
    byId('auth-help').hidden = true;
    state.records.request++;
    state.records.page = 1;
    state.records.total = 0;
    state.records.loaded = false;
    state.records.busy = false;
    byId('records-list').replaceChildren();
    byId('records-empty').hidden = true;
    byId('panel-records').setAttribute('aria-busy', 'false');
    setText('records-count', '尚未读取记录');
    status('records-status', '');
    numberedPage('records', state.records);
    resetRuns();
    closeDetail();
    try {
      const work = [loadOverview()];
      if (state.active === 'records') work.push(loadRecords());
      if (state.active === 'runs') work.push(loadRuns());
      await Promise.all(work);
    } finally {
      state.refreshBusy = false;
      refreshButton();
    }
  }
  function showTestResult(heading, message, appearance, runId) {
    const result = byId('test-result');
    result.hidden = false;
    result.className = 'test-result' + (appearance ? ' ' + appearance : '');
    result.setAttribute('role', appearance === 'error' ? 'alert' : 'status');
    result.setAttribute('aria-live', appearance === 'error' ? 'assertive' : 'polite');
    setText('test-result-heading', heading);
    setText('test-result-message', message);
    state.testRunId = typeof runId === 'string' && runId ? runId : null;
    setText('test-run-id', state.testRunId ? '运行 ID：' + state.testRunId : '');
    byId('test-run-id').hidden = !state.testRunId;
    byId('test-view-run').hidden = !state.testRunId;
  }
  async function runTest(kind) {
    if (state.testing) return;
    if (kind === 'mail' && !window.confirm('确认发送真实测试邮件？\\n将通过当前配置的所有发信通道，向已配置的收件地址发送邮件。此操作可能消耗发信额度，且不会自动重试。')) return;
    state.testing = true;
    testButtons.forEach(function (button) { button.disabled = true; });
    refreshButton();
    byId('panel-tests').setAttribute('aria-busy', 'true');
    byId('preview-section').hidden = true;
    byId('preview-frame').removeAttribute('srcdoc');
    showTestResult(kindName(kind) + '正在执行…', '请保持页面连接并等待结果。请求不会自动重试。', '', null);
    try {
      const data = await api('/api/test', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: kind })
      });
      if (!data.result || typeof data.result.message !== 'string' || typeof data.runId !== 'string') throw new ApiError('测试响应格式异常。任务可能已执行，请先查看运行日志，不要立即重试。', data.runId);
      showTestResult(kindName(kind) + '完成', data.result.message, 'success', data.runId);
      if (kind === 'preview' && typeof data.result.html === 'string') {
        byId('preview-frame').srcdoc = data.result.html;
        byId('preview-section').hidden = false;
      }
    } catch (error) {
      showTestResult(kindName(kind) + '失败', error instanceof Error ? error.message : '测试失败，请先查看运行日志。', 'error', error instanceof ApiError ? error.runId : null);
      if (error instanceof ApiError && error.auth) byId('auth-help').hidden = false;
    } finally {
      state.testing = false;
      testButtons.forEach(function (button) { button.disabled = false; });
      byId('panel-tests').setAttribute('aria-busy', 'false');
      refreshButton();
      resetRuns();
      if (state.active === 'runs' && !state.detail.id) void loadRuns();
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { activateTab(tab.dataset.tab); });
    tab.addEventListener('keydown', function (event) {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        tabs[next].focus();
        activateTab(tabs[next].dataset.tab);
      }
    });
  });
  byId('refresh').addEventListener('click', function () { void refresh(); });
  byId('records-prev').addEventListener('click', function () {
    if (state.records.busy || state.records.page <= 1) return;
    state.records.page--;
    void loadRecords();
  });
  byId('records-next').addEventListener('click', function () {
    if (state.records.busy || state.records.page * state.records.pageSize >= state.records.total) return;
    state.records.page++;
    void loadRecords();
  });
  byId('records-size').addEventListener('change', function () {
    state.records.pageSize = Number(byId('records-size').value);
    state.records.page = 1;
    void loadRecords();
  });
  byId('runs-prev').addEventListener('click', function () {
    if (state.runs.busy || !state.runs.stack.length) return;
    state.runs.cursor = state.runs.stack.pop();
    void loadRuns();
  });
  byId('runs-next').addEventListener('click', function () {
    if (state.runs.busy || !state.runs.nextCursor) return;
    state.runs.stack.push(state.runs.cursor);
    state.runs.cursor = state.runs.nextCursor;
    void loadRuns();
  });
  byId('runs-size').addEventListener('change', function () {
    state.runs.pageSize = Number(byId('runs-size').value);
    resetRuns();
    void loadRuns();
  });
  byId('detail-back').addEventListener('click', function () {
    const id = closeDetail();
    const previous = Array.from(byId('runs-list').querySelectorAll('[data-run-id]')).find(function (button) { return button.dataset.runId === id; });
    if (previous) previous.focus(); else byId('tab-runs').focus();
    if (!state.runs.loaded && !state.runs.busy) void loadRuns();
  });
  byId('detail-prev').addEventListener('click', function () {
    if (state.detail.busy || state.detail.page <= 1) return;
    state.detail.page--;
    void loadDetail();
  });
  byId('detail-next').addEventListener('click', function () {
    if (state.detail.busy || state.detail.page * state.detail.pageSize >= state.detail.total) return;
    state.detail.page++;
    void loadDetail();
  });
  byId('detail-size').addEventListener('change', function () {
    state.detail.pageSize = Number(byId('detail-size').value);
    state.detail.page = 1;
    void loadDetail();
  });
  testButtons.forEach(function (button) {
    button.addEventListener('click', function () { void runTest(button.dataset.test); });
  });
  byId('test-view-run').addEventListener('click', function () {
    if (state.testRunId) openRun(state.testRunId);
  });
  void refresh();
})();
</script>
</body>
</html>`;
	return { html, nonce };
}
