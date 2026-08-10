// 방송 큐시트(순서·소요·누적·기사제목)를 파싱·검산하는 순수 계층 — 네트워크·DOM 접근 없음

/** 한 장의 큐시트가 가질 수 있는 행 수 상한 — 실물은 17~24행이었다(2026-08-10). */
export const CUE_SHEET_MAX_ROWS = 60;

export type CueSheetRowKind = "title" | "item" | "cm" | "close" | "filler";

export interface CueSheetRow {
  /** 큐시트의 순서 번호(1부터). */
  order: number;
  /** 소요 시간(초). */
  duration: number;
  /** 누적 시간(초) — 그 행이 **끝나는** 시각이다. */
  cumulative: number;
  title: string;
  /** 큐시트 `종` 칸 원문(R·B·CM·T·빈칸). 빈칸은 단신이다. */
  typeCode: string;
  kind: CueSheetRowKind;
  /**
   * 리포트(종 = R)인가. 실측에서 리포트 106~230초 · 단신 21~57초로 **겹침이 없었다**
   * (모닝와이드 7/13·7/14, 리포트 11 · 단신 20). 길이 등급이 확정되므로 보간 결과의
   * 타당성 검문에 쓴다 — 리포트 자리에 30초 간격이 나오면 정렬이 틀린 것이다.
   */
  isReport: boolean;
}

export interface CueSheet {
  /** 방송일자 YYYY-MM-DD. 읽지 못했으면 빈 문자열. */
  broadcastDate: string;
  /**
   * 표 머리글의 프로그램명 원문(예: `[최종]모닝와이드`, `[최종]주말 8 뉴 스`). 읽지 못했으면
   * 빈 문자열. **저장 파일명이 이것으로 갈린다** — 같은 날 두 프로그램이 다 방송되므로
   * 날짜만으로는 서로를 덮어쓴다(2026-08-10 실사고: 주말 8뉴스 큐시트가 모닝와이드
   * 저장분으로 배치돼 있었다).
   */
  programTitle: string;
  rows: CueSheetRow[];
  /**
   * 응답이 준 원본 행 수. `rows.length`와 다르면 그 차이가 **조용히 사라진 행**이다
   * (형식 불량 폐기 또는 상한 절단). 검산은 이 손실을 원리적으로 못 잡는다 — 꼬리 행이
   * 잘리면 "소요 합 = 마지막 누적"이 그대로 보존되기 때문이다(2026-08-10 감사 실측).
   */
  rowsSeen: number;
}

export interface CueSheetChecksum {
  durationSum: number;
  lastCumulative: number;
  /**
   * 누적이 `직전 누적 + 소요`와 어긋난 행의 순서 번호(최대 5개). **합계만 보면 중간 행의
   * 오독을 놓친다** — 마지막 누적만 맞으면 통과하기 때문이다. 그런데 아이템 시작은
   * *직전 행의 누적*이라, 중간 누적이 틀리면 그 앞뒤 두 구간의 간격이 통째로 어긋나고
   * 보간이 엉뚱한 곳을 가리킨다(2026-08-10 사용자 지적으로 보강).
   */
  brokenRows: number[];
  ok: boolean;
}

/**
 * "MM:SS" 또는 "HH:MM:SS"를 초로. 형식이 아니거나 **자리 값이 범위를 벗어나면** null.
 *
 * 범위 검사가 없으면 `00:99`가 99초로, `12:60:00`이 46800초로 통과한다(2026-08-10 감사 실측).
 * 시각 파서는 신뢰 경계의 첫 관문이라 자릿수만 보고 넘기면 안 된다 — 판독기가 한 자리를
 * 일관되게 오독하면 검산(합 대조)도 함께 속는다. 초는 언제나 60 미만이고, HH:MM:SS의 분도
 * 60 미만이다. MM:SS의 분은 상한을 두지 않는다(90분 프로그램 표기를 막지 않기 위함).
 */
export function parseClock(value: string): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d{1,2}(:\d{2}){1,2}$/.test(text)) return null;
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts[parts.length - 1]! >= 60) return null;
  if (parts.length === 3 && parts[1]! >= 60) return null;
  const seconds = parts.length === 3
    ? parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
    : parts[0]! * 60 + parts[1]!;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

