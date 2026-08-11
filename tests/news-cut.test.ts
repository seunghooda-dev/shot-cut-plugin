// news-cut — 보도 아이템 응답 정규화·앵커 샷 스냅·이름 규칙·목록 표기 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeNewsItem,
  findShotSegments,
  NEWS_ITEM_SEQUENCE_PATTERN,
  NEWS_ITEM_TITLE_MAX,
  newsItemName,
  nextNewsItemIndex,
  normalizeNewsItems,
  sanitizeNewsItemTitle,
  mergeShortItemsForward,
  snapItemsToAnchorStarts,
  splitItemsAtInteriorAnchors,
} from "../src/news-cut";
import type { SubtitleDocument } from "../src/subtitles";

function doc(): SubtitleDocument {
  const cue = (cueId: string, start: number, end: number) => ({
    cueId,
    start,
    end,
    text: `${cueId} 텍스트`,
    enabled: true,
    hidden: false,
    words: [{ wordId: `w-${cueId}`, s: start, e: end, t: `${cueId} 텍스트`, hidden: false }],
  });
  return {
    version: 1,
    projectKey: "news-test",
    cues: [cue("c1", 0, 30), cue("c2", 30, 90), cue("c3", 90, 200), cue("c4", 200, 320), cue("c5", 320, 400)],
  };
}

describe("normalizeNewsItems", () => {
  it("resolves cueId boundaries to times and keeps chronological order", () => {
    const items = normalizeNewsItems({
      items: [
        { startCueId: "c3", endCueId: "c4", title: "둘째 보도" },
        { startCueId: "c1", endCueId: "c2", title: "첫 보도" },
      ],
    }, doc());
    assert.deepEqual(items, [
      { start: 0, end: 90, title: "첫 보도" },
      { start: 90, end: 320, title: "둘째 보도" },
    ]);
  });

  it("drops unknown cueIds, inverted ranges, and too-short items", () => {
    const items = normalizeNewsItems({
      items: [
        { startCueId: "cX", endCueId: "c2", title: "없는 큐" },
        { startCueId: "c3", endCueId: "c1", title: "역전" },
        { startCueId: "c5", endCueId: "c5", title: "80초" },
        { startCueId: "c1", endCueId: "c1", title: "30초" },
      ],
    }, doc(), 60);
    assert.deepEqual(items.map((item) => item.title), ["80초"]);
  });

  it("snaps overlapping starts to the previous end and fills empty titles", () => {
    const items = normalizeNewsItems({
      items: [
        { startCueId: "c1", endCueId: "c3", title: " " },
        { startCueId: "c2", endCueId: "c5", title: "겹침" },
      ],
    }, doc());
    assert.equal(items[0]!.title, "아이템 1");
    assert.equal(items[0]!.end, 200);
    assert.equal(items[1]!.start, 200); // 30(c2 시작)이 아니라 앞 아이템 끝으로 스냅
    assert.equal(items[1]!.end, 400);
  });

  it("tolerates junk payloads", () => {
    assert.deepEqual(normalizeNewsItems(null, doc()), []);
    assert.deepEqual(normalizeNewsItems({ items: "x" }, doc()), []);
    assert.deepEqual(normalizeNewsItems({ items: [null, 7, { title: "만" }] }, doc()), []);
  });
});

describe("findShotSegments", () => {
  const grid = (value: number): Float64Array => new Float64Array(4).fill(value);

  it("splits samples into shots at large luma jumps", () => {
    const shots = findShotSegments([
      { time: 0, grid: grid(50) },
      { time: 0.5, grid: grid(51) },
      { time: 1, grid: grid(200) }, // 컷
      { time: 1.5, grid: grid(201) },
      { time: 2, grid: grid(60) }, // 컷
    ]);
    assert.deepEqual(shots.map((shot) => [shot.start, shot.end]), [[0, 1], [1, 2], [2, 2]]);
    assert.equal(shots[0]!.midTime, 0.5);
  });

  it("treats missing grids as cut boundaries and tolerates empty input", () => {
    const shots = findShotSegments([
      { time: 0, grid: grid(50) },
      { time: 0.5, grid: null },
      { time: 1, grid: grid(50) },
    ]);
    assert.equal(shots.length, 3);
    assert.deepEqual(findShotSegments([]), []);
  });
});

