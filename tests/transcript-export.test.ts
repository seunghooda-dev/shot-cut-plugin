// buildPremiereTranscript — 자막 문서 → Premiere 트랜스크립트 JSON 변환 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPremiereTranscript } from "../src/transcript-export";
import type { SubtitleCue, SubtitleDocument, SubtitleWord } from "../src/subtitles";

const FIXED_UUID = "11111111-2222-4333-8444-555555555555";

function word(t: string, s: number, e: number, hidden = false): SubtitleWord {
  return { wordId: `w-${t}-${s}`, s, e, t, hidden };
}

function cue(overrides: Partial<SubtitleCue> & { cueId: string }): SubtitleCue {
  return {
    start: 0,
    end: 1,
    text: "기본",
    enabled: true,
    hidden: false,
    words: [word("기본", 0, 1)],
    ...overrides,
  };
}

function doc(cues: SubtitleCue[]): SubtitleDocument {
  return { version: 1, projectKey: "transcript-test", cues };
}

interface ParsedTranscript {
  language: string;
  speakers: Array<{ id: string; name: string }>;
  segments: Array<{
    start: number;
    duration: number;
    language: string;
    speaker: string;
    words: Array<{ confidence: number; duration: number; eos: boolean; start: number; tags: string[]; text: string; type: string }>;
  }>;
}

describe("buildPremiereTranscript", () => {
  it("converts cues/words with eos on the last word of each cue", () => {
    const document = doc([
      cue({ cueId: "c1", start: 0.5, end: 3, text: "첫 자막", words: [word("첫", 0.5, 1.2), word("자막", 1.4, 3)] }),
      cue({ cueId: "c2", start: 3.5, end: 5, text: "둘째", words: [word("둘째", 3.5, 5)] }),
    ]);
    const built = buildPremiereTranscript(document, { uuid: () => FIXED_UUID });
    assert.equal(built.segmentCount, 2);
    assert.equal(built.wordCount, 3);
    const parsed = JSON.parse(built.json) as ParsedTranscript;
    assert.equal(parsed.language, "ko-kr");
    assert.deepEqual(parsed.speakers, [{ id: FIXED_UUID, name: "화자 1" }]);
    const [first, second] = parsed.segments;
    assert.equal(first!.start, 0.5);
    assert.equal(first!.duration, 2.5);
    assert.equal(first!.speaker, FIXED_UUID);
    assert.deepEqual(first!.words.map((item) => item.eos), [false, true]);
    assert.deepEqual(first!.words.map((item) => item.text), ["첫", "자막"]);
    assert.equal(first!.words[0]!.duration, 1.2 - 0.5);
    assert.equal(first!.words[0]!.type, "word");
    assert.deepEqual(first!.words[0]!.tags, []);
    assert.equal(second!.words[0]!.eos, true);
  });

  it("skips disabled/hidden/empty cues and hidden words", () => {
    const document = doc([
      cue({ cueId: "off", enabled: false }),
      cue({ cueId: "hide", hidden: true }),
      cue({ cueId: "blank", text: "   ", words: [] }),
      cue({
        cueId: "mixed",
        start: 1,
        end: 4,
        text: "보임 숨김",
        words: [word("보임", 1, 2), word("숨김", 2, 4, true)],
      }),
    ]);
    const built = buildPremiereTranscript(document, { uuid: () => FIXED_UUID });
    assert.equal(built.segmentCount, 1);
    assert.equal(built.wordCount, 1);
    const parsed = JSON.parse(built.json) as ParsedTranscript;
    assert.deepEqual(parsed.segments[0]!.words.map((item) => item.text), ["보임"]);
    assert.equal(parsed.segments[0]!.words[0]!.eos, true);
  });

  it("falls back to one cue-level word when every word is hidden", () => {
    const document = doc([
      cue({ cueId: "all-hidden", start: 2, end: 6, text: "큐 텍스트", words: [word("숨김", 2, 6, true)] }),
    ]);
    const built = buildPremiereTranscript(document, { uuid: () => FIXED_UUID });
    assert.equal(built.wordCount, 1);
    const segment = (JSON.parse(built.json) as ParsedTranscript).segments[0]!;
    assert.deepEqual(segment.words.map((item) => item.text), ["큐 텍스트"]);
    assert.equal(segment.words[0]!.start, 2);
    assert.equal(segment.words[0]!.duration, 4);
  });

  it("normalizes language/speaker options and clamps zero durations", () => {
    const document = doc([
      cue({ cueId: "zero", start: 1, end: 1, text: "순간", words: [word("순간", 1, 1)] }),
    ]);
    const built = buildPremiereTranscript(document, {
      language: " EN-US ",
      speakerName: "  진행자 ",
      uuid: () => FIXED_UUID,
    });
    const parsed = JSON.parse(built.json) as ParsedTranscript;
    assert.equal(parsed.language, "en-us");
    assert.equal(parsed.segments[0]!.language, "en-us");
    assert.equal(parsed.speakers[0]!.name, "진행자");
    assert.equal(parsed.segments[0]!.duration, 0.001);
    assert.equal(parsed.segments[0]!.words[0]!.duration, 0.001);
  });

  it("returns an empty transcript for an empty document", () => {
    const built = buildPremiereTranscript(doc([]), { uuid: () => FIXED_UUID });
    assert.equal(built.segmentCount, 0);
    assert.equal(built.wordCount, 0);
    assert.deepEqual((JSON.parse(built.json) as ParsedTranscript).segments, []);
  });
});
