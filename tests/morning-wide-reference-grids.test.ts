// 모닝와이드 참조 뱅크의 형식 명세 — 8뉴스 뱅크와 같은 16×9 luma 격자 계약을 고정한다.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MORNING_WIDE_REFERENCE_GRIDS } from "../src/morning-wide-reference-grids";
import { buildAnchorMatcher } from "../src/news-visual-cut";

describe("MORNING_WIDE_REFERENCE_GRIDS", () => {
  it("모든 격자가 16×9=144 셀·0~255 정수다 — buildAnchorMatcher 입력 계약", () => {
    assert.ok(MORNING_WIDE_REFERENCE_GRIDS.length >= 10, `참조가 너무 적습니다: ${MORNING_WIDE_REFERENCE_GRIDS.length}`);
    for (const grid of MORNING_WIDE_REFERENCE_GRIDS) {
      assert.equal(grid.length, 144);
      for (const cell of grid) {
        assert.ok(Number.isInteger(cell) && cell >= 0 && cell <= 255, `격자 값 범위 밖: ${cell}`);
      }
    }
  });

  it("매처를 만들 수 있고 자기 자신과의 거리가 0에 가깝다", () => {
    const matcher = buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS);
    const self = Float64Array.from(MORNING_WIDE_REFERENCE_GRIDS[0]!);
    assert.ok(matcher.distance(self) < 0.05, `자기 거리 과대: ${matcher.distance(self)}`);
  });
});