describe("snapItemsToAnchorStarts", () => {
  it("snaps starts exactly at the anchor cut, chains ends, and keeps text boundaries when null", () => {
    const items = [
      { start: 60, end: 200, title: "하나" },
      { start: 205, end: 300, title: "둘" },
      { start: 320, end: 400, title: "셋" },
    ];
    const snapped = snapItemsToAnchorStarts(items, [63.5, null, 318]);
    assert.deepEqual(snapped, [
      { start: 63.5, end: 205, title: "하나" },
      { start: 205, end: 318, title: "둘" },
      { start: 318, end: 400, title: "셋" },
    ]);
  });

  it("rounds the snapped start to 0.1s and clamps at zero", () => {
    const snapped = snapItemsToAnchorStarts([{ start: 1, end: 30, title: "첫" }], [0.04]);
    assert.deepEqual(snapped, [{ start: 0, end: 30, title: "첫" }]);
  });

  it("drops items whose snapped range collapses", () => {
    const snapped = snapItemsToAnchorStarts(
      [{ start: 10, end: 40, title: "a" }, { start: 30, end: 90, title: "b" }],
      [35, 20],
    );
    // 첫 아이템 시작 35, 끝 = 다음 시작 20 → 붕괴 → 드롭
    assert.deepEqual(snapped.map((item) => item.title), ["b"]);
  });
});

describe("splitItemsAtInteriorAnchors", () => {
  const titleAt = (time: number) => `시각 ${time} 문장`;

  it("splits merged items at interior anchor cuts and titles the new pieces", () => {
    const items = [
      { start: 349.6, end: 646.7, title: "병합 기사" },
      { start: 646.7, end: 691.4, title: "정상 기사" },
    ];
    const split = splitItemsAtInteriorAnchors(items, [[532.1], []], titleAt);
    assert.deepEqual(split, [
      { start: 349.6, end: 532.1, title: "병합 기사" },
      { start: 532.1, end: 646.7, title: "시각 532.1 문장" },
      { start: 646.7, end: 691.4, title: "정상 기사" },
    ]);
  });

  it("ignores cuts too close to the edges and handles multiple cuts", () => {
    const items = [{ start: 0, end: 300, title: "긴 기사" }];
    const split = splitItemsAtInteriorAnchors(items, [[5, 100, 108, 200, 295]], titleAt);
    // 5(시작 15초 이내)·108(직전 조각과 15초 미만)·295(끝 15초 이내)는 무시
    assert.deepEqual(split.map((item) => [item.start, item.end]), [[0, 100], [100, 200], [200, 300]]);
  });

  it("returns items unchanged when no interior cuts exist", () => {
    const items = [{ start: 0, end: 200, title: "그대로" }];
    assert.deepEqual(splitItemsAtInteriorAnchors(items, [[]], titleAt), items);
  });
});

describe("mergeShortItemsForward", () => {
  it("merges a short lead fragment into the next item keeping the lead title", () => {
    const merged = mergeShortItemsForward([
      { start: 533.7, end: 541.4, title: "민영배 시장 첫 국무회의 참석" },
      { start: 541.4, end: 600.2, title: "국무회의 상시 배석" },
      { start: 600.2, end: 651.8, title: "국비 확보 기대" },
    ]);
    assert.deepEqual(merged, [
      { start: 533.7, end: 600.2, title: "민영배 시장 첫 국무회의 참석" },
      { start: 600.2, end: 651.8, title: "국비 확보 기대" },
    ]);
  });

  it("chains consecutive short fragments and absorbs a short tail backwards", () => {
    const merged = mergeShortItemsForward([
      { start: 0, end: 8, title: "리드 A" },
      { start: 8, end: 14, title: "리드 B" },
      { start: 14, end: 60, title: "본 리포트" },
      { start: 60, end: 100, title: "정상" },
      { start: 100, end: 108, title: "짧은 꼬리" },
    ]);
    assert.deepEqual(merged, [
      { start: 0, end: 60, title: "리드 A" },
      { start: 60, end: 108, title: "정상" },
    ]);
  });

  it("keeps items at or above the minimum untouched", () => {
    const items = [{ start: 0, end: 15, title: "딱 15초" }, { start: 15, end: 45, title: "30초" }];
    assert.deepEqual(mergeShortItemsForward(items), items);
  });
});

describe("newsItemName + describeNewsItem", () => {
  it("formats YYYYMMDD_news_NN starting at 00 and mm:ss ranges", () => {
    const date = new Date(2026, 6, 15, 3, 4, 5);
    assert.equal(newsItemName(date, 0), "20260715_news_00");
    assert.equal(newsItemName(date, 11), "20260715_news_11");
    assert.equal(
      describeNewsItem({ start: 65, end: 130, title: "제목" }, 3),
      "03 · 01:05~02:10 · 제목",
    );
  });

  it("continues numbering after same-day sequences and ignores other names", () => {
    const date = new Date(2026, 6, 15);
    assert.equal(nextNewsItemIndex([], date), 0);
    assert.equal(
      nextNewsItemIndex(["20260715_news_00", "20260715_news_09", "20260714_news_30", "20260715_news_ab", "기타"], date),
      10,
    );
  });
});

