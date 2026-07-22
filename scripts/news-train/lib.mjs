// 뉴스 앵커 학습 파이프라인 공통 모듈 — 추론(news-visual-cut)과 완전 동일한 특징·전체 추론 경로·경계 F1 지표.
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA_DIR = path.join(ROOT, "training-data", "news-anchor");
export const MODEL_PATH = path.join(ROOT, "src", "news-anchor-model.ts");
// 추론과 같은 컴파일 산출물을 그대로 사용한다(학습·추론 특징 불일치 방지 — 런북 §71-e).
export const visual = require(path.join(ROOT, ".test-build", "src", "news-visual-cut.js"));

/** TS 소스에서 배열 상수 리터럴을 파싱한다(테스트 빌드에 상수 파일이 없어 원문 파싱). */
export async function parseArrayConst(filePath, constName) {
  const source = await readFile(filePath, "utf8");
  const open = source.indexOf("[", source.indexOf("=", source.indexOf(constName)));
  let depth = 0;
  let end = open;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "[") depth += 1;
    if (source[index] === "]") {
      depth -= 1;
      if (depth === 0) { end = index + 1; break; }
    }
  }
  return new Function(`return ${source.slice(open, end)}`)();
}

/** 배포 참조 뱅크(평일·신형) 매처 배열 — 회차별로 selectAnchorMatcher 로 라우팅(index.ts와 동일). */
export async function loadMatcherBanks() {
  const file = path.join(ROOT, "src", "news-anchor-reference-grids.ts");
  const banks = [];
  for (const constName of ["NEWS_ANCHOR_REFERENCE_GRIDS", "NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW"]) {
    const grids = await parseArrayConst(file, constName);
    if (Array.isArray(grids) && grids.length > 0) banks.push(visual.buildAnchorMatcher(grids));
  }
  return banks;
}

/** 회차 스캔에 대한 라우팅 매처 — 추론(index.ts)과 동일한 선택 규칙. */
export function routeMatcher(episode, banks) {
  return visual.selectAnchorMatcher(episode.samples, banks);
}

/** src/news-anchor-model.ts 의 현재(커밋) 가중치. */
export async function loadCurrentModel() {
  const weights = await parseArrayConst(MODEL_PATH, "NEWS_ANCHOR_MODEL_WEIGHTS");
  const source = await readFile(MODEL_PATH, "utf8");
  const bias = Number(source.match(/NEWS_ANCHOR_MODEL_BIAS = ([-\d.]+)/)[1]);
  return { weights, bias };
}

/** 라벨 있는 에피소드 목록 — Foo.items.corrected.json 이 있으면 그것을 정답으로 쓴다. */
export async function listEpisodes() {
  const files = await readdir(DATA_DIR);
  const corrected = new Set(
    files.filter((f) => f.endsWith(".items.corrected.json")).map((f) => f.replace(".items.corrected.json", "")),
  );
  const episodes = [];
  for (const file of files) {
    if (!file.endsWith(".items.json") || file.endsWith(".orig")) continue;
    const name = file.replace(".items.json", "");
    if (name === "NewsCut_KBC_20260715") continue; // 참조 앵커 뱅크(라벨 아님)
    if (!files.includes(`${name}.json`)) continue; // 스캔 캐시 없으면 학습 불가
    episodes.push({ name, corrected: corrected.has(name) });
  }
  return episodes.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadEpisode(name, useCorrected) {
  const samples = JSON.parse(await readFile(path.join(DATA_DIR, `${name}.json`), "utf8"))
    .filter((sample) => sample.grid)
    .map((sample) => ({ time: sample.time, grid: Float64Array.from(sample.grid) }));
  const labelFile = useCorrected ? `${name}.items.corrected.json` : `${name}.items.json`;
  const truth = JSON.parse(await readFile(path.join(DATA_DIR, labelFile), "utf8"));
  return { name, samples, truth };
}

/** 추론과 동일한 특징 벡터(144 luma/255, 전후 프레임차, 참조 가중거리×4 상한1). */
export function buildFeatureRows(episode, matcher) {
  const { samples, truth } = episode;
  const starts = truth.map((item) => item.start);
  const endTime = truth.at(-1).end;
  const rows = [];
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const prev = samples[index - 1];
    const next = samples[index + 1];
    const features = new Array(147);
    for (let cell = 0; cell < 144; cell += 1) features[cell] = sample.grid[cell] / 255;
    features[144] = prev ? frameDiff(sample.grid, prev.grid) : 1;
    features[145] = next ? frameDiff(sample.grid, next.grid) : 1;
    features[146] = Math.min(1, matcher.distance(sample.grid) * 4);
    const inLead = starts.some((start) => sample.time >= start - 0.5 && sample.time <= start + 4);
    const uncertain = !inLead && (starts.some((start) => sample.time > start - 3 && start + 16 > sample.time)
      || sample.time > endTime - 2);
    if (!uncertain) rows.push({ features, label: inLead ? 1 : 0 });
  }
  return rows;
}

