// 큐시트 파싱·검산·아이템 시작 시각 계약 — AI 응답을 신뢰하지 않는 경계를 지킨다
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCueRow,
  cueSheetChecksum,
  cueSheetItemStarts,
  parseClock,
  parseCueSheetResponse,
} from "../src/cue-sheet";

// 2026-07-13 모닝와이드 실물 큐시트(라벨과 대조해 편차 평균 6.1초를 실측한 그 회차).
const REAL_ROWS = [
  ["00:26", "00:26", "[모닝] 7/13 모닝 타이틀 + 주요뉴스"],
  ["02:23", "02:49", "반도체 클러스터 금호타이어 부지"],
  ["01:46", "04:35", "기름흔적 끝까지 쫓았다"],
  ["00:30", "05:05", "경찰 장은기 사건 수사지휘라인 조사"],
  ["02:00", "07:05", "백운산 국립공원 재추진"],
  ["00:25", "07:30", "목포권 기독교 근대역사관"],
  ["00:28", "07:58", "우리동네살리기 공모"],
  ["02:10", "10:08", "병을 고치는 병원"],
  ["00:33", "10:41", "통합의회 20조 통합 지원금"],
  ["00:28", "11:09", "여순사건 희생자 유해발굴 봉안식"],
  ["01:56", "13:05", "AI 쓰레기통 효과는?"],
  ["00:33", "13:38", "체감 33도 안팎 찜통더위"],
  ["00:23", "14:01", "영암군 현장군수실 운영 시작"],
  ["00:21", "14:22", "함평 시니어 생활스포츠센터 완공"],
  ["00:29", "14:51", "군 병원서 진료받으세요"],
  ["03:41", "18:32", "20260713월_KBC 모닝와이드_후CM_210초"],
  ["00:15", "18:47", "[모닝와이드] 클로징 + 스탭스크롤"],
].map(([duration, cumulative, title], index) => ({ order: index + 1, duration, cumulative, title }));

describe("parseClock", () => {
  it("MM:SS와 HH:MM:SS를 초로 바꾼다", () => {
    assert.equal(parseClock("00:26"), 26);
    assert.equal(parseClock("18:47"), 1127);
    assert.equal(parseClock("01:02:03"), 3723);
  });

  it("형식이 아니면 null을 준다", () => {
    for (const bad of ["", "26", "1:2", "abc", "00:26:", "-1:00", "00;26"]) {
      assert.equal(parseClock(bad), null);
    }
  });
});

describe("classifyCueRow", () => {
  it("타이틀·CM·클로징·필러를 본 꼭지와 구분한다", () => {
    assert.equal(classifyCueRow("[모닝] 7/13 모닝 타이틀 + 주요뉴스"), "title");
    assert.equal(classifyCueRow("20260713월_KBC 모닝와이드_후CM_210초"), "cm");
    assert.equal(classifyCueRow("[모닝와이드] 클로징 + 스탭스크롤"), "close");
    assert.equal(classifyCueRow("[필러] kbc직격인터뷰"), "filler");
    assert.equal(classifyCueRow("반도체 클러스터 금호타이어 부지"), "item");
  });

  it("기사 본문에 들어간 낱말을 종류 표기로 오인하지 않는다", () => {
    // "CM"은 낱말 경계에서만 광고로 본다 — 'CMIT' 같은 표기에 걸리면 꼭지를 잃는다.
    assert.equal(classifyCueRow("CMIT 살균제 성분 검출"), "item");
  });
});

describe("parseCueSheetResponse", () => {
  it("실물 큐시트를 그대로 옮기고 검산이 일치한다", () => {
    const sheet = parseCueSheetResponse({ broadcastDate: "2026-07-13", rows: REAL_ROWS });
    assert.equal(sheet.broadcastDate, "2026-07-13");
    assert.equal((sheet.rows).length, 17);
    const checksum = cueSheetChecksum(sheet);
    assert.deepEqual(checksum, { durationSum: 1127, lastCumulative: 1127, ok: true });
  });

  it("본 꼭지 시작 시각은 직전 행의 누적이다", () => {
    const sheet = parseCueSheetResponse({ broadcastDate: "2026-07-13", rows: REAL_ROWS });
    const starts = cueSheetItemStarts(sheet);
    assert.equal((starts).length, 14);
    assert.deepEqual(starts[0], { order: 2, start: 26, title: "반도체 클러스터 금호타이어 부지" });
    assert.equal(starts.at(-1)?.start, 862);
  });

  it("첫 행이 본 꼭지면 0에서 시작한다", () => {
    const sheet = parseCueSheetResponse({
      broadcastDate: "2026-07-13",
      rows: [{ order: 1, duration: "01:00", cumulative: "01:00", title: "첫 꼭지" }],
    });
    assert.equal(cueSheetItemStarts(sheet)[0]?.start, 0);
  });

  it("시각 형식이 깨진 행만 버리고 나머지는 살린다", () => {
    const sheet = parseCueSheetResponse({
      broadcastDate: "2026-07-13",
      rows: [
        { order: 1, duration: "00:26", cumulative: "00:26", title: "타이틀" },
        { order: 2, duration: "??", cumulative: "02:49", title: "판독 실패" },
        { order: 3, duration: "01:46", cumulative: "04:35", title: "살아남는 꼭지" },
      ],
    });
    assert.deepEqual(sheet.rows.map((row) => row.order), [1, 3]);
  });

  it("순서 번호가 뒤섞여 와도 순서대로 정렬한다", () => {
    const sheet = parseCueSheetResponse({
      broadcastDate: "2026-07-13",
      rows: [
        { order: 3, duration: "00:10", cumulative: "00:40", title: "셋" },
        { order: 1, duration: "00:20", cumulative: "00:20", title: "하나" },
        { order: 2, duration: "00:10", cumulative: "00:30", title: "둘" },
      ],
    });
    assert.deepEqual(sheet.rows.map((row) => row.title), ["하나", "둘", "셋"]);
  });

  it("응답이 비었거나 형태가 다르면 빈 큐시트를 준다", () => {
    for (const bad of [null, undefined, {}, { rows: "not-an-array" }, { rows: [null, 3, "x"] }]) {
      const sheet = parseCueSheetResponse(bad);
      assert.deepEqual(sheet.rows, []);
      assert.equal(cueSheetChecksum(sheet).ok, false);
    }
  });

  it("날짜 형식이 아니면 빈 문자열로 둔다", () => {
    assert.equal(parseCueSheetResponse({ broadcastDate: "2026/07/13", rows: [] }).broadcastDate, "");
    assert.equal(parseCueSheetResponse({ broadcastDate: "무시", rows: [] }).broadcastDate, "");
  });

  it("행 수 상한을 넘겨도 잘라서 받는다", () => {
    const rows = Array.from({ length: 200 }, (_, index) => ({
      order: index + 1, duration: "00:01", cumulative: "00:01", title: "행",
    }));
    assert.equal(parseCueSheetResponse({ broadcastDate: "", rows }).rows.length, 60);
  });

  it("검산 불일치를 잡아낸다 — 한 행을 잘못 읽은 경우", () => {
    const broken = REAL_ROWS.map((row, index) => (index === 4 ? { ...row, duration: "03:00" } : row));
    assert.equal(cueSheetChecksum(parseCueSheetResponse({ broadcastDate: "", rows: broken })).ok, false);
  });
});
