// news-cut — 보도 아이템 응답 정규화·이름 규칙·목록 표기 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeNewsItem, newsItemName, normalizeNewsItems } from "../src/news-cut";
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
});
