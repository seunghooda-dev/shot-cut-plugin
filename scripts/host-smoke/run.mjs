// Host 스모크 러너 — 한 번 접속(1회 재부팅) 후 모든 체크를 같은 세션에서 실행한다(§40-d 단일 세션 원칙)
import { fileURLToPath } from "node:url";
import path from "node:path";
import { connectPanel, sleep } from "./lib.mjs";
import { checks } from "./checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultDist = path.resolve(here, "..", "..", "dist");

const args = process.argv.slice(2);
const full = args.includes("--full");
const nameFilterIndex = args.indexOf("--check");
const nameFilter = nameFilterIndex >= 0 ? args[nameFilterIndex + 1] : null;
const distIndex = args.indexOf("--dist");
const distPath = distIndex >= 0 ? path.resolve(args[distIndex + 1]) : defaultDist;

const selected = checks.filter((check) =>
  (nameFilter ? check.name === nameFilter : (full || check.tier === "default")));
if (selected.length === 0) {
  console.error(`실행할 체크가 없습니다. --check 이름을 확인하세요. 가능: ${checks.map((c) => c.name).join(", ")}`);
  process.exit(2);
}

console.log(`[host-smoke] dist=${distPath}`);
console.log(`[host-smoke] 체크 ${selected.length}개 (${full ? "full" : nameFilter ? "단일" : "기본"} 티어): ${selected.map((c) => c.name).join(", ")}`);

let panel = null;
for (let attempt = 0; attempt < 8 && !panel; attempt += 1) {
  try {
    panel = await connectPanel({ distPath, reload: attempt === 0 });
  } catch (error) {
    console.warn(`[host-smoke] 접속 재시도 ${attempt + 1}/8: ${error.message}`);
    await sleep(3000);
  }
}
if (!panel) {
  console.error("[host-smoke] FATAL: 패널에 접속하지 못했습니다. Premiere + UDT 서비스 실행 여부를 확인하세요.");
  process.exit(1);
}
await sleep(3500); // 패널 부팅 대기

const results = [];
for (const check of selected) {
  const startedAt = Date.now();
  let outcome;
  try {
    outcome = await check.run(panel);
  } catch (error) {
    outcome = { pass: false, details: `체크 예외: ${String(error && error.message || error).slice(0, 200)}` };
  }
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  results.push({ name: check.name, ...outcome, elapsed });
  console.log(`${outcome.pass ? "PASS" : "FAIL"}  ${check.name} (${elapsed}s) — ${outcome.details}`);
}

const failed = results.filter((result) => !result.pass);
const lastErrors = panel.consoleErrors.slice(-3);
panel.close();
console.log(`[host-smoke] 결과: ${results.length - failed.length}/${results.length} 통과${failed.length ? " — 실패: " + failed.map((f) => f.name).join(", ") : ""}`);
if (lastErrors.length > 0) console.log(`[host-smoke] 세션 콘솔 에러(최근 3): ${JSON.stringify(lastErrors)}`);
process.exit(failed.length === 0 ? 0 : 1);
