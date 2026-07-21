// 참조 뱅크 템플릿 추출 — 검증된 앵커 리드 시각의 144셀 그리드를 캐시에서 뽑아 TS 리터럴로 출력.
// 사용법: node extract-refs.mjs <에피소드>:<시각,시각,...> [...]  (각 시각과 +2s 샘플을 중복 없이 수집)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./lib.mjs";

const specs = process.argv.slice(2);
if (specs.length === 0) {
  console.log("사용법: node extract-refs.mjs <에피소드>:<시각,...> [...]");
  process.exit(1);
}
const grids = [];
for (const spec of specs) {
  const [name, timesRaw] = spec.split(":");
  const samples = JSON.parse(await readFile(path.join(DATA_DIR, `${name}.json`), "utf8")).filter((sample) => sample.grid);
  const used = new Set();
  for (const timeRaw of timesRaw.split(",")) {
    const anchor = Number(timeRaw);
    for (const target of [anchor + 0.5, anchor + 2.5]) {
      let best = 0;
      for (let index = 1; index < samples.length; index += 1) {
        if (Math.abs(samples[index].time - target) < Math.abs(samples[best].time - target)) best = index;
      }
      if (Math.abs(samples[best].time - anchor) > 4.5 || used.has(best)) continue;
      used.add(best);
      grids.push({ episode: name, time: samples[best].time, grid: samples[best].grid });
    }
  }
}
console.log(`// 추출 ${grids.length}장: ${grids.map((entry) => `${entry.episode.replace("Train_KBC_", "")}@${entry.time}`).join(" ")}`);
const row = (grid) => grid.map((value) => Math.round(value)).join(", ");
for (const entry of grids) console.log(`  [${row(entry.grid)}],`);