function frameDiff(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += Math.abs(a[index] - b[index]);
  return sum / a.length / 255;
}

/** 전체 추론 경로로 예측 아이템 시작을 뽑는다(원클릭과 동일 로직). */
export function predictItemStarts(episode, matcher, model) {
  const { samples } = episode;
  const candidates = visual.collectAnchorCandidates(samples, matcher);
  const probabilities = visual.scoreAnchorSamples(samples, matcher, model.weights, model.bias);
  const modelStarts = visual.detectModelStarts(samples, probabilities);
  const accepted = visual.hybridAnchorTimes(candidates, modelStarts);
  const tail = visual.detectStaticTailStart(samples);
  const duration = samples.at(-1).time;
  const items = visual.buildItemsFromStarts(accepted, tail ?? duration);
  return { starts: items.map((item) => item.start), modelStarts };
}

/** 경계 F1 — 예측 시작 vs 정답 시작을 ±tolerance 초로 1:1 매칭. */
export function boundaryF1(predicted, truthStarts, tolerance = 8) {
  const unmatched = new Set(truthStarts.map((_, index) => index));
  let tp = 0;
  for (const start of predicted) {
    let bestIndex = -1;
    let bestGap = tolerance + 1;
    for (const index of unmatched) {
      const gap = Math.abs(truthStarts[index] - start);
      if (gap <= tolerance && gap < bestGap) { bestGap = gap; bestIndex = index; }
    }
    if (bestIndex >= 0) { unmatched.delete(bestIndex); tp += 1; }
  }
  const fp = predicted.length - tp;
  const fn = truthStarts.length - tp;
  const precision = predicted.length ? tp / predicted.length : 0;
  const recall = truthStarts.length ? tp / truthStarts.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, precision, recall, f1 };
}

/** 로지스틱 GD 학습(추론과 같은 특징 차원 147). */
export function trainLogistic(rows, { epochs, lr, posWeight, l2 }) {
  const dims = 147;
  const model = { weights: new Array(dims).fill(0), bias: 0 };
  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradW = new Array(dims).fill(0);
    let gradB = 0;
    for (const row of rows) {
      let z = model.bias;
      for (let dim = 0; dim < dims; dim += 1) z += model.weights[dim] * row.features[dim];
      const p = 1 / (1 + Math.exp(-z));
      const error = (p - row.label) * (row.label === 1 ? posWeight : 1);
      for (let dim = 0; dim < dims; dim += 1) gradW[dim] += error * row.features[dim];
      gradB += error;
    }
    const scale = lr / rows.length;
    for (let dim = 0; dim < dims; dim += 1) model.weights[dim] -= scale * gradW[dim] + l2 * model.weights[dim];
    model.bias -= scale * gradB;
  }
  return model;
}

export function formatMetrics(metrics) {
  const pct = (value) => (value * 100).toFixed(0).padStart(3);
  return `P${pct(metrics.precision)} R${pct(metrics.recall)} F1 ${(metrics.f1 * 100).toFixed(1)}`;
}

/** 하단 띠 프로브 캐시(<name>.bandprobes.json) — 없으면 null(필터 미적용). */
export async function loadBandProbes(name) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, `${name}.bandprobes.json`), "utf8"));
  } catch {
    return null;
  }
}

/**
 * 인용띠 필터(원클릭과 동일 규칙) — 첫 후보 면제, +2s·+4s 프로브가 모두 인용띠일 때만 배제.
 * 프로브가 없는 시각은 그대로 통과(우아한 강하).
 */
export function applyQuoteBandFilter(starts, bandProbes) {
  if (!bandProbes) return starts;
  const toStats = (rows) => rows.map(([, dark, mean]) => ({ dark, mean }));
  return starts.filter((start, index) => {
    if (index === 0) return true;
    const probe = bandProbes.find((entry) => Math.abs(entry.t - start) <= 2);
    if (!probe?.rows2 || !probe?.rows4) return true;
    return !(visual.isQuoteBandStats(toStats(probe.rows2), 270) && visual.isQuoteBandStats(toStats(probe.rows4), 270));
  });
}
