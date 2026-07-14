// planHighlightCuts 순수 판단 로직 테스트 — 클러스터·확장·클램프·스냅·점수·겹침·상한·결정성
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planHighlightCuts, DEFAULT_HIGHLIGHT_CUT_OPTIONS } from "../src/highlight-cut";
import type { SubtitleCue, SubtitleDocument } from "../src/subtitles";
import type { EditOutlineSegment, SubtitleHighlight } from "../src/subtitle-controller";

function cue(
  id: string,
  start: number,
  end: number,
  text = "문장.",
  extra: Partial<SubtitleCue> = {},
): SubtitleCue {
  return { cueId: id, start, end, text, enabled: true, hidden: false, words: [], ...extra };
}

// 2초짜리 연속 cue n개(cue i: start=2i, end=2i+2, 모두 문장 종결).
function contiguousDoc(n: number, text = "문장."): SubtitleDocument {
  const cues: SubtitleCue[] = [];
  for (let i = 0; i < n; i += 1) cues.push(cue(`c${i}`, 2 * i, 2 * i + 2, text));
  return { version: 1, projectKey: "hc", cues };
}

const hl = (id: string, reason = "중요"): SubtitleHighlight => ({ cueId: id, reason });

describe("planHighlightCuts", () => {
  it("returns [] when there are no highlights", () => {
    assert.deepEqual(planHighlightCuts(contiguousDoc(5), []), []);
  });

  it("returns [] when highlights reference cues absent from the document", () => {
    assert.deepEqual(planHighlightCuts(contiguousDoc(5), [hl("nope")]), []);
  });

  it("returns [] for an empty/all-hidden document", () => {
    const doc: SubtitleDocument = {
      version: 1,
      projectKey: "hidden",
      cues: [cue("c0", 0, 2, "숨김", { hidden: true }), cue("c1", 2, 4, "꺼짐", { enabled: false })],
    };
    assert.deepEqual(planHighlightCuts(doc, [hl("c0"), hl("c1")]), []);
  });

  it("expands a short highlight toward the ideal duration and snaps to cue boundaries", () => {
    const segments = planHighlightCuts(contiguousDoc(20), [hl("c5")]);
    assert.equal(segments.length, 1);
    const s = segments[0]!;
    assert.equal(s.start, 10);
    assert.equal(s.end, 40);
    assert.equal(s.duration, 30);
    assert.equal(s.highlightCount, 1);
    // 훅(시작=하이라이트)·완결(문장 경계)·정확한 ideal 길이 → 높은 점수
    assert.ok(s.score > 0.6, `score ${s.score}`);
  });

  it("merges nearby highlights into one segment and separates far ones", () => {
    const segments = planHighlightCuts(
      contiguousDoc(20),
      [hl("c2"), hl("c3"), hl("c15")],
      null,
      { idealDuration: 8, maxDuration: 12, mergeGap: 4 },
    );
    assert.equal(segments.length, 2);
    const starts = segments.map((s) => s.start).sort((a, b) => a - b);
    assert.deepEqual(starts, [4, 30]);
    // 병합된 이른 구간은 두 하이라이트를 포함
    const early = segments.find((s) => s.start === 4)!;
    assert.equal(early.highlightCount, 2);
  });

  it("never exceeds maxDuration, even for a single over-long cue", () => {
    const doc: SubtitleDocument = { version: 1, projectKey: "long", cues: [cue("c0", 0, 80, "아주 긴 한 컷.")] };
    const s = planHighlightCuts(doc, [hl("c0")], null, { maxDuration: 60 })[0]!;
    assert.equal(s.start, 0);
    assert.equal(s.end, 60);
    assert.equal(s.duration, 60);
  });

  it("uses the outline label as the title and rewards outline alignment", () => {
    const outline: EditOutlineSegment[] = [
      { order: 1, cueIds: ["c4", "c5", "c6"], label: "핵심 주제", reason: "한 주제로 묶임" },
    ];
    const withOutline = planHighlightCuts(contiguousDoc(20), [hl("c5")], outline)[0]!;
    const without = planHighlightCuts(contiguousDoc(20), [hl("c5")], null)[0]!;
    assert.equal(withOutline.title, "핵심 주제");
    assert.ok(withOutline.score > without.score, `${withOutline.score} vs ${without.score}`);
  });

  it("drops lower-scored segments that overlap a higher-scored one", () => {
    // 겹치도록 큰 ideal. 두 하이라이트가 각각 확장되면 시간이 겹쳐 하나만 남는다.
    const segments = planHighlightCuts(
      contiguousDoc(30),
      [hl("c4"), hl("c10")],
      null,
      { idealDuration: 40, maxDuration: 50, mergeGap: 4 },
    );
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const a = segments[i]!;
        const b = segments[j]!;
        assert.ok(a.start >= b.end || b.start >= a.end, "구간이 겹치면 안 됨");
      }
    }
  });

  it("respects maxSegments", () => {
    const segments = planHighlightCuts(
      contiguousDoc(30),
      [hl("c0"), hl("c6"), hl("c12"), hl("c18"), hl("c24")],
      null,
      { idealDuration: 6, maxDuration: 10, maxSegments: 3 },
    );
    assert.equal(segments.length, 3);
  });

  it("orders results by score descending", () => {
    const segments = planHighlightCuts(
      contiguousDoc(30),
      [hl("c0"), hl("c8"), hl("c16"), hl("c24")],
      null,
      { idealDuration: 6, maxDuration: 10 },
    );
    for (let i = 1; i < segments.length; i += 1) {
      assert.ok(segments[i - 1]!.score >= segments[i]!.score, "점수 내림차순");
    }
  });

  it("is deterministic for identical input", () => {
    const doc = contiguousDoc(24);
    const highlights = [hl("c3"), hl("c11"), hl("c19")];
    assert.deepEqual(
      planHighlightCuts(doc, highlights, null, { idealDuration: 10, maxDuration: 16 }),
      planHighlightCuts(doc, highlights, null, { idealDuration: 10, maxDuration: 16 }),
    );
  });

  it("clamps out-of-order option bounds instead of misbehaving", () => {
    // minDuration>idealDuration>maxDuration로 뒤집힌 옵션도 정상 순서로 클램프.
    const s = planHighlightCuts(contiguousDoc(20), [hl("c5")], null, {
      minDuration: 100,
      idealDuration: 80,
      maxDuration: 20,
    })[0]!;
    assert.ok(s.duration <= 20, `duration ${s.duration}`);
  });

  it("exposes sane defaults", () => {
    assert.equal(DEFAULT_HIGHLIGHT_CUT_OPTIONS.idealDuration, 30);
    assert.equal(DEFAULT_HIGHLIGHT_CUT_OPTIONS.maxDuration, 60);
  });
});
