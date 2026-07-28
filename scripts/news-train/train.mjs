// 뉴스 앵커 분류기 학습 — 홀드아웃 F1 기준 하이퍼파라미터 스윕, 커밋 모델 대비 개선 시에만 --write 반영.
import { writeFile } from "node:fs/promises";
import {
  MODEL_PATH, listEpisodes, loadEpisode, loadMatcherBanks, routeMatcher, loadCurrentModel,
  buildFeatureRows, predictItemStarts, boundaryF1, trainLogistic, formatMetrics,
} from "./lib.mjs";

// 홀드아웃 기본값: 평일·토·일(레터박스·신형 포함) 포맷 대표 — 학습에서 제외하고 검증에만 쓴다.
// 20260723_Thu는 **코퍼스에 없던 최신 회차**로 잡은 홀드아웃이다(§100) — 날짜 무작위 홀드아웃은
// "학습 분포 안의 미측정 회차"라 일반화 실패를 못 잡는다. 이 회차 하나가 실제로 F1 47.1로
// 무너졌는데 코퍼스 전체는 97.9였다. 학습셋으로 흡수되면 그 실패가 지표에서 사라지므로 고정한다.
// 새 회차를 training-data에 추가하면 반드시 여기에도 넣는다(CLAUDE.md 측정 규약) —
// 넣지 않으면 다음 학습이 그 회차를 삼켜 실패가 지표에서 사라진다(§100에서 실제 발생).
// 5/20·5/27·7/26은 블라인드 3연속 F1 100의 측정 대상이라 학습에서 반드시 제외한다(§114).
const DEFAULT_HOLDOUT = ["Train_KBC_20260709_Thu", "Train_KBC_20260711_Sat", "Train_KBC_20260712_Sun", "Train_KBC_20260628_Sun", "Train_KBC_20260723_Thu", "Train_KBC_20260724_Fri", "Train_KBC_20260725_Sat", "Train_KBC_20260520_Wed", "Train_KBC_20260527_Wed", "Train_KBC_20260726_Sun", "Train_KBC_20260601_Mon", "Train_KBC_20260604_Thu", "Train_KBC_20260511_Mon", "Train_KBC_20260508_Fri", "Train_KBC_20260507_Thu",
  // 1~4월 대표성(§127) — 코퍼스가 5~7월에 편중돼 그 분포 밖 회차에서 후보 생성이 무너지고,
  // 그것이 §123·§124·§126 변동의 뿌리였다. 블라인드로 소진한 11회차를 학습셋에 넣으면서
  // 그중 셋을 홀드아웃에 남긴다 — 그러지 않으면 개선이 지표 ②에 잡히지 않는다.
  // 4/07은 앵커샷 없는 시작(§125)을 포함해 무료 경로가 원리적으로 못 잡는 FN이 상수로 남는다.
  "Train_KBC_20260113_Tue", "Train_KBC_20260210_Tue", "Train_KBC_20260407_Tue"];
const SWEEP = [
  { epochs: 300, lr: 0.4, posWeight: 8, l2: 4e-5 },   // 구 스크립트 기본(비교 기준)
  { epochs: 800, lr: 1, posWeight: 8, l2: 0 },        // §71-e 평일 재현 설정
  { epochs: 800, lr: 1, posWeight: 8, l2: 1e-4 },
  { epochs: 1500, lr: 0.6, posWeight: 8, l2: 1e-4 },
  { epochs: 1500, lr: 0.6, posWeight: 4, l2: 1e-4 },  // 양성 가중 완화(과검출 억제)
  { epochs: 800, lr: 1, posWeight: 4, l2: 0 },
];

const args = process.argv.slice(2);
const write = args.includes("--write");
const holdoutArg = args.find((arg) => arg.startsWith("--holdout="));
const holdout = holdoutArg ? holdoutArg.slice("--holdout=".length).split(",") : DEFAULT_HOLDOUT;

const banks = await loadMatcherBanks();
const all = await listEpisodes();
const trainMeta = all.filter((episode) => !holdout.includes(episode.name));
const holdMeta = all.filter((episode) => holdout.includes(episode.name));
if (holdMeta.length === 0) throw new Error("홀드아웃 에피소드가 데이터에 없습니다.");
console.log(`학습 ${trainMeta.length}회차 / 홀드아웃 ${holdMeta.length}회차 (${holdMeta.map((e) => e.name.replace("Train_KBC_", "")).join(", ")})`);

