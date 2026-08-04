// 8뉴스 비전 판정 벤치마크 셋 — 라벨 48회차에서 양성/음성 프레임을 뽑고, 런북에 기록된
// 과거 오판 지점을 "어려운 표본"으로 함께 넣는다.
//
// 왜 8뉴스인가: 프롬프트에 누적된 튜닝(§92 합성구도·§101-b 배경인물·§113-a 대담게스트·
// §139 위치·§168-b 착석·§170-c 발언자)이 전부 이 프로그램에서 나왔다. 모델·프롬프트를
// 바꿀 때 "그 튜닝이 여전히 유효한가"를 재는 것이 이 셋의 목적이다.
//
// 주의: 이 셋은 **비전 판정만** 잰다. 실기 F1(후보 생성·회수·재스냅 포함)의 대체가 아니다.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";

// 산출물은 세션 임시 폴더가 아니라 영구 위치에 둔다 — 벤치마크는 재사용 자산이다.
const LABEL_DIR = String.raw`C:\Users\seung\Documents\Codex\2026-07-11\user-plugin\plugin\training-data\news-anchor`;
const BLIND = "C:/Users/seung/Downloads/blind";
const OUT = String.raw`C:\Users\seung\Downloads\vision-benchmark\news8`;
mkdirSync(OUT, { recursive: true });

/**
 * 런북·프롬프트 주석에 남은 과거 오판 지점. 프롬프트 문장이 각각 이 사례들을 겨냥해 들어갔으므로,
 * 문장을 지우거나 모델을 바꾸면 여기서 먼저 깨진다.
 */
const HARD = [
  { date: "20260128", time: 428, isAnchor: false, type: "대담게스트", note: "§139 — 가운데·오른쪽 인물 FP" },
  { date: "20260128", time: 456, isAnchor: false, type: "대담게스트", note: "§139 FP" },
  { date: "20260409", time: 254, isAnchor: false, type: "대담게스트", note: "§139 FP" },
  { date: "20260409", time: 282, isAnchor: false, type: "대담게스트", note: "§139 FP" },
  { date: "20260304", time: 602, isAnchor: false, type: "대담게스트", note: "§139 FP" },
  { date: "20260128", time: 687, isAnchor: true, type: "성금카드앵커", note: "§134 — 무료 띠 필터가 지웠던 진짜 앵커" },
  { date: "20260219", time: 200, isAnchor: false, type: "연단발언자", note: "§170-c — 칼럼으로 오인했던 유형(대략 지점)" },
];

const blindDates = new Map(
  readdirSync(BLIND).filter((name) => name.endsWith(".mp4")).map((name) => [name.slice(0, 8), name]),
);

const grab = (date, time, name) => {
  const source = blindDates.get(date);
  if (!source) return null;
  const path = `${OUT}\\${name}.png`;
  if (existsSync(path)) return path;
  try {
    execFileSync("ffmpeg", [
      "-loglevel", "error", "-ss", String(time), "-i", `${BLIND}/${source}`,
      "-frames:v", "1", "-vf", "scale=480:-1", "-y", path,
    ], { stdio: "pipe" });
    return existsSync(path) ? path : null;
  } catch {
    return null;
  }
};

const entries = [];
const labelFiles = readdirSync(LABEL_DIR).filter((name) => name.endsWith(".items.json") || name.endsWith(".items.corrected.json"));
// corrected가 있으면 그쪽을 쓴다(사람이 정정한 최신 라벨).
const byDate = new Map();
for (const file of labelFiles) {
  const date = file.match(/(\d{8})/)?.[1];
  if (!date || !blindDates.has(date)) continue;
  const previous = byDate.get(date);
  if (!previous || file.includes("corrected")) byDate.set(date, file);
}

const MAX_PER_EPISODE = 6;
for (const [date, file] of [...byDate.entries()].sort()) {
  const items = JSON.parse(readFileSync(`${LABEL_DIR}\\${file}`, "utf8"));
  // 회차당 상한을 둬 셋이 한쪽 회차에 쏠리지 않게 한다(48회차 × 전량이면 수천 장).
  const step = Math.max(1, Math.floor(items.length / MAX_PER_EPISODE));
  for (let index = 0; index < items.length; index += step) {
    const item = items[index];
    if (!item) continue;
    const positiveName = `${date}_pos_${index}`;
    if (grab(date, item.start + 1.2, positiveName)) {
      entries.push({ file: `${positiveName}.png`, date, time: item.start + 1.2, isAnchor: true, type: "앵커샷" });
    }
    const span = item.end - item.start;
    if (span >= 50) {
      const negativeName = `${date}_neg_${index}`;
      if (grab(date, item.start + span / 2, negativeName)) {
        entries.push({ file: `${negativeName}.png`, date, time: item.start + span / 2, isAnchor: false, type: "리포트본문" });
      }
    }
  }
}

for (const [index, hard] of HARD.entries()) {
  const name = `${hard.date}_hard_${index}`;
  if (!grab(hard.date, hard.time, name)) continue;
  entries.push({ file: `${name}.png`, date: hard.date, time: hard.time, isAnchor: hard.isAnchor, type: hard.type, note: hard.note, hard: true });
}

writeFileSync(`${OUT}\\manifest.json`, JSON.stringify(entries, null, 2), "utf8");
const positives = entries.filter((entry) => entry.isAnchor).length;
console.log(`8뉴스 벤치마크 ${entries.length}장 — 양성 ${positives} · 음성 ${entries.length - positives} · 어려운 표본 ${entries.filter((entry) => entry.hard).length} (회차 ${byDate.size})`);
