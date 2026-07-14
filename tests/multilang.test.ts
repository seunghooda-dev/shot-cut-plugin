// multilang — 대상 언어 정의·파일명·매니페스트 빌더 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MULTILANG_TARGETS,
  buildMultilangManifest,
  multilangManifestFileName,
  multilangSrtFileName,
  multilangTargetByCode,
} from "../src/multilang";

describe("multilang", () => {
  it("keeps target codes unique and resolvable", () => {
    const codes = MULTILANG_TARGETS.map((target) => target.code);
    assert.equal(new Set(codes).size, codes.length);
    assert.equal(multilangTargetByCode("ja")?.koreanName, "일본어");
    assert.equal(multilangTargetByCode("xx"), null);
  });

  it("builds sanitized per-language SRT and manifest file names", () => {
    assert.equal(multilangSrtFileName("뉴스와이드 숏폼", "en"), "뉴스와이드 숏폼.en.srt");
    assert.match(multilangSrtFileName("   ", "ja"), /^ShortFlow\.ja\.srt$/u);
    assert.equal(multilangManifestFileName("뉴스와이드 숏폼"), "뉴스와이드 숏폼.multilang.md");
  });

  it("lists successes and failures in the manifest", () => {
    const manifest = buildMultilangManifest(
      "테스트",
      "20260715T040000",
      [{ code: "en", koreanName: "영어", file: "테스트.en.srt", cueCount: 12 }],
      [{ code: "ja", koreanName: "일본어", error: "시간 초과" }],
    );
    assert.match(manifest, /영어 \(en\) — 테스트\.en\.srt · 큐 12개/u);
    assert.match(manifest, /## 실패한 언어/u);
    assert.match(manifest, /일본어 \(ja\) — 시간 초과/u);
    const empty = buildMultilangManifest("테스트", "t", [], []);
    assert.match(empty, /- \(없음\)/u);
    assert.doesNotMatch(empty, /실패한 언어/u);
  });
});
