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
  rows: CueSheetRow[];
}

export interface CueSheetChecksum {
  durationSum: number;
  lastCumulative: number;
  ok: boolean;
}

/** "MM:SS" 또는 "HH:MM:SS"를 초로. 형식이 아니면 null. */
export function parseClock(value: string): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d{1,2}(:\d{2}){1,2}$/.test(text)) return null;
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
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
 * AI가 읽어 온 큐시트 응답을 검증한다. 응답은 untrusted이므로 모든 필드를 다시 확인하고,
 * 하나라도 어긋나면 그 행을 버린다(하드 실패 대신 부분 수용 — 사진 일부가 흐릴 수 있다).
 */
export function parseCueSheetResponse(raw: unknown): CueSheet {
  const source = raw as { broadcastDate?: unknown; rows?: unknown } | null;
  const rawRows = Array.isArray(source?.rows) ? source!.rows : [];
  const rows: CueSheetRow[] = [];
  for (const entry of rawRows.slice(0, CUE_SHEET_MAX_ROWS)) {
    const row = entry as {
      order?: unknown; duration?: unknown; cumulative?: unknown; title?: unknown; typeCode?: unknown;
    };
    const duration = parseClock(String(row?.duration ?? ""));
    const cumulative = parseClock(String(row?.cumulative ?? ""));
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
    rows,
  };
}

/**
 * 소요의 합이 마지막 누적과 맞는지 본다. 사진 판독 오류를 잡는 유일한 자동 검문이라
 * 실패하면 그 큐시트를 신뢰하지 않는다(2026-08-10 실물 2건 모두 통과했다).
 */
export function cueSheetChecksum(sheet: CueSheet): CueSheetChecksum {
  const rows = sheet?.rows ?? [];
  const durationSum = rows.reduce((sum, row) => sum + row.duration, 0);
  const lastCumulative = rows.length > 0 ? rows[rows.length - 1]!.cumulative : 0;
  return { durationSum, lastCumulative, ok: rows.length > 0 && durationSum === lastCumulative };
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
