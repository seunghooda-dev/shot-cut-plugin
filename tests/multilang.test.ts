// multilang — 대상 언어 정의·파일명·내보내기 전용 번역 검증·매니페스트 빌더 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MULTILANG_TARGETS,
  buildMultilangManifest,
  multilangManifestFileName,
  multilangSrtFileName,
  multilangTargetByCode,
  translatedCuesToSrt,
  validateTranslatedCuesForExport,
} from "../src/multilang";
import type { SubtitleDocument } from "../src/subtitles";

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

describe("validateTranslatedCuesForExport + translatedCuesToSrt", () => {
  const original: SubtitleDocument = {
    version: 1,
    projectKey: "ml-test",
    cues: [
      { cueId: "c1", start: 40, end: 46, text: "첫 큐", enabled: true, hidden: false, words: [{ wordId: "w1", s: 40, e: 46, t: "첫 큐", hidden: false }] },
      { cueId: "c2", start: 60, end: 66, text: "둘째 큐", enabled: true, hidden: false, words: [{ wordId: "w2", s: 60, e: 66, t: "둘째 큐", hidden: false }] },
    ],
  };
  const translated = (overrides?: Array<Record<string, unknown>>) => ({
    document: {
      version: 1,
      projectKey: "ml-test",
      cues: overrides ?? [
        // 무공백 언어 응답 시나리오 — 단어 토큰이 원본과 달라도(없어도) 통과해야 한다.
        { cueId: "c1", start: 40, end: 46, text: "苦情が急増しました" },
        { cueId: "c2", start: 60, end: 66, text: "点検班を編成しました", words: [] },
      ],
    },
  });

  it("caps a runaway translated cue at 2,000 characters (§185 심층 방어 명세)", () => {
    // 모델이 폭주해 초장문을 돌려줘도 SRT 큐가 무제한으로 커지지 않는다 — 절단은 의도된 동작.
    const runaway = validateTranslatedCuesForExport(translated([
      { cueId: "c1", start: 40, end: 46, text: "あ".repeat(2_500) },
      { cueId: "c2", start: 60, end: 66, text: "点検" },
    ]).document, original);
    assert.equal(runaway[0]!.text.length, 2_000);
  });

  it("excludes hidden and disabled cues to match the Korean SRT filter (§185)", () => {
    // buildSrt는 숨김·비활성 큐를 빼는데 번역 SRT가 전부 포함하면 두 언어의 큐 집합이 어긋난다.
    const withHidden: SubtitleDocument = {
      version: 1,
      projectKey: "ml-test",
      cues: [
        { ...original.cues[0]!, hidden: true },
        original.cues[1]!,
      ],
    };
    const result = validateTranslatedCuesForExport(translated().document, withHidden);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.text, "点検班を編成しました");
  });

  it("accepts word-less translated cues and preserves original timings (ja/zh 대응)", () => {
    const direct = validateTranslatedCuesForExport(translated().document, original);
    const wrappedJson = validateTranslatedCuesForExport(JSON.stringify(translated()), original);
    assert.deepEqual(direct, wrappedJson);
    assert.equal(direct.length, 2);
    assert.equal(direct[0]!.text, "苦情が急増しました");
    assert.equal(direct[0]!.start, 40);
    const srt = translatedCuesToSrt(direct);
    assert.match(srt, /^1\n00:00:40,000 --> 00:00:46,000\n苦情が急増しました\n\n2\n/u);
    assert.equal(translatedCuesToSrt([]), "");
  });

  it("rejects cue count, cueId, timing, and blank-text drift", () => {
    assert.throws(() => validateTranslatedCuesForExport({ cues: [] }, original), /큐 개수/u);
    assert.throws(
      () => validateTranslatedCuesForExport(translated([
        { cueId: "cX", start: 40, end: 46, text: "a" },
        { cueId: "c2", start: 60, end: 66, text: "b" },
      ]).document, original),
      /cueId/u,
    );
    assert.throws(
      () => validateTranslatedCuesForExport(translated([
        { cueId: "c1", start: 41.5, end: 46, text: "a" },
        { cueId: "c2", start: 60, end: 66, text: "b" },
      ]).document, original),
      /시간/u,
    );
    assert.throws(
      () => validateTranslatedCuesForExport(translated([
        { cueId: "c1", start: 40, end: 46, text: "   " },
        { cueId: "c2", start: 60, end: 66, text: "b" },
      ]).document, original),
      /비어/u,
    );
  });
});
