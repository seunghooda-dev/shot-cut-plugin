// 현재 src 모델을 라벨 에피소드 전체(또는 지정)에 평가 — 회차별·전체 경계 F1 리포트.
import { listEpisodes, loadEpisode, loadMatcher, loadCurrentModel, predictItemStarts, boundaryF1, formatMetrics } from "./lib.mjs";

const only = process.argv.slice(2);
const matcher = await loadMatcher();
const model = await loadCurrentModel();
const episodes = (await listEpisodes()).filter((episode) => only.length === 0 || only.includes(episode.name));
let totals = { tp: 0, fp: 0, fn: 0 };
for (const meta of episodes) {
  const episode = await loadEpisode(meta.name, meta.corrected);
  const { starts, modelStarts } = predictItemStarts(episode, matcher, model);
  const metrics = boundaryF1(starts, episode.truth.map((item) => item.start));
  totals.tp += metrics.tp; totals.fp += metrics.fp; totals.fn += metrics.fn;
  const tag = meta.corrected ? " (정정본)" : "";
  console.log(`${meta.name}${tag}: 예측 ${starts.length} (모델 ${modelStarts.length}) / 정답 ${episode.truth.length} → ${formatMetrics(metrics)}`);
}
const precision = totals.tp / (totals.tp + totals.fp || 1);
const recall = totals.tp / (totals.tp + totals.fn || 1);
const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
console.log(`\n전체 ${episodes.length}회차: TP ${totals.tp} FP ${totals.fp} FN ${totals.fn} → ${formatMetrics({ precision, recall, f1 })}`);
