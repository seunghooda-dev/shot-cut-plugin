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

/**
 * Premiere 오디오 미리듣기 캐시 크기를 확인하고 임계치를 넘으면 경고를 찍는다.
 * full 티어의 시퀀스 생성/삭제가 반복되면 프로젝트 단위 오디오 컨폼 캐시가 계속 누적되는데
 * (시퀀스를 지워도 캐시는 안 지워짐), 이 폴더는 Premiere 26.0 전체가 공유하므로
 * 자동 삭제하지 않고 경고만 남긴다 — 비우기는 Premiere 종료 후 수동으로.
 */
export async function warnIfAudioPreviewCacheLarge(thresholdGb = 10) {
  const { join } = await import("node:path");
  const { readdir, stat } = await import("node:fs/promises");
  const { homedir } = await import("node:os");
  const cacheDir = join(homedir(), "Documents", "Adobe", "Premiere Pro", "26.0", "Adobe Premiere Pro Audio Previews");
  let totalBytes = 0;
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else { try { totalBytes += (await stat(full)).size; } catch { /* 잠긴 파일은 건너뜀 */ } }
    }
  }
  await walk(cacheDir);
  const gb = totalBytes / 1024 ** 3;
  if (gb >= thresholdGb) {
    console.warn(`[host-smoke] ⚠️ Premiere 오디오 캐시가 ${gb.toFixed(1)}GB입니다(임계 ${thresholdGb}GB).`);
    console.warn("[host-smoke]    배치 산물만 지우려면: npm run clean:previews -- --apply (활성 프로젝트는 잠겨서 자동으로 남습니다)");
    console.warn(`[host-smoke]    전부 비우려면 Premiere를 끄고 이 폴더를 비웁니다: ${cacheDir}`);
  }
  return gb;
}

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
  // clientId는 서비스에 접속이 생길 때마다 증가한다 — 스모크 러너 자신도 접속을 소비하므로
  // 장시간 세션에서는 앱 clientId가 6을 훌쩍 넘는다(2026-07-27 실측: UDT 재로드 후 1~6 스캔 실패).
  let appClientId = null;
  // 500까지 훑는다(2026-08-06 실측: §192 재기동 후 재로드된 패널이 395번 — 300 상한이
  // 살아 있는 패널을 "없음"으로 오진했다). 진단 접속·재연결이 반복될수록 번호가 올라간다.
  for (let candidate = 1; candidate <= 500 && appClientId === null; candidate += 1) {
    const reply = await clientReq(candidate, { command: "App", action: "info" }, 1200);
    if (reply && reply.appId) appClientId = candidate;
  }
  if (appClientId === null) {
    // 실패해도 소켓을 닫는다 — 접속 하나가 clientId를 하나 소비하므로, 닫지 않으면 재시도할수록
    // 앱 clientId가 밀려나 스캔 범위를 스스로 넘기게 된다(누수가 원인을 재생산하는 구조).
    service.close();
    throw new Error("Premiere 앱 클라이언트를 찾지 못했습니다(Premiere 실행·UDT 연결 확인).");
  }

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
        // 640자 — 140자는 아이템이 20개를 넘는 회차에서 "최종 아이템 시작:" 줄을 잘라
        // **채점이 잘린 산출물을 읽는** 측정 사고를 냈다(2026-08-04 실측: 모닝와이드 7/28
        // 23개 산출이 20개로 읽힘). 8뉴스는 11~14개라 140자 안에 들어가 드러나지 않았다.
        if (new RegExp(${JSON.stringify(pattern)}).test(text)) rows.push(text.slice(0, 640));
        if (rows.length >= ${Number(limit)}) break;
      }
      return rows;
    })()`,
  );
}
