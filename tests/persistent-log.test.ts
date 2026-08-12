// 지속 로그 거동 테스트 — 가짜 폴더로 기록·이어받기·보존기한 정리·실패 무해성을 검증한다
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PersistentLog, type PersistentLogFolder, type PersistentLogFolderEntry } from "../src/persistent-log";

interface FakeFile extends PersistentLogFolderEntry {
  name: string;
  content: string;
  deleted: boolean;
}

function fakeFolder(initialFiles: Array<{ name: string; content: string }> = []): {
  folder: PersistentLogFolder;
  files: Map<string, FakeFile>;
} {
  const files = new Map<string, FakeFile>();
  for (const seed of initialFiles) {
    files.set(seed.name, {
      name: seed.name,
      content: seed.content,
      deleted: false,
      read: async () => files.get(seed.name)?.content ?? "",
      delete: async () => { files.get(seed.name)!.deleted = true; files.delete(seed.name); },
    });
  }
  const folder: PersistentLogFolder = {
    nativePath: "C:/fake/plugin-data",
    getEntries: async () => [...files.values()],
    getEntry: async (name: string) => {
      const found = files.get(name);
      if (!found) throw new Error("없음");
      return found;
    },
    createFile: async (name: string) => {
      const file: FakeFile = files.get(name) ?? {
        name,
        content: "",
        deleted: false,
        read: async () => files.get(name)?.content ?? "",
        delete: async () => { files.delete(name); },
      };
      file.write = async (data: string) => { file.content = data; };
      files.set(name, file);
      return file;
    },
  };
  return { folder, files };
}

const fixedNow = (iso: string) => () => new Date(iso);

describe("PersistentLog (운영 감사 — 지속 로그)", () => {
  it("기록 후 flush하면 일자별 파일에 줄이 남는다(줄바꿈 제거·레벨 표기)", async () => {
    const { folder, files } = fakeFolder();
    const log = new PersistentLog({ now: fixedNow("2026-08-12T21:00:00") });
    await log.init(folder);
    log.log("warning", "분할 실패\n두 번째 줄");
    await log.flush();
    const file = files.get("shortflow-log-20260812.log");
    assert.ok(file, "일자별 파일이 생겨야 한다");
    assert.match(file!.content, /\[WARNING\] 분할 실패 두 번째 줄/u);
    assert.match(file!.content, /세션 시작/u);
  });

  it("같은 날 기존 파일을 이어받아 이전 세션 기록이 보존된다", async () => {
    const { folder, files } = fakeFolder([
      { name: "shortflow-log-20260812.log", content: "09:00:00 [INFO] 이전 세션 기록\n" },
    ]);
    const log = new PersistentLog({ now: fixedNow("2026-08-12T21:00:00") });
    await log.init(folder);
    log.log("info", "새 세션 기록");
    await log.flush();
    const content = files.get("shortflow-log-20260812.log")!.content;
    assert.match(content, /이전 세션 기록/u);
    assert.match(content, /새 세션 기록/u);
  });

  it("보존 기한(7일)이 지난 파일은 init에서 지우고 최근 파일은 남긴다", async () => {
    const { folder, files } = fakeFolder([
      { name: "shortflow-log-20260801.log", content: "옛것" },
      { name: "shortflow-log-20260811.log", content: "어제" },
      { name: "cue-sheet_2026-08-11_mw.json", content: "무관한 파일" },
    ]);
    const log = new PersistentLog({ now: fixedNow("2026-08-12T21:00:00") });
    await log.init(folder);
    assert.ok(!files.has("shortflow-log-20260801.log"), "8일 지난 로그는 지워야 한다");
    assert.ok(files.has("shortflow-log-20260811.log"), "어제 로그는 남아야 한다");
    assert.ok(files.has("cue-sheet_2026-08-11_mw.json"), "무관한 파일은 건드리지 않는다");
  });

  it("버퍼 상한을 넘으면 오래된 줄부터 버린다", async () => {
    const { folder, files } = fakeFolder();
    const log = new PersistentLog({ now: fixedNow("2026-08-12T21:00:00"), maxLines: 100 });
    await log.init(folder);
    for (let index = 0; index < 150; index += 1) log.log("info", `줄 ${index}`);
    await log.flush();
    const linesOut = files.get("shortflow-log-20260812.log")!.content.trim().split("\n");
    assert.ok(linesOut.length <= 100, `상한 100을 넘었다: ${linesOut.length}`);
    assert.match(linesOut.at(-1)!, /줄 149/u);
    assert.ok(!linesOut.some((line) => line.includes("줄 0 ")), "가장 오래된 줄은 버려져야 한다");
  });

  it("파일 쓰기가 실패해도 던지지 않고 다음 flush가 재시도한다", async () => {
    let failures = 1;
    const { folder, files } = fakeFolder();
    const original = folder.createFile!.bind(folder);
    folder.createFile = async (name: string, options?: { overwrite?: boolean }) => {
      if (failures > 0) { failures -= 1; throw new Error("잠김"); }
      return original(name, options);
    };
    const log = new PersistentLog({ now: fixedNow("2026-08-12T21:00:00") });
    await log.init(folder);
    log.log("error", "중요 오류");
    await assert.doesNotReject(() => log.flush());
    assert.ok(!files.has("shortflow-log-20260812.log"), "첫 flush는 실패했어야 한다");
    await log.flush();
    assert.match(files.get("shortflow-log-20260812.log")!.content, /중요 오류/u);
  });
});