describe("nextNewsItemIndex — ' 2' 접미 고아 반영(§184 감사 #12)", () => {
  it("' 2' 고아만 남아도 그 번호를 건너뛴다 — 동명 쌍 재발 방지", () => {
    const date = new Date(2026, 6, 30);
    assert.equal(nextNewsItemIndex(["20260730_news_03 2"], date), 4);
    assert.equal(nextNewsItemIndex(["20260730_news_01", "20260730_news_03 2"], date), 4);
  });
});

describe("NEWS_ITEM_SEQUENCE_PATTERN (§184 · §CUE-4)", () => {
  it("정상 아이템과 클론 재시도의 ' 2' 접미 고아를 모두 매치한다", () => {
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_00"), true);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_03 2"), true);
  });

  // §CUE-4에서 **의도적으로 넓혔다.** 제품이 `_제목`을 붙여 만드는 이상 정리(삭제)와 개수
  // 계산이 그 이름을 못 보면 산출물이 지워지지 않고 프로젝트에 쌓인다. 넓힌 범위는
  // `YYYYMMDD_news_NN_` 이하로 제품이 소유하는 이름 공간뿐이다.
  it("기사제목 꼬리표가 붙은 산출물도 매치한다 — 안 그러면 정리에서 새어 나간다", () => {
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_00_여수산단 도로"), true);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_00_여수산단 도로 2"), true);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_00_final"), true);
  });

  it("사용자 시퀀스류는 매치하지 않는다 — 파괴적 정리의 오폭 방지", () => {
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("내 편집본"), false);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_"), false);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_news_00_"), false);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("x20260730_news_00"), false);
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test("20260730_뉴스_00_제목"), false);
  });
});

describe("sanitizeNewsItemTitle + 제목 붙은 이름 (§CUE-4)", () => {
  it("파일명 금지 문자와 제어문자를 걷고 공백을 정리한다", () => {
    assert.equal(sanitizeNewsItemTitle("여수산단  도로"), "여수산단 도로");
    assert.equal(sanitizeNewsItemTitle('집단/식중독:"확산"'), "집단 식중독 확산");
    assert.equal(sanitizeNewsItemTitle("석면\u0009제거\u0007공사"), "석면 제거 공사");
    // 하이픈은 파일명에서 합법이라 살아남아야 한다 — 문자군을 잘못 쓰면 조용히 사라진다.
    assert.equal(sanitizeNewsItemTitle("코로나-19 확산"), "코로나-19 확산");
  });

  it("남는 것이 없으면 빈 문자열이고, 그때 이름은 종전 그대로다", () => {
    const date = new Date(2026, 6, 15);
    assert.equal(sanitizeNewsItemTitle("   "), "");
    assert.equal(sanitizeNewsItemTitle("///"), "");
    assert.equal(newsItemName(date, 2, "  "), "20260715_news_02");
    assert.equal(newsItemName(date, 2), "20260715_news_02");
  });

  it("길이를 자른 뒤 끝에 남은 공백·마침표를 떼어 낸다 — 파일명이 시퀀스명과 갈리지 않게", () => {
    const long = `${"가".repeat(NEWS_ITEM_TITLE_MAX - 1)} 나`;
    const cut = sanitizeNewsItemTitle(long);
    assert.equal(cut, "가".repeat(NEWS_ITEM_TITLE_MAX - 1));
    assert.ok(cut.length <= NEWS_ITEM_TITLE_MAX);
    assert.equal(sanitizeNewsItemTitle(`${"나".repeat(NEWS_ITEM_TITLE_MAX)}...`).endsWith("."), false);
  });

  it("제목이 있으면 번호 뒤에 붙고, 번호 규약은 그대로다", () => {
    const date = new Date(2026, 6, 15);
    assert.equal(newsItemName(date, 0, "여수산단 도로"), "20260715_news_00_여수산단 도로");
    assert.equal(NEWS_ITEM_SEQUENCE_PATTERN.test(newsItemName(date, 0, "여수산단 도로")), true);
  });

  it("제목이 붙은 기존 시퀀스도 다음 번호 계산에 반영된다 — 동명 쌍 재발 방지", () => {
    const date = new Date(2026, 6, 15);
    assert.equal(nextNewsItemIndex(["20260715_news_03_여수산단 도로"], date), 4);
    assert.equal(nextNewsItemIndex(["20260715_news_03_여수산단 도로 2"], date), 4);
  });
});
