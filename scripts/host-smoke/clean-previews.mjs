// 배치가 만든 폐기용 프로젝트의 Premiere 오디오 프리뷰 캐시만 골라 지운다.
import { readdir, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const CACHE_DIR = join(homedir(), "Documents", "Adobe", "Premiere Pro", "26.0", "Adobe Premiere Pro Audio Previews");

// 배치 산물만 대상으로 한다 — 사용자의 실제 프로젝트 프리뷰는 건드리지 않는다.
// 활성 프로젝트의 폴더는 Premiere가 잠그고 있어 삭제가 실패하므로, 그 자체가 안전장치다.
const BATCH_PATTERNS = [/^ShortFlow_Chain_/u, /^ShortFlow_HostSmoke_/u];

async function dirBytes(dir) {
  let total = 0;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += await dirBytes(full);
    else { try { total += (await stat(full)).size; } catch { /* 잠긴 파일은 건너뜀 */ } }
  }
  return total;
}

const apply = process.argv.includes("--apply");

let entries;
try {
  entries = await readdir(CACHE_DIR, { withFileTypes: true });
} catch {
  console.log(`[clean-previews] 캐시 폴더가 없습니다: ${CACHE_DIR}`);
  process.exit(0);
}

const targets = entries.filter((entry) => entry.isDirectory() && BATCH_PATTERNS.some((re) => re.test(entry.name)));
if (targets.length === 0) {
  console.log("[clean-previews] 배치 산물 프리뷰가 없습니다.");
  process.exit(0);
}

let freed = 0;
let locked = 0;
for (const target of targets) {
  const full = join(CACHE_DIR, target.name);
  const bytes = await dirBytes(full);
  const gb = (bytes / 1024 ** 3).toFixed(2);
  if (!apply) {
    console.log(`  ${gb}GB  ${target.name}`);
    freed += bytes;
    continue;
  }
  try {
    await rm(full, { recursive: true, force: true });
    console.log(`  삭제 ${gb}GB  ${target.name}`);
    freed += bytes;
  } catch {
    // 활성 프로젝트라 잠겨 있다 — 다음 회전 뒤에 지워진다.
    console.log(`  건너뜀(사용 중) ${gb}GB  ${target.name}`);
    locked += bytes;
  }
}

const freedGb = (freed / 1024 ** 3).toFixed(1);
if (apply) {
  console.log(`[clean-previews] 회수 ${freedGb}GB · 사용 중이라 남긴 것 ${(locked / 1024 ** 3).toFixed(1)}GB`);
} else {
  console.log(`[clean-previews] 대상 ${targets.length}개 · 합계 ${freedGb}GB — 실제로 지우려면 --apply`);
}
