// 뉴스 분할 오프라인 회귀 게이트 — 고정 회차의 경계 F1이 스냅샷 아래로 떨어지면 실패(exit 1).
// 매처·모델·분할 로직 변경 후 npm run check:news 로 실기 없이 빠르게 회귀를 잡는다.
import { listEpisodes, loadEpisode, loadMatcherBanks, routeMatcher, loadCurrentModel, predictItemStarts, boundaryF1, loadBandProbes, applyQuoteBandFilter } from "./lib.mjs";

// 스냅샷(2026-07-21 확정) — 평일·일요일 평일형·신형 커버, 전부 F1 100 기대.
// 2026-08-03(§177): 8월 초 분포 2회차 추가 — 7/30(평일)·8/2(일요일 단축판, 654초·7아이템).
// 무료 경로가 결정적으로 100인 회차만 골라 기준 1.0으로 고정한다(둘 다 홀드아웃 — 학습이
// 삼킬 수 없어 게이트가 신규 분포의 후보 생성 회귀를 계속 감시한다).
const SNAPSHOT = [
  ["Train_KBC_20260512_Tue", 1.0],
  ["Train_KBC_20260607_Sun", 1.0],
  ["Train_KBC_20260720_Mon", 1.0],
  ["Train_KBC_20260719_Sun", 0.9],
  ["Train_KBC_20260730_Thu", 1.0],
  ["Train_KBC_20260802_Sun", 1.0],
];

const banks = await loadMatcherBanks();
const model = await loadCurrentModel();
const byName = new Map((await listEpisodes()).map((meta) => [meta.name, meta]));
let failed = 0;
for (const [name, minF1] of SNAPSHOT) {
  const meta = byName.get(name);
  if (!meta) { console.log(`누락: ${name} (training-data 확인)`); failed += 1; continue; }
  const episode = await loadEpisode(name, meta.corrected);
  const { starts: rawStarts } = predictItemStarts(episode, routeMatcher(episode, banks), model);
  const starts = applyQuoteBandFilter(rawStarts, await loadBandProbes(name));
  const { f1 } = boundaryF1(starts, episode.truth.map((item) => item.start));
  const ok = f1 >= minF1 - 1e-9;
  console.log(`${name}: F1 ${(f1 * 100).toFixed(1)} (기준 ≥${minF1 * 100}) ${ok ? "OK" : "회귀!"}`);
  if (!ok) failed += 1;
}
if (failed > 0) { console.log(`회귀 게이트 실패 ${failed}건`); process.exit(1); }
console.log("뉴스 분할 회귀 게이트 통과");
