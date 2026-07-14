// resolveSubjectFocal — 인물 감지 점들을 컷 초점으로 종합하는 순수 로직 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SUBJECT_FOCAL_OPTIONS, resolveSubjectFocal } from "../src/subject-focus";

const pt = (x: number, y = 0.3, confidence = 0.9) => ({ x, y, confidence });

describe("resolveSubjectFocal", () => {
  it("averages agreeing samples (stable subject position)", () => {
    assert.deepEqual(resolveSubjectFocal([pt(0.6), pt(0.62), pt(0.64)]), { x: 0.62, y: 0.3 });
  });

  it("compromises at x=0.5 when samples disagree (camera cuts)", () => {
    const focal = resolveSubjectFocal([pt(0.3), pt(0.75), pt(0.32)]);
    assert.equal(focal!.x, 0.5);
    assert.equal(focal!.y, 0.3);
  });

  it("drops low-confidence samples before deciding", () => {
    // 저신뢰(0.1)의 극단값은 무시 → 남은 두 점 평균
    assert.deepEqual(resolveSubjectFocal([pt(0.6), pt(0.62), pt(0.05, 0.9, 0.1)]), { x: 0.61, y: 0.3 });
  });

  it("returns null when no usable samples remain", () => {
    assert.equal(resolveSubjectFocal([]), null);
    assert.equal(resolveSubjectFocal([pt(0.5, 0.5, 0.1)]), null);
    assert.equal(resolveSubjectFocal([{ x: Number.NaN, y: 0.5, confidence: 0.9 }]), null);
  });

  it("clamps out-of-range coordinates into 0..1", () => {
    assert.deepEqual(resolveSubjectFocal([pt(1.4, -0.2)]), { x: 1, y: 0 });
  });

  it("is deterministic and exposes sane defaults", () => {
    const samples = [pt(0.41), pt(0.45)];
    assert.deepEqual(resolveSubjectFocal(samples), resolveSubjectFocal(samples));
    assert.equal(DEFAULT_SUBJECT_FOCAL_OPTIONS.minConfidence, 0.3);
    assert.equal(DEFAULT_SUBJECT_FOCAL_OPTIONS.agreementSpread, 0.2);
  });
});
