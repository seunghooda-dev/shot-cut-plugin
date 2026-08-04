// 모닝와이드 참조 뱅크의 형식 명세 — 8뉴스 뱅크와 같은 16×9 luma 격자 계약을 고정한다.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MORNING_WIDE_REFERENCE_GRIDS,
  MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT,
  MORNING_WIDE_REFERENCE_GRIDS_LIGHT,
} from "../src/morning-wide-reference-grids";
import { buildAnchorMatcher, freeAnchorTimes } from "../src/news-visual-cut";

const BANKS: Array<[string, ReadonlyArray<readonly number[]>]> = [
  ["분할 구도", MORNING_WIDE_REFERENCE_GRIDS],
  ["풀샷 구도", MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT],
  ["밝은 재킷", MORNING_WIDE_REFERENCE_GRIDS_LIGHT],
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

  // 확정 합집합(2026-08-04) — 자동 임계만 쓰면 후보 거리가 촘촘한 회차에서 대부분이 잘린다.
  // 상한을 주면 그 후보들이 살아나고, 주지 않으면 종전과 완전히 같아야 한다(8뉴스 경로 불변).
  it("unionMaxRefDist를 주면 자동 임계가 자른 저거리 후보가 살아나고, 없으면 종전과 같다", () => {
    // 자동 임계가 **앞쪽 간극**에 걸려 5개만 남기는 상황(모닝와이드 7/28의 축소판) — 뒤쪽
    // 후보들은 거리가 촘촘해 분리점이 없고, 마지막 비앵커는 midpoint>0.2라 간극 후보에서 빠진다.
    const candidates = [
      { time: 10, refDist: 0.010, kind: "shot" as const },
      { time: 40, refDist: 0.012, kind: "shot" as const },
      { time: 70, refDist: 0.014, kind: "shot" as const },
      { time: 100, refDist: 0.016, kind: "shot" as const },
      { time: 130, refDist: 0.018, kind: "shot" as const },
      { time: 160, refDist: 0.060, kind: "shot" as const },
      { time: 190, refDist: 0.062, kind: "shot" as const },
      { time: 220, refDist: 0.064, kind: "shot" as const },
      { time: 280, refDist: 0.066, kind: "shot" as const },
      { time: 310, refDist: 0.068, kind: "shot" as const },
      { time: 340, refDist: 0.070, kind: "shot" as const },
      { time: 400, refDist: 0.500, kind: "shot" as const },
    ];
    const baseline = freeAnchorTimes(candidates);
    const widened = freeAnchorTimes(candidates, { unionMaxRefDist: 0.08 });
    assert.deepEqual(freeAnchorTimes(candidates, {}), baseline, "옵션 미지정은 종전과 동일해야 한다");
    assert.ok(widened.length > baseline.length, `합집합이 후보를 늘려야 한다: ${baseline.length} → ${widened.length}`);
    for (const time of [160, 190, 220, 280, 310, 340]) {
      assert.ok(widened.includes(time), `상한 안의 후보 ${time}이 채택돼야 한다`);
    }
    assert.ok(!widened.includes(400), "상한 밖 후보는 그대로 배제돼야 한다");
  });

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
