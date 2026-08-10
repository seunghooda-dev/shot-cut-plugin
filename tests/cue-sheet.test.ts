// 큐시트 파싱·검산·아이템 시작 시각 계약 — AI 응답을 신뢰하지 않는 경계를 지킨다
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCueRow,
  cueSheetChecksum,
  cueSheetItemStarts,
  detectCueSheetProgram,
  parseClock,
  parseCueSheetResponse,
  parseStoredCueSheet,
  serializeCueSheet,
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

  it("종 칸이 있으면 제목보다 우선한다", () => {
    // 제목에 '타이틀'이 들어간 리포트가 타이틀 행으로 밀려나면 꼭지 하나를 통째로 잃는다.
    assert.equal(classifyCueRow("타이틀 방어전 승리", "R"), "item");
    assert.equal(classifyCueRow("아무 기사", "CM"), "cm");
    assert.equal(classifyCueRow("아무 기사", "T"), "close");
    assert.equal(classifyCueRow("아무 기사", "B"), "filler");
  });

  it("종 칸이 비면 제목으로 판정한다 — 타이틀 행도 종이 비어 있다", () => {
    assert.equal(classifyCueRow("[모닝] 7/13 모닝 타이틀 + 주요뉴스", ""), "title");
    assert.equal(classifyCueRow("여수 중학교 집단 식중독", ""), "item");
  });
});

describe("종(R) 표기", () => {
  it("R만 리포트로 표시하고 괄호·소문자를 받아들인다", () => {
    const sheet = parseCueSheetResponse({
      broadcastDate: "2026-07-13",
      rows: [
        { order: 1, duration: "02:23", cumulative: "02:23", title: "리포트", typeCode: "(R)" },
        { order: 2, duration: "00:30", cumulative: "02:53", title: "단신", typeCode: "" },
        { order: 3, duration: "01:46", cumulative: "04:39", title: "리포트 소문자", typeCode: "r" },
      ],
    });
    assert.deepEqual(sheet.rows.map((row) => row.isReport), [true, false, true]);
    assert.deepEqual(sheet.rows.map((row) => row.typeCode), ["R", "", "R"]);
  });
});

describe("저장분 왕복", () => {
  // 이 왕복이 깨져 있었다(2026-08-10 실기 §7-ay). 저장은 초 숫자로 하는데 읽기는 시계
  // 문자열 파서를 태워 전 행이 버려졌고, 검산이 `0s vs 0s`로 나와 큐시트가 통째로 무시됐다.
  // 기능 도입 이래 **저장분으로는 한 번도 돈 적이 없었다** — 같은 세션 메모리 값만 쓰였다.
  // **제품이 쓰는 직렬화 함수를 그대로 쓴다.** 테스트가 저장 형태를 흉내 내면 제품 writer가
  // 바뀌어도 초록이라, 왕복이 깨진 채 도입 이래 방치됐던 그 상태를 못 막는다(감사 2번).
  const saved = (sheet: ReturnType<typeof parseCueSheetResponse>) => JSON.parse(serializeCueSheet(sheet));

  it("판독분을 저장한 그대로 다시 읽어 같은 표를 낸다", () => {
    const original = parseCueSheetResponse({ broadcastDate: "2026-07-13", rows: REAL_ROWS });
    const restored = parseStoredCueSheet(saved(original));
    assert.deepEqual(restored, original);
  });

  it("왕복 후에도 검산과 꼭지 시작이 같다", () => {
    const original = parseCueSheetResponse({ broadcastDate: "2026-07-13", rows: REAL_ROWS });
    const restored = parseStoredCueSheet(saved(original));
    assert.deepEqual(cueSheetChecksum(restored), cueSheetChecksum(original));
    assert.deepEqual(cueSheetItemStarts(restored), cueSheetItemStarts(original));
  });

  it("저장분도 신뢰하지 않는다 — 시각이 숫자가 아니거나 범위 밖이면 그 행을 버린다", () => {
    const sheet = parseStoredCueSheet({
      broadcastDate: "2026-07-13",
      rows: [
        { order: 1, duration: 26, cumulative: 26, title: "정상" },
        { order: 2, duration: "02:23", cumulative: 169, title: "시계 문자열은 저장 형식이 아니다" },
        { order: 3, duration: -1, cumulative: 200, title: "음수" },
        { order: 4, duration: 10, cumulative: 90000, title: "하루 초과" },
        { order: 5, duration: Number.NaN, cumulative: 300, title: "NaN" },
      ],
    });
    assert.deepEqual(sheet.rows.map((row) => row.order), [1]);
  });

  it("저장된 분류를 그대로 믿지 않고 다시 판정한다", () => {
    // 분류 규칙이 바뀌면 옛 파일이 낡은 판정을 되살릴 수 있다.
    const sheet = parseStoredCueSheet({
      broadcastDate: "2026-07-13",
      rows: [{ order: 1, duration: 60, cumulative: 60, title: "아무 기사", typeCode: "CM", kind: "item", isReport: true }],
    });
    assert.equal(sheet.rows[0]?.kind, "cm");
    assert.equal(sheet.rows[0]?.isReport, false);
  });
});

