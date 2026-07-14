// Host 스모크 공용 라이브러리 — UDT 프록시 + CDP 접속과 footgun 방지 헬퍼(단일 세션·비동기 프로브 패턴)
//
// ⚠️ 핵심 규칙(런북 §40-d·§25-b에서 확정된 교훈):
// 1. connectPanel은 세션 ID가 없으면 UDT `Plugin.load`를 호출하며, 이는 **패널 재부팅**이다.
//    진행 중인 패널 JS(내보내기 await, STT 등)를 죽이므로, 스모크 러너는 시작 시 딱 한 번만
//    접속하고 모든 체크를 같은 세션의 evalJs로 실행한다. 원샷 재접속 폴링 금지.
// 2. UXP 웹뷰는 복합 하위 셀렉터(querySelectorAll("#a .b span"))가 조용히 빈 배열을 줄 수 있다.
//    DOM 검증은 getElementById + children 순회로 한다.
// 3. 페이지에 주입하는 코드 문자열 안에서는 백슬래시 이스케이프를 쓰지 말 것
//    (셸 heredoc·중첩 템플릿을 거치며 소비된다). 개행은 String.fromCharCode(10).

const WS = globalThis.WebSocket;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectPanel({ session, distPath, reload = false } = {}) {
  const service = new WS("ws://127.0.0.1:14001");
  let requestSeq = 2000;
  const waiters = new Map();
  service.onmessage = (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (message.command === "reply" && waiters.has(message.requestId)) {
      waiters.get(message.requestId)(message);
      waiters.delete(message.requestId);
    }
  };
  await new Promise((resolve, reject) => {
    service.onopen = resolve;
    service.onerror = () => reject(new Error("UDT 서비스(ws://127.0.0.1:14001)에 접속하지 못했습니다. Premiere의 UXP Developer Tools 서비스가 켜져 있는지 확인하세요."));
  });
  await sleep(500);

  // 앱 클라이언트 clientId는 재접속 때마다 바뀌므로 App.info로 자동 감지한다.
  const clientReq = (clientId, message, timeout = 4000) => new Promise((resolve) => {
    requestSeq += 1;
    const requestId = requestSeq;
    waiters.set(requestId, resolve);
    service.send(JSON.stringify({ command: "proxy", clientId, requestId, message }));
    setTimeout(() => { if (waiters.has(requestId)) { waiters.delete(requestId); resolve({ __timeout: true }); } }, timeout);
  });
  let appClientId = null;
  for (const candidate of [1, 2, 3, 4, 5, 6]) {
    const reply = await clientReq(candidate, { command: "App", action: "info" });
    if (reply && reply.appId) { appClientId = candidate; break; }
  }
  if (appClientId === null) throw new Error("Premiere 앱 클라이언트를 찾지 못했습니다(Premiere 실행·UDT 연결 확인).");

  const proxyTo = (message, timeout = 20000) => new Promise((resolve, reject) => {
    requestSeq += 1;
    const requestId = requestSeq;
    waiters.set(requestId, resolve);
    service.send(JSON.stringify({ command: "proxy", clientId: appClientId, requestId, message }));
    setTimeout(() => { if (waiters.has(requestId)) { waiters.delete(requestId); reject(new Error("UDT 프록시 응답 시간 초과")); } }, timeout);
  });

  let sessionId = session;
  if (reload || !sessionId) {
    console.warn("[host-smoke] Plugin.load 실행 — 패널이 재부팅됩니다(의도된 1회).");
    const loaded = await proxyTo({ command: "Plugin", action: "load", params: { provider: { type: "disk", path: distPath } }, breakOnStart: false });
    sessionId = loaded.pluginSessionId;
    if (!sessionId) throw new Error("Plugin.load 실패: " + JSON.stringify(loaded).slice(0, 200));
    await sleep(2500);
  }
  await proxyTo({ command: "Plugin", action: "debug", pluginSessionId: sessionId });
  await sleep(1000);

  const ws = new WS(`ws://127.0.0.1:14001/socket/cdt/${sessionId}`);
  let nextId = 0;
  const pending = new Map();
  const contexts = [];
  let contextResolve = null;
  const consoleErrors = [];
  ws.onmessage = (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (message.id && pending.has(message.id)) {
      const { resolve } = pending.get(message.id);
      pending.delete(message.id);
      resolve(message.error ? { __cdpError: message.error } : (message.result ?? {}));
      return;
    }
    if (message.method === "Runtime.executionContextCreated") { contexts.push(message.params.context); contextResolve?.(); }
    if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
      consoleErrors.push((message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? "").join(" ").slice(0, 300));
    }
  };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("CDT 웹소켓 접속 실패")); });
  const call = (method, params = {}) => new Promise((resolve) => {
    nextId += 1;
    const id = nextId;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve({ __timeout: method }); } }, 12000);
  });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const reply = await call("Runtime.enable");
    if (!reply.__cdpError && !reply.__timeout) break;
    await sleep(900);
  }
  if (contexts.length === 0) await new Promise((resolve) => { contextResolve = resolve; setTimeout(resolve, 8000); });
  if (contexts.length === 0) throw new Error("패널 실행 컨텍스트를 찾지 못했습니다.");

  const evalJs = async (expression, awaitPromise = false) => {
    const reply = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise, contextId: contexts[0].id });
    if (reply.exceptionDetails) throw new Error("PAGE EXCEPTION: " + JSON.stringify(reply.exceptionDetails).slice(0, 500));
    return reply.result?.value;
  };

  return { sessionId, evalJs, call, sleep, consoleErrors, close: () => { ws.close(); service.close(); } };
}

/**
 * 패널 안 비동기 코드를 마커+폴링 패턴으로 실행한다(§40-d 표준 패턴).
 * body는 페이지 컨텍스트의 async 본문 문자열 — `out` 객체에 결과를 채우면 된다.
 * 반환: { out } 또는 { err }.
 */
export async function evalAsyncProbe(panel, body, { timeoutMs = 30000, pollMs = 500 } = {}) {
  const key = "__smoke_" + Math.random().toString(36).slice(2, 8);
  await panel.evalJs(
    `(() => { window.${key} = { pending: true }; (async () => { const out = {}; try { ${body}
      window.${key} = { pending: false, out }; } catch (e) { window.${key} = { pending: false, err: String(e && e.stack || e).slice(0, 500) }; } })(); return true; })()`,
  );
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = await panel.evalJs(`window.${key}`);
    if (state && typeof state === "object" && state.pending === false) {
      await panel.evalJs(`(() => { delete window.${key}; return true; })()`);
      return state;
    }
    if (Date.now() > deadline) return { err: `프로브 시간 초과(${timeoutMs}ms)` };
    await sleep(pollMs);
  }
}

/** 활동 로그(#log-list)에서 패턴에 맞는 최근 항목을 읽는다(getElementById+children 순회 — §25-b). */
export async function readActivityLog(panel, pattern, limit = 4) {
  return panel.evalJs(
    `(() => {
      const list = document.getElementById('log-list');
      if (!list) return [];
      const rows = [];
      for (const child of list.children) {
        const text = String(child.textContent || '').trim().replace(/[ ]+/g, ' ');
        if (new RegExp(${JSON.stringify(pattern)}).test(text)) rows.push(text.slice(0, 140));
        if (rows.length >= ${Number(limit)}) break;
      }
      return rows;
    })()`,
  );
}
