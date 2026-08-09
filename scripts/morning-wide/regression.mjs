// 모닝와이드 오프라인 회귀 게이트 — 고정 회차의 경계 F1이 스냅샷 아래로 떨어지면 실패(exit 1).
// check:news의 모닝와이드 판이되 **제품 모듈을 그대로 불러 쓴다**(.test-build 컴파일 산출물) —
// check:news의 lib.mjs 재구현과 달리 뱅크 라우팅·P5 모델·합집합이 제품과 같은 코드다.
// 주의: 절대 F1이 아니다(§138 병합·재스냅·비전이 빠져 있다 — 상대 비교 전용, §162).
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUILD = join(ROOT, ".test-build", "src");
const CACHE = join(ROOT, "training-data", "morning-wide", "scan-cache");
const LABELS = join(ROOT, "training-data", "morning-wide");

if (!existsSync(BUILD)) {
  console.log(".test-build 없음 — `npm run test:compile`을 먼저 돌리세요(check:mw 스크립트는 자동 수행).");
  process.exit(1);
}
if (!existsSync(CACHE) || readdirSync(CACHE).length === 0) {
  console.log(`스캔 캐시 없음(${CACHE}) — 실기 스캔 산출물이 필요합니다. 게이트를 건너뜁니다.`);
  process.exit(0);
}

const visual = require(join(BUILD, "news-visual-cut.js"));
const bankMod = require(join(BUILD, "morning-wide-reference-grids.js"));
const modelMod = require(join(BUILD, "morning-wide-anchor-model.js"));

// 제품 index.ts와 같은 값이어야 한다 — 어긋나면 게이트가 제품이 아닌 것을 지킨다.
const UNION_CAP = 0.08;

// 2026-08-09 고정(§7-ao) — 런 시각 귀속 시정 + cap 0.08 반영한 현행 제품 구성 실측.
// **모델·뱅크·문턱을 바꾸면 이 값도 같은 커밋에서 다시 잰다.**
const SNAPSHOT = {
  "20260722_Wed": 100.0, "20260723_Thu": 94.1, "20260724_Fri": 97.4, "20260727_Mon": 100.0,
  "20260728_Tue": 97.9, "20260729_Wed": 96.8, "20260730_Thu": 97.4, "20260731_Fri": 97.3,
  "20260803_Mon": 100.0, "20260804_Tue": 100.0, "20260805_Wed": 91.9, "20260806_Thu": 77.4,
  "20260807_Fri": 100.0,
  // 홀드아웃 6회차(학습·선택 무접촉) — 일반화 감시. §7-ao 시정본 실측.
  "20260714_Tue": 97.0, "20260715_Wed": 81.3, "20260716_Thu": 88.4,
  "20260717_Fri": 87.5, "20260720_Mon": 95.7, "20260721_Tue": 95.0,
};

const BANKS = [
  bankMod.MORNING_WIDE_REFERENCE_GRIDS, bankMod.MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT,
  bankMod.MORNING_WIDE_REFERENCE_GRIDS_LIGHT, bankMod.MORNING_WIDE_REFERENCE_GRIDS_0730,
  bankMod.MORNING_WIDE_REFERENCE_GRIDS_0731, bankMod.MORNING_WIDE_REFERENCE_GRIDS_0803,
  bankMod.MORNING_WIDE_REFERENCE_GRIDS_0805,
];
const matchers = BANKS.map((grids) => visual.buildAnchorMatcher(grids));

const f1Of = (tp, fp, fn) => {
  if (tp === 0) return 0;
  const p = (tp / (tp + fp)) * 100;
  const r = (tp / (tp + fn)) * 100;
  return (2 * p * r) / (p + r);
};

let failed = false;
for (const [name, base] of Object.entries(SNAPSHOT)) {
  const cachePath = join(CACHE, `${name}.json`);
  if (!existsSync(cachePath)) { console.log(`${name}: 캐시 없음 — 건너뜀`); continue; }
  const samples = JSON.parse(readFileSync(cachePath, "utf8"))
    .filter((sample) => sample.grid)
    .map((sample) => ({ time: sample.time, grid: Float64Array.from(sample.grid) }));
  // 짝수 위상 검문(§7-v) — 홀수 표본이 섞이면 격자가 달라져 게이트가 무의미해진다.
  const odd = samples.filter((sample) => Math.round(sample.time) % 2 !== 0).length;
  if (odd > 0) { console.log(`${name}: 캐시 위상 오염(홀수 ${odd}) — 게이트 무효`); failed = true; continue; }
  const labels = JSON.parse(readFileSync(join(LABELS, `MW_KBC_${name}.items.json`), "utf8")).map((item) => item.start);
  const matcher = visual.selectAnchorMatcher(samples, matchers, { preferPrimary: false });
  const candidates = visual.collectAnchorCandidates(samples, matcher, {
    runYieldMaxDist: UNION_CAP,
    runTimeAtOnset: true,
  });
  const probabilities = visual.scoreAnchorSamples(
    samples, matcher,
    modelMod.MORNING_WIDE_ANCHOR_MODEL_WEIGHTS, modelMod.MORNING_WIDE_ANCHOR_MODEL_BIAS,
  );
  const accepted = visual.hybridAnchorTimes(
    candidates, visual.detectModelStarts(samples, probabilities), { unionMaxRefDist: UNION_CAP },
  );
  const matched = new Set();
  for (const time of accepted) {
    const hit = labels.find((label) => Math.abs(label - time) <= 8 && !matched.has(label));
    if (hit !== undefined) matched.add(hit);
  }
  const f1 = f1Of(matched.size, accepted.length - matched.size, labels.length - matched.size);
  const ok = f1 >= base - 0.05;
  if (!ok) failed = true;
  console.log(`${name}: F1 ${f1.toFixed(1)} (기준 ≥${base.toFixed(1)}) ${ok ? "OK" : "회귀!"}`);
}
console.log(failed ? "모닝와이드 회귀 게이트 실패" : "모닝와이드 회귀 게이트 통과");
process.exit(failed ? 1 : 0);