describe("parseCueSheetResponse", () => {
  it("실물 큐시트를 그대로 옮기고 검산이 일치한다", () => {
    const sheet = parseCueSheetResponse({ broadcastDate: "2026-07-13", rows: REAL_ROWS });
    assert.equal(sheet.broadcastDate, "2026-07-13");
    assert.equal((sheet.rows).length, 17);
    const checksum = cueSheetChecksum(sheet);
    assert.deepEqual(checksum, { durationSum: 1127, lastCumulative: 1127, brokenRows: [], ok: true });
  });

  it("중간 누적이 어긋나면 총합이 맞아도 잡는다", () => {
    // 사용자 지적(2026-08-10): 총합만 보면 중간 행 오독을 놓친다. 그런데 아이템 시작은
    // **직전 행의 누적**이라, 중간이 틀리면 앞뒤 두 구간의 간격이 통째로 어긋난다.
    // 한 행의 누적만 옮기면 총합(=마지막 누적)은 그대로다 — 종전 검산이 통과하던 경우다.
    const broken = REAL_ROWS.map((row, index) => (index === 5 ? { ...row, cumulative: "09:35" } : row));
    const checksum = cueSheetChecksum(parseCueSheetResponse({ broadcastDate: "", rows: broken }));
    assert.equal(checksum.durationSum, checksum.lastCumulative);
    assert.deepEqual(checksum.brokenRows, [6, 7]);
    assert.equal(checksum.ok, false);
  });

  it("어긋난 행이 많아도 다섯 개까지만 보고한다", () => {
    const broken = REAL_ROWS.map((row, index) => (index >= 2 ? { ...row, cumulative: "00:30" } : row));
    assert.equal(cueSheetChecksum(parseCueSheetResponse({ broadcastDate: "", rows: broken })).brokenRows.length, 5);
  });

  it("본 꼭지 시작 시각은 직전 행의 누적이다", () => {
    const sheet = parseCueSheetResponse({ broadcastDate: "2026-07-13", rows: REAL_ROWS });
    const starts = cueSheetItemStarts(sheet);
    assert.equal((starts).length, 14);
    assert.deepEqual(starts[0], { order: 2, start: 26, title: "반도체 클러스터 금호타이어 부지", isReport: false });
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

describe("판독 손실 가시화 · 시각 범위", () => {
  it("응답 행 수를 rowsSeen에 남긴다 — 형식 불량으로 버린 행이 보여야 한다", () => {
    const sheet = parseCueSheetResponse({
      broadcastDate: "2026-07-13",
      rows: [
        { order: 1, duration: "00:26", cumulative: "00:26", title: "정상" },
        { order: 2, duration: "??", cumulative: "02:49", title: "판독 실패" },
      ],
    });
    assert.equal(sheet.rows.length, 1);
    assert.equal(sheet.rowsSeen, 2);
  });

  it("상한 절단도 rowsSeen과의 차이로 드러난다 — 검산은 이 손실을 못 잡는다", () => {
    const rows = Array.from({ length: 70 }, (_value, index) => ({
      order: index + 1, duration: "00:30", cumulative: `${String(Math.floor(((index + 1) * 30) / 60)).padStart(2, "0")}:${String(((index + 1) * 30) % 60).padStart(2, "0")}`, title: "행",
    }));
    const sheet = parseCueSheetResponse({ broadcastDate: "", rows });
    assert.equal(sheet.rows.length, 60);
    assert.equal(sheet.rowsSeen, 70);
    // 꼬리를 잘라도 "소요 합 = 마지막 누적"이 보존되므로 검산은 통과한다 — 그래서 rowsSeen이 필요하다.
    assert.equal(cueSheetChecksum(sheet).ok, true);
  });

  it("시각 자리 값이 범위를 벗어나면 버린다 — 자릿수만 보면 00:99가 통과한다", () => {
    assert.equal(parseClock("00:99"), null);
    assert.equal(parseClock("99:99"), null);
    assert.equal(parseClock("12:60:00"), null);
    // 초가 정상이면 받는다. MM:SS의 분은 상한을 두지 않는다(장편 표기 허용).
    assert.equal(parseClock("00:59"), 59);
    assert.equal(parseClock("99:59"), 5999);
    assert.equal(parseClock("01:59:59"), 7199);
  });
});

describe("프로그램 식별", () => {
  // 같은 날 8뉴스와 모닝와이드가 다 방송되므로 날짜만으로 저장하면 서로를 덮어쓴다.
  // 2026-08-10 실사고: 주말 8뉴스 7/11·7/12 큐시트가 모닝와이드 저장분으로 배치돼 있었다.
  it("머리글 원문에서 프로그램을 가린다 — 공백 표기도 받는다", () => {
    assert.equal(detectCueSheetProgram("[최종]모닝와이드  -5-"), "morningwide");
    assert.equal(detectCueSheetProgram("[최종]주말 8 뉴 스 -10-"), "news8");
    assert.equal(detectCueSheetProgram("[최종]8뉴스"), "news8");
  });

  it("못 가리면 빈 문자열이다 — 추측하지 않는다", () => {
    // 잘못 가려 다른 프로그램 저장분을 덮어쓰는 것이 못 가리는 것보다 나쁘다.
    for (const bad of ["", "   ", "알 수 없는 프로그램", "뉴스"]) {
      assert.equal(detectCueSheetProgram(bad), "");
    }
  });

  it("머리글을 파싱 결과에 싣고 왕복에서도 유지한다", () => {
    const sheet = parseCueSheetResponse({
      broadcastDate: "2026-07-13", programTitle: "[최종]모닝와이드", rows: REAL_ROWS,
    });
    assert.equal(sheet.programTitle, "[최종]모닝와이드");
    assert.equal(parseStoredCueSheet(JSON.parse(serializeCueSheet(sheet))).programTitle, "[최종]모닝와이드");
  });
});