// 행 종류는 AI 응답을 믿지 않고 제목에서 직접 판정한다 — 이 분류가 아이템 개수를 좌우하므로
// 신뢰 경계 안에서 결정해야 한다. 실제 큐시트 표기를 그대로 반영했다(2026-08-10 실물 2건).
const TITLE_PATTERN = /타이틀|오프닝/u;
const CLOSE_PATTERN = /클로징|스탭\s*스크롤|엔딩/u;
// 낱말 경계는 **라틴 문자** 기준이어야 한다 — 실제 표기가 "후CM_210초"라 한글 경계로 잡으면
// 광고 행을 본 꼭지로 세고, 반대로 경계가 없으면 "CMIT" 같은 기사 낱말을 광고로 오인한다.
const CM_PATTERN = /(^|[^A-Za-z])CM([^A-Za-z]|$)|광고/u;
const FILLER_PATTERN = /필러|브릿지/u;

/**
 * 행 종류를 정한다. `종` 칸이 있으면 그것이 우선이고(방송 편성이 직접 찍은 코드라 제목보다
 * 정확하다), 비어 있을 때만 제목으로 판정한다. **빈칸만으로 단신이라고 단정하면 안 된다** —
 * 실물에서 타이틀 행과 일부 단신이 똑같이 빈칸이라, 그 경우 제목이 유일한 단서다.
 */
export function classifyCueRow(title: string, typeCode = ""): CueSheetRowKind {
  const code = String(typeCode ?? "").trim().toUpperCase();
  if (code === "CM") return "cm";
  if (code === "T") return "close";
  if (code === "B") return "filler";
  if (code === "R") return "item";
  const text = String(title ?? "");
  if (CLOSE_PATTERN.test(text)) return "close";
  if (CM_PATTERN.test(text)) return "cm";
  if (FILLER_PATTERN.test(text)) return "filler";
  if (TITLE_PATTERN.test(text)) return "title";
  return "item";
}

/**
 * 시각 칸을 초로 바꾼다. **두 갈래가 필요하다** — AI 응답은 `"02:23"` 같은 시계 문자열이고,
 * 우리가 저장한 파일은 이미 초로 정규화된 숫자(`143`)다. 한쪽 파서로 양쪽을 읽으려다
 * 저장분 큐시트가 통째로 버려졌다(2026-08-10 실기: `parseClock("26")`이 null이라 전 행 탈락 →
 * 검산 `0s vs 0s` → 큐시트 없이 진행). 기능이 도입 이래 저장분으로는 한 번도 돈 적이 없었다.
 */
type CueClockReader = (value: unknown) => number | null;

const readStoredSeconds: CueClockReader = (value) => {
  // 저장분도 신뢰하지 않는다 — 파일이 손상되거나 옛 형식일 수 있다. 방송 하루를 넘는 값은 버린다.
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 24 * 3600) return null;
  return Math.round(value);
};