const trainEpisodes = [];
const rows = [];
for (const meta of trainMeta) {
  const episode = await loadEpisode(meta.name, meta.corrected);
  trainEpisodes.push(episode);
  rows.push(...buildFeatureRows(episode, routeMatcher(episode, banks)));
}
const holdEpisodes = [];
for (const meta of holdMeta) holdEpisodes.push(await loadEpisode(meta.name, meta.corrected));
console.log(`샘플 ${rows.length} (양성 ${rows.filter((row) => row.label === 1).length})`);

const evaluate = (model) => {
  let totals = { tp: 0, fp: 0, fn: 0 };
  const per = [];
  for (const episode of holdEpisodes) {
    const { starts } = predictItemStarts(episode, routeMatcher(episode, banks), model);
    const metrics = boundaryF1(starts, episode.truth.map((item) => item.start));
    totals.tp += metrics.tp; totals.fp += metrics.fp; totals.fn += metrics.fn;
    per.push(`${episode.name.replace("Train_KBC_", "")} ${formatMetrics(metrics)}`);
  }
  const precision = totals.tp / (totals.tp + totals.fp || 1);
  const recall = totals.tp / (totals.tp + totals.fn || 1);
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { f1, summary: formatMetrics({ precision, recall, f1 }), per };
};

const baseline = evaluate(await loadCurrentModel());
console.log(`\n[베이스라인=커밋 모델] 홀드아웃 ${baseline.summary}`);
for (const line of baseline.per) console.log(`  ${line}`);

let best = null;
for (const config of SWEEP) {
  const model = trainLogistic(rows, config);
  const result = evaluate(model);
  const tag = `ep${config.epochs} lr${config.lr} pw${config.posWeight} l2=${config.l2}`;
  console.log(`\n[${tag}] 홀드아웃 ${result.summary} (bias ${model.bias.toFixed(3)})`);
  for (const line of result.per) console.log(`  ${line}`);
  if (!best || result.f1 > best.f1) best = { ...result, model, tag };
}

console.log(`\n최고 후보: ${best.tag} → ${best.summary} vs 베이스라인 ${baseline.summary}`);
if (best.f1 <= baseline.f1) {
  console.log("결론: 커밋 모델을 이기지 못함 — 반영 안 함(모델 파일 미변경).");
  process.exit(0);
}
if (!write) {
  console.log("개선 확인. 반영하려면 --write 로 재실행(전 회차 학습으로 최종 산출).");
  process.exit(0);
}
// --write: 최고 설정으로 홀드아웃 포함 전 회차 재학습 후 기록
const allRows = [...rows];
for (const episode of holdEpisodes) allRows.push(...buildFeatureRows(episode, routeMatcher(episode, banks)));
const finalConfig = SWEEP.find((config) => `ep${config.epochs} lr${config.lr} pw${config.posWeight} l2=${config.l2}` === best.tag);
const finalModel = trainLogistic(allRows, finalConfig);
const round = (value) => Math.round(value * 1e5) / 1e5;
const body = [
  "// 앵커 리드 로지스틱 분류기 가중치 — 사람이 검수한 분할 코퍼스로 오프라인 학습(무료 추론).",
  `// 학습 회차 ${all.length}개, 샘플 ${allRows.length} — 재학습은 scripts/news-train/train.mjs (홀드아웃 F1 게이트).`,
  "// 특징 순서: 144셀 luma/255, 직전 프레임차, 직후 프레임차, 참조 가중거리×4(1 상한).",
  `export const NEWS_ANCHOR_MODEL_WEIGHTS: readonly number[] = [${finalModel.weights.map(round).join(", ")}];`,
  `export const NEWS_ANCHOR_MODEL_BIAS = ${round(finalModel.bias)};`,
  "",
].join("\n");
await writeFile(MODEL_PATH, body, "utf8");
console.log(`반영 완료: ${MODEL_PATH} (${best.tag}, 전 회차 ${all.length}개 재학습, bias ${round(finalModel.bias)})`);
