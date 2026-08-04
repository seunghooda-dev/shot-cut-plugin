// 모닝와이드 참조 뱅크의 형식 명세 — 8뉴스 뱅크와 같은 16×9 luma 격자 계약을 고정한다.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MORNING_WIDE_REFERENCE_GRIDS,
  MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT,
} from "../src/morning-wide-reference-grids";
import { buildAnchorMatcher } from "../src/news-visual-cut";

const BANKS: Array<[string, ReadonlyArray<readonly number[]>]> = [
  ["분할 구도", MORNING_WIDE_REFERENCE_GRIDS],
  ["풀샷 구도", MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT],
];

describe("MORNING_WIDE_REFERENCE_GRIDS", () => {
  for (const [label, bank] of BANKS) {
    it(`${label}: 모든 격자가 16×9=144 셀·0~255 정수다 — buildAnchorMatcher 입력 계약`, () => {
      assert.ok(bank.length >= 8, `참조가 너무 적습니다: ${bank.length}`);
      for (const grid of bank) {
        assert.equal(grid.length, 144);
        for (const cell of grid) {
          assert.ok(Number.isInteger(cell) && cell >= 0 && cell <= 255, `격자 값 범위 밖: ${cell}`);
        }
      }
    });

    it(`${label}: 매처를 만들 수 있고 자기 자신과의 거리가 0에 가깝다`, () => {
      const matcher = buildAnchorMatcher(bank);
      const self = Float64Array.from(bank[0]!);
      assert.ok(matcher.distance(self) < 0.05, `자기 거리 과대: ${matcher.distance(self)}`);
    });
  }

  // A/B 실측(2026-08-04): 두 계열을 한 매처로 합치면 셀별 분산이 커져 변별력이 떨어진다
  // (7/24 F1 97.3 → 88.2). 계열이 실제로 서로 다름을 수치로 고정해 합본 회귀를 막는다.
  it("두 계열은 서로 먼 별개 포맷이다 — 합본 금지 근거", () => {
    const splitMatcher = buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS);
    const crossDistance = MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT
      .map((grid) => splitMatcher.distance(Float64Array.from(grid)))
      .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
    assert.ok(crossDistance > 0.05, `계열 간 거리가 너무 가깝습니다: ${crossDistance}`);
  });
});