function buildCueSheet(raw: unknown, toSeconds: CueClockReader): CueSheet {
  const source = raw as { broadcastDate?: unknown; programTitle?: unknown; rows?: unknown } | null;
  const rawRows = Array.isArray(source?.rows) ? source!.rows : [];
  const rows: CueSheetRow[] = [];
  for (const entry of rawRows.slice(0, CUE_SHEET_MAX_ROWS)) {
    const row = entry as {
      order?: unknown; duration?: unknown; cumulative?: unknown; title?: unknown; typeCode?: unknown;
    };
    const duration = toSeconds(row?.duration);
    const cumulative = toSeconds(row?.cumulative);
    const order = Number(row?.order);
    if (duration === null || cumulative === null) continue;
    if (!Number.isInteger(order) || order < 1) continue;
    const title = String(row?.title ?? "").trim().slice(0, 200);
    // 종 칸은 (R)처럼 괄호·기호가 섞여 찍히므로 영문자만 남긴다.
    const typeCode = String(row?.typeCode ?? "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
    rows.push({
      order, duration, cumulative, title, typeCode,
      kind: classifyCueRow(title, typeCode),
      isReport: typeCode === "R",
    });
  }
  rows.sort((a, b) => a.order - b.order);
  const date = String(source?.broadcastDate ?? "").trim();
  return {
    broadcastDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    programTitle: String(source?.programTitle ?? "").trim().slice(0, 80),
    rows,
    rowsSeen: rawRows.length,
  };
}

/**
 * AI가 읽어 온 큐시트 응답을 검증한다. 응답은 untrusted이므로 모든 필드를 다시 확인하고,
 * 하나라도 어긋나면 그 행을 버린다(하드 실패 대신 부분 수용 — 사진 일부가 흐릴 수 있다).
 */
export function parseCueSheetResponse(raw: unknown): CueSheet {
  return buildCueSheet(raw, (value) => parseClock(String(value ?? "")));
}

/**
 * 저장 파일에 넣을 형태를 만든다. **읽기(`parseStoredCueSheet`)와 짝이므로 같은 모듈에 둔다** —
 * 이 형태를 만드는 코드가 `index.ts`에 있으면 테스트가 제품이 아니라 재구현본을 재게 되고,
 * 그 상태에서 실제로 왕복이 깨진 채 도입 이래 방치됐다(§7-ay). 왕복 테스트가 제품의 양쪽
 * 끝을 다 잡으려면 쓰기도 순수 함수여야 한다.
 */
export function serializeCueSheet(sheet: CueSheet): string {
  return JSON.stringify(
    { ...sheet, checksum: cueSheetChecksum(sheet), itemStarts: cueSheetItemStarts(sheet) },
    null,
    2,
  );
}

/**
 * 데이터 폴더에 저장해 둔 회차별 큐시트를 다시 읽는다. 시각이 이미 초라는 것만 다르고,
 * 검증·행 분류·정렬은 AI 응답과 **똑같이** 다시 한다 — 저장된 `kind`·`isReport`를 그대로
 * 믿지 않는다(분류 규칙이 바뀌면 옛 파일이 낡은 판정을 되살릴 수 있다).
 */
export function parseStoredCueSheet(raw: unknown): CueSheet {
  return buildCueSheet(raw, readStoredSeconds);
}

/**
 * 소요의 합이 마지막 누적과 맞는지 본다. 사진 판독 오류를 잡는 유일한 자동 검문이라
 * 실패하면 그 큐시트를 신뢰하지 않는다(2026-08-10 실물 2건 모두 통과했다).
 */
export function cueSheetChecksum(sheet: CueSheet): CueSheetChecksum {
  const rows = sheet?.rows ?? [];
  const durationSum = rows.reduce((sum, row) => sum + row.duration, 0);
  const lastCumulative = rows.length > 0 ? rows[rows.length - 1]!.cumulative : 0;
  // 행마다 누적을 다시 쌓아 대조한다. 어긋난 행에서는 **적힌 누적으로 기준을 되돌려**
  // 이후 전 행이 연쇄로 어긋난 것처럼 보이지 않게 한다 — 오독 한 곳을 한 건으로 센다.
  const brokenRows: number[] = [];
  let running = 0;
  for (const row of rows) {
    running += row.duration;
    if (running !== row.cumulative) {
      if (brokenRows.length < 5) brokenRows.push(row.order);
      running = row.cumulative;
    }
  }
  return {
    durationSum,
    lastCumulative,
    brokenRows,
    ok: rows.length > 0 && durationSum === lastCumulative && brokenRows.length === 0,
  };
}

/**
 * 본 꼭지의 시작 시각(초) 목록. 큐시트의 `누적`은 **끝** 시각이므로 시작은 직전 행의 누적이고,
 * 첫 행이 본 꼭지면 0에서 시작한다. 타이틀·CM·클로징·필러는 아이템이 아니라 제외한다.
 */
export interface CueSheetItemStart {
  order: number;
  /** 큐시트 기준 시작 시각(초). **절대값은 믿지 않는다** — 이웃과의 간격 계산에만 쓴다. */
  start: number;
  title: string;
  isReport: boolean;
}

export function cueSheetItemStarts(sheet: CueSheet): CueSheetItemStart[] {
  const rows = sheet?.rows ?? [];
  const starts: CueSheetItemStart[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (row.kind !== "item") continue;
    starts.push({
      order: row.order,
      start: index === 0 ? 0 : rows[index - 1]!.cumulative,
      title: row.title,
      isReport: row.isReport,
    });
  }
  return starts;
}

/**
 * 머리글 원문에서 프로그램을 가린다. **추측하지 않는다** — 못 가리면 빈 문자열이고, 호출부는
 * 그때 저장을 미루거나 사용자에게 알린다. 잘못 가려 다른 프로그램 저장분을 덮어쓰는 것이
 * 못 가리는 것보다 나쁘다(2026-08-10 실사고).
 */
export function detectCueSheetProgram(programTitle: string): "news8" | "morningwide" | "" {
  const text = String(programTitle ?? "").replace(/\s+/gu, "");
  if (text === "") return "";
  if (/모닝와이드/u.test(text)) return "morningwide";
  // "8뉴스"는 주말·평일 판이 다 있고 표기에 공백이 섞인다("주말 8 뉴 스") — 공백 제거 후 본다.
  if (/8뉴스/u.test(text)) return "news8";
  return "";
}
