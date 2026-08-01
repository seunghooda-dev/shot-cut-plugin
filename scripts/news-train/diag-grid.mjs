// 회차의 격자 점수·참조 거리·후보를 시각 단위로 열어보는 진단(§170-b에서 §125 4형 병목 규명).
import { loadEpisode, loadMatcherBanks, routeMatcher, loadCurrentModel, visual } from "./lib.mjs";

const NAME = process.argv[2] ?? "Train_KBC_20260407_Tue";
const TARGET = Number(process.argv[3] ?? 220.8);

const banks = await loadMatcherBanks();
const model = await loadCurrentModel();
const episode = await loadEpisode(NAME, false);
const matcher = routeMatcher(episode, banks);
const { samples, truth } = episode;

const candidates = visual.collectAnchorCandidates(samples, matcher);
const probs = visual.scoreAnchorSamples(samples, matcher, model.weights, model.bias);
const modelStarts = visual.detectModelStarts(samples, probs);

console.log(`${NAME} · 표적 ${TARGET}`);
console.log("라벨 시작:", truth.map((t) => t.start.toFixed(1)).join(" "));
console.log("후보:", candidates.map((c) => (typeof c === "number" ? c : c.time).toFixed(1)).join(" "));
console.log("모델 시작:", modelStarts.map((t) => (typeof t === "number" ? t : t.time).toFixed(1)).join(" "));

console.log(`\n표적 ±20초 격자 (p = 모델 확률, d = 참조 거리):`);
for (let i = 0; i < samples.length; i += 1) {
  const t = samples[i].time;
  if (Math.abs(t - TARGET) > 20) continue;
  const d = matcher.distance(samples[i].grid);
  console.log(`  t=${t.toFixed(1)}  p=${probs[i].toFixed(4)}  d=${d.toFixed(4)}`);
}

// 대조 — 정상 검출된 라벨 시작들의 p·d는 어떤 수준인가.
console.log("\n라벨별 최근접 격자 p·d:");
for (const item of truth) {
  let best = 0;
  for (let i = 0; i < samples.length; i += 1) {
    if (Math.abs(samples[i].time - item.start) < Math.abs(samples[best].time - item.start)) best = i;
  }
  const d = matcher.distance(samples[best].grid);
  const mark = Math.abs(item.start - TARGET) <= 8 ? "  ← 표적" : "";
  console.log(`  ${item.start.toFixed(1)} → p=${probs[best].toFixed(4)} d=${d.toFixed(4)}${mark}`);
}
