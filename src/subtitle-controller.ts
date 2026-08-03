import {
  SUBTITLE_DOCUMENT_VERSION,
  SubtitleUndoRedo,
  buildSrt,
  cloneSubtitleDocument,
  createSubtitleDocument,
  deserializeSubtitleAutosave,
  editSubtitleWord,
  findActiveSubtitle,
  joinSubtitleWords,
  mergeSubtitleCues,
  normalizeSubtitleDocument,
  parseSrt,
  reflowSubtitleCues,
  secondsToSrtTime,
  serializeSubtitleAutosave,
  setSubtitleCueEnabled,
  setSubtitleWordHidden,
  splitSubtitleCue,
  subtitleAutosaveKey,
  subtitleSeekTime,
  validateSubtitleDocument,
  type ActiveSubtitlePosition,
  type SubtitleCue,
  type SubtitleDocument,
} from "./subtitles";
import { parseWhisperJson } from "./whisper-subtitles";
import { planHighlightCuts, type HighlightCutOptions, type HighlightCutSegment } from "./highlight-cut";
import { segmentsFromModelPlan } from "./shorts-plan";

export const DEFAULT_SUBTITLE_DOM_LIMIT = 300;
export const MAX_SUBTITLE_DOM_LIMIT = 1_000;
export const DEFAULT_SUBTITLE_DOM_WORD_LIMIT = 5_000;
export const MAX_SUBTITLE_DOM_WORD_LIMIT = 20_000;
export const DEFAULT_SUBTITLE_CUE_LIMIT = 5_000;
export const MAX_SUBTITLE_CUE_LIMIT = 10_000;
export const MAX_SUBTITLE_WORDS_PER_CUE = 1_000;
export const MAX_SUBTITLE_TEXT_LENGTH = 20_000;
export const MAX_SUBTITLE_TOTAL_WORDS = 200_000;
export const MAX_SUBTITLE_TOTAL_TEXT_LENGTH = 5_000_000;
export const MAX_SUBTITLE_AI_JSON_BYTES = 2 * 1024 * 1024;

type MaybePromise<T> = T | Promise<T>;

export interface SubtitleDomEvent {
  target?: SubtitleDomElement | null;
  key?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  preventDefault(): void;
}

export interface SubtitleDomClassList {
  add(...tokens: string[]): void;
  remove(...tokens: string[]): void;
  toggle(token: string, force?: boolean): boolean;
  contains(token: string): boolean;
}

export interface SubtitleDomElement {
  id: string;
  tagName: string;
  className: string;
  textContent: string;
  value: string;
  disabled: boolean;
  hidden: boolean;
  checked: boolean;
  title: string;
  dataset: Record<string, string | undefined>;
  parentElement: SubtitleDomElement | null;
  readonly children: readonly SubtitleDomElement[];
  readonly classList: SubtitleDomClassList;
  readonly firstChild?: SubtitleDomElement | null;
  append(...nodes: SubtitleDomElement[]): void;
  replaceChildren(...nodes: SubtitleDomElement[]): void;
  removeChild?(node: SubtitleDomElement): unknown;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getAttribute(name: string): string | null;
  addEventListener(type: string, listener: (event: SubtitleDomEvent) => void): void;
  removeEventListener(type: string, listener: (event: SubtitleDomEvent) => void): void;
  querySelector(selector: string): SubtitleDomElement | null;
  querySelectorAll(selector: string): readonly SubtitleDomElement[];
  focus?(): void;
  click?(): void;
  scrollIntoView?(options?: unknown): void;
}

export interface SubtitleDomDocument {
  getElementById(id: string): SubtitleDomElement | null;
  createElement(tagName: string): SubtitleDomElement;
}

export interface SubtitleStorageAdapter {
  getItem(key: string): MaybePromise<unknown>;
  setItem(key: string, value: string): MaybePromise<unknown>;
  removeItem?(key: string): MaybePromise<unknown>;
}

export type SubtitleAiAction = "reflow" | "review" | "translate";

export interface SubtitleAiRequest {
  action: SubtitleAiAction;
  document: SubtitleDocument;
  maxChars: number;
  targetLanguage?: string;
}

export type SubtitleAnalysisAction = "interview-highlight" | "edit-outline" | "youtube-metadata" | "shorts-plan" | "news-items";

export interface SubtitleAnalysisRequest {
  action: SubtitleAnalysisAction;
  document: SubtitleDocument;
  // shorts-plan few-shot용 스타일 예시(선택). 사용자 과거 편집을 시연으로 넣어 스타일을 학습시킨다.
  styleExamples?: string;
}

export interface SubtitleHighlight {
  cueId: string;
  reason: string;
}

export interface EditOutlineSegment {
  order: number;
  cueIds: string[];
  label: string;
  reason: string;
}

// shorts-plan: 모델이 직접 제안하는 숏폼 구간(cueId 집합 + 훅·제목·점수·근거).
export interface ShortsPlanItem {
  cueIds: string[];
  hook: string;
  title: string;
  score: number;
  reason: string;
}

// news-items: 뉴스 전체 방송에서 보도 아이템 경계(시작·끝 cueId + 제목) 제안.
export interface NewsItemSpan {
  startCueId: string;
  endCueId: string;
  title: string;
}

export type SubtitleAnalysisResult =
  | { action: "interview-highlight"; highlights: SubtitleHighlight[] }
  | { action: "edit-outline"; segments: EditOutlineSegment[] }
  | { action: "youtube-metadata"; title: string; description: string; tags: string[] }
  | { action: "shorts-plan"; shorts: ShortsPlanItem[] }
  | { action: "news-items"; items: NewsItemSpan[] };

export interface SubtitleAiValidationOptions {
  maxCueCount?: number;
}

export interface SubtitleControllerOptions {
  dom?: SubtitleDomDocument;
  getProjectKey?: () => MaybePromise<string>;
  storage?: SubtitleStorageAdapter | null;
  onSeek?: (seconds: number, cueId: string, wordId?: string) => MaybePromise<void>;
  onChange?: (document: SubtitleDocument) => void;
  onImportSrt?: () => MaybePromise<string | null | undefined>;
  onExportSrt?: (srt: string, suggestedName: string) => MaybePromise<void>;
  aiProvider?: (request: SubtitleAiRequest) => MaybePromise<unknown>;
  analysisProvider?: (request: SubtitleAnalysisRequest) => MaybePromise<unknown>;
  validateAiResponse?: (
    payload: unknown,
    request: SubtitleAiRequest,
    defaultValidator: (payload: unknown) => SubtitleDocument,
  ) => MaybePromise<SubtitleDocument>;
  onActivity?: (message: string) => void;
  onError?: (error: unknown, context: string) => void;
  maxCueCount?: number;
  domCueLimit?: number;
  domWordLimit?: number;
  autosaveDelayMs?: number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanProjectKey(value: unknown): string {
  return createSubtitleDocument(typeof value === "string" ? value : "untitled-project").projectKey;
}

function integerInRange(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed)
    ? Math.max(minimum, Math.min(maximum, Math.round(parsed)))
    : fallback;
}

function documentIssueMessage(document: unknown): string {
  const result = validateSubtitleDocument(document);
  return result.valid
    ? ""
    : result.issues.slice(0, 3).map((issue) => `${issue.path}: ${issue.message}`).join(" ");
}

function preflightDocumentShape(value: unknown, maximum: number): void {
  if (!isRecord(value) || !Array.isArray(value.cues)) return;
  if (value.cues.length > maximum) {
    throw new Error(`자막 큐는 최대 ${maximum.toLocaleString("ko-KR")}개까지 처리할 수 있습니다.`);
  }
  let totalWords = 0;
  let totalTextLength = 0;
  for (const rawCue of value.cues) {
    if (!isRecord(rawCue)) continue;
    const textLength = typeof rawCue.text === "string" ? rawCue.text.length : 0;
    const wordCount = Array.isArray(rawCue.words) ? rawCue.words.length : 0;
    if (textLength > MAX_SUBTITLE_TEXT_LENGTH) {
      throw new Error(`자막 큐 텍스트가 안전 제한 ${MAX_SUBTITLE_TEXT_LENGTH.toLocaleString("ko-KR")}자를 초과했습니다.`);
    }
    if (wordCount > MAX_SUBTITLE_WORDS_PER_CUE) {
      throw new Error(`자막 큐 단어 수가 안전 제한 ${MAX_SUBTITLE_WORDS_PER_CUE.toLocaleString("ko-KR")}개를 초과했습니다.`);
    }
    totalTextLength += textLength;
    totalWords += wordCount;
    if (totalTextLength > MAX_SUBTITLE_TOTAL_TEXT_LENGTH || totalWords > MAX_SUBTITLE_TOTAL_WORDS) break;
  }
  if (totalWords > MAX_SUBTITLE_TOTAL_WORDS) {
    throw new Error(`자막 문서의 전체 단어 수가 안전 제한 ${MAX_SUBTITLE_TOTAL_WORDS.toLocaleString("ko-KR")}개를 초과했습니다.`);
  }
  if (totalTextLength > MAX_SUBTITLE_TOTAL_TEXT_LENGTH) {
    throw new Error(`자막 문서의 전체 텍스트가 안전 제한 ${MAX_SUBTITLE_TOTAL_TEXT_LENGTH.toLocaleString("ko-KR")}자를 초과했습니다.`);
  }
}

function enforceDocumentLimits(document: SubtitleDocument, maximum: number): SubtitleDocument {
  const validationMessage = documentIssueMessage(document);
  if (validationMessage) throw new Error(`자막 문서 형식이 올바르지 않습니다. ${validationMessage}`);
  if (document.cues.length > maximum) {
    throw new Error(`자막 큐는 최대 ${maximum.toLocaleString("ko-KR")}개까지 처리할 수 있습니다.`);
  }
  let totalWords = 0;
  let totalTextLength = 0;
  for (const cue of document.cues) {
    totalWords += cue.words.length;
    totalTextLength += cue.text.length;
    if (cue.text.length > MAX_SUBTITLE_TEXT_LENGTH) {
      throw new Error(`큐 ${cue.cueId}의 텍스트가 안전 제한 ${MAX_SUBTITLE_TEXT_LENGTH.toLocaleString("ko-KR")}자를 초과했습니다.`);
    }
    if (cue.words.length > MAX_SUBTITLE_WORDS_PER_CUE) {
      throw new Error(`큐 ${cue.cueId}의 단어 수가 안전 제한 ${MAX_SUBTITLE_WORDS_PER_CUE.toLocaleString("ko-KR")}개를 초과했습니다.`);
    }
  }
  if (totalWords > MAX_SUBTITLE_TOTAL_WORDS) {
    throw new Error(`자막 문서의 전체 단어 수가 안전 제한 ${MAX_SUBTITLE_TOTAL_WORDS.toLocaleString("ko-KR")}개를 초과했습니다.`);
  }
  if (totalTextLength > MAX_SUBTITLE_TOTAL_TEXT_LENGTH) {
    throw new Error(`자막 문서의 전체 텍스트가 안전 제한 ${MAX_SUBTITLE_TOTAL_TEXT_LENGTH.toLocaleString("ko-KR")}자를 초과했습니다.`);
  }
  return document;
}

function parseAiPayload(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  let bytes = 0;
  for (let index = 0; index < payload.length; index += 1) {
    const code = payload.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < payload.length) {
      const next = payload.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
    if (bytes > MAX_SUBTITLE_AI_JSON_BYTES) break;
  }
  if (bytes > MAX_SUBTITLE_AI_JSON_BYTES) {
    throw new Error("AI 자막 응답이 2MB 안전 제한을 초과했습니다.");
  }
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new Error("AI 자막 응답이 유효한 JSON이 아닙니다.");
  }
}

/** Strict default boundary for untrusted AI reflow/review/translation JSON. */
export function validateAiSubtitleResponse(
  payload: unknown,
  request: SubtitleAiRequest,
  options: SubtitleAiValidationOptions = {},
): SubtitleDocument {
  const parsed = parseAiPayload(payload);
  const wrapped = isRecord(parsed) && "document" in parsed ? parsed.document : parsed;
  if (!isRecord(wrapped) || !Array.isArray(wrapped.cues)) {
    throw new Error("AI 자막 응답에는 cues 배열이 필요합니다.");
  }
  const candidate = {
    ...wrapped,
    version: wrapped.version ?? SUBTITLE_DOCUMENT_VERSION,
    projectKey: wrapped.projectKey ?? request.document.projectKey,
  };
  if (candidate.projectKey !== request.document.projectKey) {
    throw new Error("AI 자막 응답의 프로젝트 키가 현재 문서와 일치하지 않습니다.");
  }
  const maximum = integerInRange(
    options.maxCueCount,
    DEFAULT_SUBTITLE_CUE_LIMIT,
    1,
    MAX_SUBTITLE_CUE_LIMIT,
  );
  preflightDocumentShape(candidate, maximum);
  const strictMessage = documentIssueMessage(candidate);
  if (strictMessage) throw new Error(`AI 자막 JSON 검증에 실패했습니다. ${strictMessage}`);
  const normalized = enforceDocumentLimits(normalizeSubtitleDocument(candidate), maximum);
  if (normalized.cues.length !== wrapped.cues.length) {
    throw new Error("AI 자막 응답에 정규화할 수 없는 큐가 포함되어 있습니다.");
  }
  if (request.action === "review" || request.action === "translate") {
    if (normalized.cues.length !== request.document.cues.length) {
      throw new Error("AI 검토·번역은 큐 개수를 변경할 수 없습니다.");
    }
    normalized.cues.forEach((cue, index) => {
      const sourceCue = request.document.cues[index];
      if (!sourceCue || cue.cueId !== sourceCue.cueId) {
        throw new Error("AI 검토·번역은 기존 cueId 순서를 유지해야 합니다.");
      }
      if (
        cue.start !== sourceCue.start || cue.end !== sourceCue.end ||
        cue.enabled !== sourceCue.enabled || cue.hidden !== sourceCue.hidden
      ) {
        throw new Error("AI 검토·번역은 큐 시간과 표시 상태를 변경할 수 없습니다.");
      }
      if (cue.words.length !== sourceCue.words.length) {
        throw new Error("AI 검토·번역은 단어 개수를 변경할 수 없습니다.");
      }
      cue.words.forEach((word, wordIndex) => {
        const sourceWord = sourceCue.words[wordIndex];
        if (!sourceWord || word.wordId !== sourceWord.wordId) {
          throw new Error("AI 검토·번역은 기존 wordId 순서를 유지해야 합니다.");
        }
        if (word.s !== sourceWord.s || word.e !== sourceWord.e || word.hidden !== sourceWord.hidden) {
          throw new Error("AI 검토·번역은 단어 시간과 숨김 상태를 변경할 수 없습니다.");
        }
      });
    });
  }
  if (request.action === "reflow") {
    const tooLong = normalized.cues.find((cue) => cue.enabled && !cue.hidden && cue.text.length > request.maxChars);
    if (tooLong) throw new Error(`AI 줄바꿈 결과에 ${request.maxChars}자를 초과한 큐가 있습니다.`);
    // 단어의 소속 큐 상태까지 대조한다(§185 감사) — reflow는 큐 분할·병합이 허용되므로 큐
    // 1:1 대조는 불가하지만, 단어가 원본에서 보이는(enabled·비숨김) 큐에 있었다면 결과에서도
    // 그래야 한다. 이 대조가 없던 시절, 모델이 긴 큐에 hidden/disabled를 붙이면 maxChars
    // 검사(보이는 큐만 셈)와 검증을 모두 통과해 SRT 내보내기에서 조용히 사라졌다.
    const sourceWords = request.document.cues.flatMap((cue) =>
      cue.words.map((word) => ({ word, enabled: cue.enabled, hidden: cue.hidden })));
    const resultWords = normalized.cues.flatMap((cue) =>
      cue.words.map((word) => ({ word, enabled: cue.enabled, hidden: cue.hidden })));
    if (resultWords.length !== sourceWords.length) {
      throw new Error("AI 줄바꿈은 단어를 추가하거나 삭제할 수 없습니다.");
    }
    resultWords.forEach(({ word, enabled, hidden }, index) => {
      const source = sourceWords[index];
      if (!source) throw new Error("AI 줄바꿈은 단어를 추가하거나 삭제할 수 없습니다.");
      const sourceWord = source.word;
      if (
        word.wordId !== sourceWord.wordId || word.t !== sourceWord.t ||
        word.s !== sourceWord.s || word.e !== sourceWord.e || word.hidden !== sourceWord.hidden
      ) {
        throw new Error("AI 줄바꿈은 단어 ID, 순서, 내용 및 시간을 유지해야 합니다.");
      }
      if (enabled !== source.enabled || hidden !== source.hidden) {
        throw new Error("AI 줄바꿈은 큐의 사용·숨김 상태를 변경할 수 없습니다.");
      }
    });
  }
  return normalized;
}

export function validateAnalysisResponse(
  payload: unknown,
  request: SubtitleAnalysisRequest,
): SubtitleAnalysisResult {
  if (!isRecord(payload)) throw new Error("AI 자막 분석 응답 형식이 올바르지 않습니다.");
  const cueIds = new Set(request.document.cues.map((cue) => cue.cueId));

  if (request.action === "interview-highlight") {
    const raw = Array.isArray(payload.highlights) ? payload.highlights : [];
    const highlights: SubtitleHighlight[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      if (typeof item.cueId !== "string" || !cueIds.has(item.cueId)) continue;
      if (typeof item.reason !== "string" || !item.reason.trim()) continue;
      highlights.push({ cueId: item.cueId, reason: item.reason.trim().slice(0, 200) });
    }
    return { action: "interview-highlight", highlights };
  }

  if (request.action === "edit-outline") {
    const raw = Array.isArray(payload.segments) ? payload.segments : [];
    const segments: EditOutlineSegment[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const segmentCueIds = Array.isArray(item.cueIds)
        ? item.cueIds.filter((id): id is string => typeof id === "string" && cueIds.has(id))
        : [];
      if (segmentCueIds.length === 0) continue;
      if (typeof item.label !== "string" || typeof item.reason !== "string") continue;
      const order = segments.length + 1;
      segments.push({
        order,
        cueIds: segmentCueIds,
        label: item.label.trim().slice(0, 60) || `구간 ${order}`,
        reason: item.reason.trim().slice(0, 200),
      });
    }
    return { action: "edit-outline", segments };
  }

  if (request.action === "shorts-plan") {
    const raw = Array.isArray(payload.shorts) ? payload.shorts : [];
    const shorts: ShortsPlanItem[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const segCueIds = Array.isArray(item.cueIds)
        ? item.cueIds.filter((id): id is string => typeof id === "string" && cueIds.has(id))
        : [];
      if (segCueIds.length === 0) continue;
      const score = typeof item.score === "number" && Number.isFinite(item.score)
        ? Math.min(1, Math.max(0, item.score)) : 0.5;
      shorts.push({
        cueIds: segCueIds,
        hook: typeof item.hook === "string" ? item.hook.trim().slice(0, 200) : "",
        title: (typeof item.title === "string" ? item.title.trim().slice(0, 60) : "") || `숏폼 ${shorts.length + 1}`,
        score,
        reason: typeof item.reason === "string" ? item.reason.trim().slice(0, 200) : "",
      });
      if (shorts.length >= 30) break;
    }
    return { action: "shorts-plan", shorts };
  }

  // news-items 분기(§185 감사) — 없던 시절 youtube-metadata 폴스루로 떨어져 "제목이
  // 없습니다"로 오작동했다. 다른 분석과 같은 원칙: 존재하지 않는 cueId를 참조하는 항목은
  // 하드 실패 대신 걸러낸다.
  if (request.action === "news-items") {
    const raw = Array.isArray(payload.items) ? payload.items : [];
    const items: NewsItemSpan[] = [];
    for (const entry of raw) {
      if (!isRecord(entry)) continue;
      const startCueId = typeof entry.startCueId === "string" ? entry.startCueId : "";
      const endCueId = typeof entry.endCueId === "string" ? entry.endCueId : "";
      if (!cueIds.has(startCueId) || !cueIds.has(endCueId)) continue;
      items.push({
        startCueId,
        endCueId,
        title: (typeof entry.title === "string" ? entry.title.trim().slice(0, 100) : "") || `아이템 ${items.length + 1}`,
      });
      if (items.length >= 60) break;
    }
    return { action: "news-items", items };
  }

  const title = typeof payload.title === "string" ? payload.title.trim().slice(0, 100) : "";
  const description = typeof payload.description === "string" ? payload.description.trim().slice(0, 5_000) : "";
  const tags = Array.isArray(payload.tags)
    ? payload.tags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.trim().slice(0, 30))
      .slice(0, 15)
    : [];
  if (!title) throw new Error("AI 유튜브 메타데이터 응답에 제목이 없습니다.");
  return { action: "youtube-metadata", title, description, tags };
}

function defaultDom(): SubtitleDomDocument {
  const candidate = (globalThis as unknown as { document?: unknown }).document;
  if (!candidate) throw new Error("자막 편집기에 DOM document가 필요합니다.");
  return candidate as SubtitleDomDocument;
}

function defaultStorage(): SubtitleStorageAdapter | null {
  const candidate = (globalThis as unknown as { localStorage?: SubtitleStorageAdapter }).localStorage;
  return candidate ?? null;
}

function defaultSetTimer(callback: () => void, delayMs: number): unknown {
  return setTimeout(callback, delayMs);
}

function defaultClearTimer(timer: unknown): void {
  clearTimeout(timer as ReturnType<typeof setTimeout>);
}

function suggestedSrtName(projectKey: string): string {
  const safe = projectKey
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "_")
    .replace(/\s+/gu, "_")
    .replace(/[. ]+$/gu, "")
    .slice(0, 80) || "ShortFlow";
  return `${safe}_subtitles.srt`;
}

function cleanTargetLanguage(value: string): string {
  const clean = value.trim().replace(/[\u0000-\u001f\u007f]/gu, "").slice(0, 32);
  if (!clean) throw new Error("번역 대상 언어를 입력해 주세요.");
  if (!/^[\p{L}][\p{L}\p{M}\p{N} -]*$/u.test(clean)) {
    throw new Error("번역 대상 언어에는 언어 이름만 입력해 주세요.");
  }
  if (/\b(?:ignore|instruction|system|prompt|assistant|schema|json|previous)\b/iu.test(clean)) {
    throw new Error("번역 대상 언어에 명령문을 포함할 수 없습니다.");
  }
  return clean;
}

// Premiere 26.3 UXP can leave stale children behind after replaceChildren()
// (same host bug as the asset list; confirmed live with duplicated cue rows).
// Remove explicitly when the DOM supports it; mock DOMs fall back safely.
function clearElementChildren(element: SubtitleDomElement): void {
  if (typeof element.removeChild === "function") {
    while (element.firstChild) element.removeChild(element.firstChild);
    return;
  }
  element.replaceChildren();
}

function closestWithData(
  start: SubtitleDomElement | null | undefined,
  key: string,
  boundary: SubtitleDomElement,
): SubtitleDomElement | null {
  let current = start ?? null;
  while (current) {
    if (current.dataset[key] !== undefined) return current;
    if (current === boundary) break;
    current = current.parentElement;
  }
  return null;
}

export class SubtitleController {
  private readonly dom: SubtitleDomDocument;
  private readonly storage: SubtitleStorageAdapter | null;
  private readonly maximumCues: number;
  private readonly domLimit: number;
  private readonly domWordLimit: number;
  private readonly autosaveDelay: number;
  private readonly setTimer: (callback: () => void, delayMs: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;
  private readonly cleanups: Array<() => void> = [];
  private documentValue = createSubtitleDocument("untitled-project");
  private history = new SubtitleUndoRedo(this.documentValue);
  private selectedCueId = "";
  private selectedWordId = "";
  private activePosition: ActiveSubtitlePosition | null = null;
  private analysisResult: SubtitleAnalysisResult | null = null;
  private lastPlayheadSeconds = Number.NaN;
  private autosaveTimer: unknown = null;
  private saveQueue: Promise<void> = Promise.resolve();
  private busyAction = "";
  private initialized = false;
  private lifecycleGeneration = 0;
  private documentRevision = 0;
  private projectLoadGeneration = 0;
  private documentWordCount = 0;
  private disabledCueCount = 0;
  private renderedCueCount = 0;
  private renderedWordCount = 0;
  private readonly renderedCueElements = new Map<string, SubtitleDomElement>();
  private readonly renderedWordElements = new Map<string, SubtitleDomElement>();
  private activeDomDirty = true;

  constructor(private readonly options: SubtitleControllerOptions = {}) {
    this.dom = options.dom ?? defaultDom();
    this.storage = options.storage === undefined ? defaultStorage() : options.storage;
    this.maximumCues = integerInRange(
      options.maxCueCount,
      DEFAULT_SUBTITLE_CUE_LIMIT,
      1,
      MAX_SUBTITLE_CUE_LIMIT,
    );
    this.domLimit = integerInRange(
      options.domCueLimit,
      DEFAULT_SUBTITLE_DOM_LIMIT,
      1,
      Math.min(MAX_SUBTITLE_DOM_LIMIT, this.maximumCues),
    );
    this.domWordLimit = integerInRange(
      options.domWordLimit,
      DEFAULT_SUBTITLE_DOM_WORD_LIMIT,
      1,
      MAX_SUBTITLE_DOM_WORD_LIMIT,
    );
    this.autosaveDelay = integerInRange(options.autosaveDelayMs, 500, 0, 60_000);
    this.setTimer = options.setTimer ?? defaultSetTimer;
    this.clearTimer = options.clearTimer ?? defaultClearTimer;
  }

  get document(): SubtitleDocument {
    return cloneSubtitleDocument(this.documentValue);
  }

  get projectKey(): string {
    return this.documentValue.projectKey;
  }

  /** Read-only count for polling code that must not clone the full document. */
  get cueCount(): number {
    return this.documentValue.cues.length;
  }

  get isBusy(): boolean {
    return Boolean(this.busyAction);
  }

  get analysis(): SubtitleAnalysisResult | null {
    return this.analysisResult;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const lifecycle = ++this.lifecycleGeneration;
    this.initialized = true;
    try {
      this.bindEvents();
      const projectKey = cleanProjectKey(await this.options.getProjectKey?.() ?? this.projectKey);
      if (!this.initialized || lifecycle !== this.lifecycleGeneration) return;
      await this.loadProject(projectKey, false);
    } catch (error) {
      if (lifecycle === this.lifecycleGeneration) {
        this.cleanups.splice(0).forEach((cleanup) => cleanup());
        this.initialized = false;
      }
      throw error;
    }
  }

  dispose(): void {
    this.lifecycleGeneration += 1;
    this.projectLoadGeneration += 1;
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    if (this.autosaveTimer !== null) this.clearTimer(this.autosaveTimer);
    this.autosaveTimer = null;
    void this.flushAutosave().catch((error) => this.reportError(error, "자막 자동 저장 실패"));
    this.initialized = false;
  }

  async loadProject(projectKey: string, flushCurrent = true): Promise<void> {
    const generation = ++this.projectLoadGeneration;
    if (flushCurrent) await this.flushAutosave();
    if (generation !== this.projectLoadGeneration) return;
    const clean = cleanProjectKey(projectKey);
    let next = createSubtitleDocument(clean);
    let restoredCueCount = 0;
    let restoreError: unknown = null;
    if (this.storage) {
      let raw: unknown = null;
      try {
        raw = await this.storage.getItem(subtitleAutosaveKey(clean));
        if (generation !== this.projectLoadGeneration) return;
        if (typeof raw === "string" && raw.trim()) {
          next = enforceDocumentLimits(deserializeSubtitleAutosave(raw, clean), this.maximumCues);
          restoredCueCount = next.cues.length;
        }
      } catch (error) {
        if (generation !== this.projectLoadGeneration) return;
        restoreError = error;
        // 손상본 보존(§185 감사) — 복원 실패 후 빈 문서로 진행하면 첫 편집의 자동 저장이
        // 손상됐지만 복구 가능한 원문을 빈 문서로 덮어쓴다. 역직렬화에 실패한 원문을 백업
        // 키로 옮겨 두면 원본 키가 덮여도 수동 복구의 길이 남는다.
        if (typeof raw === "string" && raw.trim()) {
          try {
            await this.storage.setItem(`${subtitleAutosaveKey(clean)}.corrupt`, raw);
            this.options.onActivity?.("복원 실패한 자동 저장 원문을 백업 키(.corrupt)에 보존했습니다.");
          } catch {
            // 백업 실패는 복원 오류 보고로 충분하다 — 이중 오류로 덮지 않는다.
          }
        }
      }
    }
    if (generation !== this.projectLoadGeneration) return;
    this.documentValue = next;
    this.history = new SubtitleUndoRedo(next);
    this.recordDocumentChange();
    this.selectedCueId = "";
    this.selectedWordId = "";
    this.activePosition = null;
    this.analysisResult = null;
    this.lastPlayheadSeconds = Number.NaN;
    this.render();
    this.renderAnalysisPanel();
    this.emitChange();
    if (restoredCueCount > 0) {
      this.options.onActivity?.(`프로젝트 자막 자동 저장 ${restoredCueCount}개를 복원했습니다.`);
    }
    if (restoreError !== null) this.reportError(restoreError, "프로젝트 자막 복원 실패");
  }

  setDocument(value: SubtitleDocument, recordHistory = false): void {
    preflightDocumentShape(value, this.maximumCues);
    const normalized = enforceDocumentLimits(
      normalizeSubtitleDocument(value, { projectKey: this.projectKey }),
      this.maximumCues,
    );
    if (recordHistory) this.documentValue = this.history.commit(normalized);
    else {
      this.documentValue = normalized;
      this.history.reset(normalized);
    }
    this.recordDocumentChange();
    this.selectedCueId = "";
    this.selectedWordId = "";
    this.analysisResult = null;
    this.render();
    this.renderAnalysisPanel();
    this.emitChange();
    this.scheduleAutosave();
  }

  importSrtText(srt: string): SubtitleDocument {
    // 부분 유실 고지(§185 감사) — parseSrt가 역순 시각·빈 텍스트 블록을 조용히 버려도
    // 성공 개수만 알리면 사용자는 유실을 모른다.
    let discarded = 0;
    const parsed = parseSrt(srt, {
      projectKey: this.projectKey,
      maxCueCount: this.maximumCues,
      onDiscarded: (count) => { discarded = count; },
    });
    if (parsed.cues.length === 0) throw new Error("SRT에서 유효한 자막 큐를 찾지 못했습니다.");
    this.commit(parsed, `SRT 자막 ${parsed.cues.length}개를 불러왔습니다.`);
    if (discarded > 0) {
      this.options.onActivity?.(`SRT 블록 ${discarded}개는 타이밍 오류·빈 텍스트로 건너뛰었습니다.`);
    }
    return this.document;
  }

  importWhisperJsonText(json: string): SubtitleDocument {
    const parsed = parseWhisperJson(json, {
      projectKey: this.projectKey,
      maxCueCount: this.maximumCues,
    });
    this.commit(parsed, `Whisper JSON 자막 ${parsed.cues.length}개를 불러왔습니다.`);
    return this.document;
  }

  importSubtitleText(source: string): SubtitleDocument {
    return source.trimStart().startsWith("{")
      ? this.importWhisperJsonText(source)
      : this.importSrtText(source);
  }

  exportSrtText(): string {
    const srt = buildSrt(this.documentValue);
    if (!srt) throw new Error("내보낼 활성 자막 큐가 없습니다.");
    return srt;
  }

  editWord(cueId: string, wordId: string, text: string): void {
    this.commit(editSubtitleWord(this.documentValue, cueId, wordId, text), "자막 단어를 수정했습니다.");
  }

  toggleWordHidden(cueId: string, wordId: string): void {
    const cue = this.documentValue.cues.find((candidate) => candidate.cueId === cueId);
    const word = cue?.words.find((candidate) => candidate.wordId === wordId);
    if (!word) throw new Error(`자막 단어를 찾을 수 없습니다: ${wordId}`);
    this.commit(setSubtitleWordHidden(this.documentValue, cueId, wordId, !word.hidden), word.hidden ? "단어 숨김을 해제했습니다." : "단어를 숨겼습니다.");
  }

  joinWord(cueId: string, wordId: string, direction: "previous" | "next"): void {
    const cue = this.documentValue.cues.find((candidate) => candidate.cueId === cueId);
    const index = cue?.words.findIndex((word) => word.wordId === wordId) ?? -1;
    if (!cue || index < 0) throw new Error(`자막 단어를 찾을 수 없습니다: ${wordId}`);
    const other = cue.words[index + (direction === "previous" ? -1 : 1)];
    if (!other) throw new Error(direction === "previous" ? "붙일 앞 단어가 없습니다." : "붙일 다음 단어가 없습니다.");
    this.commit(joinSubtitleWords(this.documentValue, cueId, wordId, other.wordId), "두 단어를 붙였습니다.");
  }

  toggleCueEnabled(cueId: string): void {
    const cue = this.documentValue.cues.find((candidate) => candidate.cueId === cueId);
    if (!cue) throw new Error(`자막 큐를 찾을 수 없습니다: ${cueId}`);
    this.commit(setSubtitleCueEnabled(this.documentValue, cueId, !cue.enabled), cue.enabled ? "자막 큐를 비활성화했습니다." : "자막 큐를 활성화했습니다.");
  }

  splitCueAtWord(cueId: string, wordId: string): void {
    this.commit(splitSubtitleCue(this.documentValue, cueId, wordId), "선택한 단어 앞에서 자막 큐를 나눴습니다.");
  }

  mergeCue(cueId: string, direction: "previous" | "next"): void {
    const index = this.documentValue.cues.findIndex((cue) => cue.cueId === cueId);
    if (index < 0) throw new Error(`자막 큐를 찾을 수 없습니다: ${cueId}`);
    const other = this.documentValue.cues[index + (direction === "previous" ? -1 : 1)];
    if (!other) throw new Error(direction === "previous" ? "합칠 앞 자막 큐가 없습니다." : "합칠 다음 자막 큐가 없습니다.");
    this.commit(mergeSubtitleCues(this.documentValue, cueId, other.cueId), "인접한 자막 큐를 합쳤습니다.");
  }

  reflow(maxChars = this.maxChars()): void {
    const needsReflow = this.documentValue.cues.some((cue) =>
      cue.enabled && !cue.hidden && cue.text.length > maxChars);
    if (!needsReflow) {
      this.setStatus(`${maxChars}자 기준으로 나눌 긴 자막이 없습니다.`, "ready");
      return;
    }
    const next = reflowSubtitleCues(this.documentValue, maxChars, { maxOutputCues: this.maximumCues });
    this.commit(next, `긴 자막을 큐당 최대 ${maxChars}자로 나눴습니다.`);
  }

  undo(): void {
    if (!this.history.canUndo) return;
    this.documentValue = this.history.undo();
    this.afterHistoryChange("자막 편집을 되돌렸습니다.");
  }

  redo(): void {
    if (!this.history.canRedo) return;
    this.documentValue = this.history.redo();
    this.afterHistoryChange("자막 편집을 다시 실행했습니다.");
  }

  async seekToWord(cueId: string, wordId?: string): Promise<void> {
    const seconds = subtitleSeekTime(this.documentValue, cueId, wordId);
    await this.options.onSeek?.(seconds, cueId, wordId);
  }

  updatePlayhead(seconds: number): ActiveSubtitlePosition | null {
    this.lastPlayheadSeconds = seconds;
    const previousPosition = this.activePosition;
    const previousCueId = this.activePosition?.cueId;
    const previousWordId = this.activePosition?.wordId;
    this.activePosition = findActiveSubtitle(this.documentValue, seconds);
    const activeChanged = previousCueId !== this.activePosition?.cueId || previousWordId !== this.activePosition?.wordId;
    if (!activeChanged && !this.activeDomDirty) return this.activePosition;

    const previousWord = previousPosition?.wordId
      ? this.renderedWordElements.get(this.wordElementKey(previousPosition.cueId, previousPosition.wordId))
      : undefined;
    const activeWord = this.activePosition?.wordId
      ? this.renderedWordElements.get(this.wordElementKey(this.activePosition.cueId, this.activePosition.wordId))
      : undefined;
    if (previousWord && previousWord !== activeWord) {
      previousWord.classList.remove("is-active");
      previousWord.removeAttribute("aria-current");
    }
    if (activeWord) {
      activeWord.classList.add("is-active");
      activeWord.setAttribute("aria-current", "true");
      if (activeChanged) activeWord.scrollIntoView?.({ block: "nearest" });
    }

    const previousCue = previousPosition
      ? this.renderedCueElements.get(previousPosition.cueId)
      : undefined;
    const activeCue = this.activePosition
      ? this.renderedCueElements.get(this.activePosition.cueId)
      : undefined;
    if (previousCue && previousCue !== activeCue) previousCue.classList.remove("is-active");
    activeCue?.classList.add("is-active");
    this.activeDomDirty = false;
    return this.activePosition;
  }

  async runAi(action: SubtitleAiAction): Promise<void> {
    if (!this.options.aiProvider) throw new Error("AI 자막 provider가 연결되지 않았습니다.");
    await this.runBusy(`AI ${action}`, async () => {
      const targetLanguage = action === "translate"
        ? cleanTargetLanguage(this.value("subtitle-translate-language-input"))
        : "";
      const requestRevision = this.documentRevision;
      const requestLoadGeneration = this.projectLoadGeneration;
      const request: SubtitleAiRequest = {
        action,
        document: this.document,
        maxChars: this.maxChars(),
        ...(action === "translate" ? { targetLanguage } : {}),
      };
      const payload = await this.options.aiProvider?.(request);
      this.assertAiRequestCurrent(requestRevision, requestLoadGeneration, request.document.projectKey);
      const defaultValidator = (value: unknown): SubtitleDocument => validateAiSubtitleResponse(value, request, { maxCueCount: this.maximumCues });
      let result: SubtitleDocument;
      if (this.options.validateAiResponse) {
        const provided = await this.options.validateAiResponse(payload, request, defaultValidator);
        this.assertAiRequestCurrent(requestRevision, requestLoadGeneration, request.document.projectKey);
        // A custom hook can enrich diagnostics, but may not bypass the strict
        // boundary applied to untrusted provider output.
        result = defaultValidator(provided);
      } else {
        // The default path validates exactly once; large payloads must not be
        // parsed and normalized twice when no custom hook is installed.
        result = defaultValidator(payload);
      }
      if (result.projectKey !== this.projectKey) {
        throw new Error("AI 자막 검증 결과의 프로젝트 키가 현재 문서와 일치하지 않습니다.");
      }
      enforceDocumentLimits(result, this.maximumCues);
      const normalized = enforceDocumentLimits(
        normalizeSubtitleDocument(result, { projectKey: this.projectKey }),
        this.maximumCues,
      );
      this.commit(normalized, action === "reflow" ? "AI 자막 줄바꿈을 적용했습니다." : action === "review" ? "AI 자막 검토 결과를 적용했습니다." : "AI 자막 번역 결과를 적용했습니다.");
    });
  }

  /** Read-only: unlike runAi, this never mutates the document (no commit/undo/autosave). */
  async runAnalysis(action: SubtitleAnalysisAction): Promise<void> {
    if (!this.options.analysisProvider) throw new Error("AI 자막 분석 provider가 연결되지 않았습니다.");
    await this.runBusy(`AI 분석 ${action}`, async () => {
      const requestRevision = this.documentRevision;
      const requestLoadGeneration = this.projectLoadGeneration;
      const request: SubtitleAnalysisRequest = { action, document: this.document };
      const payload = await this.options.analysisProvider?.(request);
      this.assertAiRequestCurrent(requestRevision, requestLoadGeneration, request.document.projectKey);
      this.analysisResult = validateAnalysisResponse(payload, request);
      this.options.onActivity?.(
        action === "interview-highlight" ? "AI 인터뷰 발췌 결과를 표시했습니다."
          : action === "edit-outline" ? "AI 편집 구성안을 표시했습니다."
            : "AI 유튜브 메타데이터를 표시했습니다.",
      );
    });
    // Render after runBusy clears isBusy so the seek buttons are not created disabled.
    this.renderAnalysisPanel();
  }

  /**
   * AI 하이라이트+아웃라인 분석을 실행하고 자막 타임코드를 근거로 숏폼 컷 구간을 판단한다.
   * 문서를 변경하지 않는 읽기 전용 경로. provider가 돌려준 값은 validateAnalysisResponse로
   * 검증한 뒤에만 순수 판단 로직(planHighlightCuts)에 넘긴다(신뢰 경계 유지).
   */
  async planAutoCuts(
    options?: Partial<HighlightCutOptions>,
    styleExamples?: string,
  ): Promise<HighlightCutSegment[]> {
    if (!this.options.analysisProvider) throw new Error("AI 자막 분석 provider가 연결되지 않았습니다.");
    if (this.documentValue.cues.length === 0) {
      throw new Error("먼저 자막을 불러오세요. 자동 컷은 자막 타임코드를 근거로 구간을 판단합니다.");
    }
    let plan: HighlightCutSegment[] = [];
    await this.runBusy("AI 자동 컷 분석", async () => {
      const requestRevision = this.documentRevision;
      const requestLoadGeneration = this.projectLoadGeneration;
      const document = this.document;
      const analyze = async (request: SubtitleAnalysisRequest): Promise<SubtitleAnalysisResult> => {
        const payload = await this.options.analysisProvider?.(request);
        this.assertAiRequestCurrent(requestRevision, requestLoadGeneration, document.projectKey);
        return validateAnalysisResponse(payload, request);
      };
      // 1) 모델 주도 shorts-plan 우선(스타일 예시 있으면 few-shot 주입).
      try {
        const planResult = await analyze({
          action: "shorts-plan",
          document,
          ...(styleExamples ? { styleExamples } : {}),
        });
        if (planResult.action === "shorts-plan" && planResult.shorts.length > 0) {
          plan = segmentsFromModelPlan(document, planResult.shorts, options);
        }
      } catch {
        this.options.onActivity?.("AI 숏폼 플랜을 건너뛰고 하이라이트 기반으로 대체합니다.");
      }
      // 2) 폴백: 하이라이트+아웃라인 휴리스틱(항상 안전망).
      if (plan.length === 0) {
        const highlightResult = await analyze({ action: "interview-highlight", document });
        const outlineResult = await analyze({ action: "edit-outline", document });
        const highlights = highlightResult.action === "interview-highlight" ? highlightResult.highlights : [];
        const outline = outlineResult.action === "edit-outline" ? outlineResult.segments : null;
        plan = planHighlightCuts(document, highlights, outline, options);
      }
    });
    return plan;
  }

  async flushAutosave(): Promise<void> {
    if (this.autosaveTimer !== null) this.clearTimer(this.autosaveTimer);
    this.autosaveTimer = null;
    if (!this.storage) return;
    const key = subtitleAutosaveKey(this.projectKey);
    const serialized = serializeSubtitleAutosave(this.documentValue);
    this.saveQueue = this.saveQueue.catch(() => undefined).then(async () => {
      await this.storage?.setItem(key, serialized);
    });
    await this.saveQueue;
  }

  private required(id: string): SubtitleDomElement {
    const element = this.dom.getElementById(id);
    if (!element) throw new Error(`자막 편집기 UI 요소를 찾을 수 없습니다: #${id}`);
    return element;
  }

  private optional(id: string): SubtitleDomElement | null {
    return this.dom.getElementById(id);
  }

  private value(id: string): string {
    return this.required(id).value ?? "";
  }

  private maxChars(): number {
    return integerInRange(this.value("subtitle-max-chars-input"), 19, 4, 120);
  }

  private bind(element: SubtitleDomElement, type: string, handler: (event: SubtitleDomEvent) => void): void {
    element.addEventListener(type, handler);
    this.cleanups.push(() => element.removeEventListener(type, handler));
  }

  private bindEvents(): void {
    const guarded = (task: () => void | Promise<void>, context: string): void => {
      void Promise.resolve().then(task).catch((error) => this.reportError(error, context));
    };
    this.bind(this.required("subtitle-undo-btn"), "click", () => this.undo());
    this.bind(this.required("subtitle-redo-btn"), "click", () => this.redo());
    this.bind(this.required("subtitle-reflow-btn"), "click", () => guarded(() => this.reflow(), "자막 줄바꿈 실패"));
    this.bind(this.required("subtitle-import-btn"), "click", () => guarded(() => this.importFromAdapter(), "자막 파일 불러오기 실패"));
    this.bind(this.required("subtitle-export-btn"), "click", () => guarded(() => this.exportToAdapter(), "SRT 내보내기 실패"));
    this.bind(this.required("subtitle-ai-reflow-btn"), "click", () => guarded(() => this.runAi("reflow"), "AI 자막 줄바꿈 실패"));
    this.bind(this.required("subtitle-ai-review-btn"), "click", () => guarded(() => this.runAi("review"), "AI 자막 검토 실패"));
    this.bind(this.required("subtitle-ai-translate-btn"), "click", () => guarded(() => this.runAi("translate"), "AI 자막 번역 실패"));
    this.bind(this.required("subtitle-ai-highlight-btn"), "click", () => guarded(() => this.runAnalysis("interview-highlight"), "AI 인터뷰 발췌 실패"));
    this.bind(this.required("subtitle-ai-outline-btn"), "click", () => guarded(() => this.runAnalysis("edit-outline"), "AI 편집 구성안 실패"));
    this.bind(this.required("subtitle-ai-youtube-btn"), "click", () => guarded(() => this.runAnalysis("youtube-metadata"), "AI 유튜브 메타데이터 실패"));
    this.bind(this.required("subtitle-max-chars-input"), "change", () => this.render());
    const list = this.required("subtitle-cue-list");
    this.bind(list, "click", (event) => guarded(() => this.handleListClick(event), "자막 편집 실패"));
    this.bind(list, "keydown", (event) => guarded(() => this.handleListKeydown(event), "자막 키보드 편집 실패"));
    const analysisPanel = this.optional("subtitle-analysis-panel");
    if (analysisPanel) {
      this.bind(analysisPanel, "click", (event) => guarded(() => this.handleAnalysisPanelClick(event), "AI 분석 결과 이동 실패"));
    }
  }

  private async handleAnalysisPanelClick(event: SubtitleDomEvent): Promise<void> {
    const panel = this.optional("subtitle-analysis-panel");
    if (!panel) return;
    const target = closestWithData(event.target, "subtitleAction", panel);
    if (!target || target.disabled || target.dataset.subtitleAction !== "seek-analysis-cue") return;
    const cueId = target.dataset.cueId ?? "";
    if (cueId) await this.seekToWord(cueId);
  }

  private async importFromAdapter(): Promise<void> {
    if (!this.options.onImportSrt) throw new Error("자막 파일 선택 기능이 연결되지 않았습니다.");
    await this.runBusy("자막 불러오기", async () => {
      const source = await this.options.onImportSrt?.();
      if (source === null || source === undefined) return;
      this.importSubtitleText(source);
    });
  }

  private async exportToAdapter(): Promise<void> {
    if (!this.options.onExportSrt) throw new Error("SRT 파일 저장 기능이 연결되지 않았습니다.");
    await this.runBusy("SRT 내보내기", async () => {
      await this.options.onExportSrt?.(this.exportSrtText(), suggestedSrtName(this.projectKey));
      this.options.onActivity?.("SRT 자막을 내보냈습니다.");
    });
  }

  private async runBusy(label: string, task: () => Promise<void>): Promise<void> {
    if (this.busyAction) throw new Error(`${this.busyAction} 작업이 이미 진행 중입니다.`);
    this.busyAction = label;
    this.setStatus(`${label} 처리 중…`, "busy");
    this.renderControls();
    try {
      await task();
    } finally {
      this.busyAction = "";
      this.renderControls();
      this.setStatus("자막 편집기 준비", "ready");
    }
  }

  private selected(): { cueId: string; wordId: string } | null {
    return this.selectedCueId && this.selectedWordId
      ? { cueId: this.selectedCueId, wordId: this.selectedWordId }
      : null;
  }

  private async handleListClick(event: SubtitleDomEvent): Promise<void> {
    const list = this.required("subtitle-cue-list");
    const actionTarget = closestWithData(event.target, "subtitleAction", list);
    if (!actionTarget || actionTarget.disabled) return;
    const action = actionTarget.dataset.subtitleAction ?? "";
    const cueId = actionTarget.dataset.cueId ?? "";
    const wordId = actionTarget.dataset.wordId ?? "";
    if (action === "select-word") {
      this.selectedCueId = cueId;
      this.selectedWordId = wordId;
      await this.seekToWord(cueId, wordId);
      this.render();
      return;
    }
    if (action === "save-word") {
      const editor = this.findWordEditor(cueId, wordId);
      this.editWord(cueId, wordId, editor?.value ?? "");
    } else if (action === "toggle-word") this.toggleWordHidden(cueId, wordId);
    else if (action === "join-previous") this.joinWord(cueId, wordId, "previous");
    else if (action === "join-next") this.joinWord(cueId, wordId, "next");
    else if (action === "toggle-cue") this.toggleCueEnabled(cueId);
    else if (action === "split-cue") this.splitCueAtWord(cueId, wordId || this.selectedWordId);
    else if (action === "merge-previous") this.mergeCue(cueId, "previous");
    else if (action === "merge-next") this.mergeCue(cueId, "next");
  }

  private async handleListKeydown(event: SubtitleDomEvent): Promise<void> {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const list = this.required("subtitle-cue-list");
    const editor = closestWithData(event.target, "wordEditor", list);
    if (editor) {
      if (event.key === "Enter") {
        event.preventDefault();
        this.editWord(editor.dataset.cueId ?? "", editor.dataset.wordId ?? "", editor.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.selectedCueId = "";
        this.selectedWordId = "";
        this.render();
      }
      return;
    }
    const word = closestWithData(event.target, "wordId", list);
    if (!word) return;
    const cueId = word.dataset.cueId ?? "";
    const wordId = word.dataset.wordId ?? "";
    if (event.key === "h" || event.key === "H") {
      event.preventDefault();
      this.toggleWordHidden(cueId, wordId);
    } else if (event.key === "j" || event.key === "J") {
      event.preventDefault();
      this.joinWord(cueId, wordId, event.shiftKey ? "previous" : "next");
    } else if (event.key === "s" || event.key === "S") {
      event.preventDefault();
      this.splitCueAtWord(cueId, wordId);
    } else if (event.key === "e" || event.key === "E" || event.key === "F2") {
      event.preventDefault();
      this.selectedCueId = cueId;
      this.selectedWordId = wordId;
      this.render();
      this.findWordEditor(cueId, wordId)?.focus?.();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      await this.moveWordSelection(cueId, wordId, event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  private async moveWordSelection(cueId: string, wordId: string, delta: -1 | 1): Promise<void> {
    const cue = this.documentValue.cues.find((candidate) => candidate.cueId === cueId);
    const index = cue?.words.findIndex((word) => word.wordId === wordId) ?? -1;
    const next = cue?.words[index + delta];
    if (!next) return;
    this.selectedCueId = cueId;
    this.selectedWordId = next.wordId;
    await this.seekToWord(cueId, next.wordId);
    this.render();
    Array.from(this.required("subtitle-cue-list").querySelectorAll("[data-word-id]"))
      .find((element) => element.dataset.wordId === next.wordId && element.dataset.cueId === cueId)
      ?.focus?.();
  }

  private findWordEditor(cueId: string, wordId: string): SubtitleDomElement | null {
    return Array.from(this.required("subtitle-cue-list").querySelectorAll("[data-word-editor]"))
      .find((element) => element.dataset.cueId === cueId && element.dataset.wordId === wordId) ?? null;
  }

  private commit(next: SubtitleDocument, message: string): void {
    const safe = enforceDocumentLimits(next, this.maximumCues);
    this.documentValue = this.history.commit(safe);
    this.recordDocumentChange();
    this.reconcileSelection();
    this.analysisResult = null;
    this.render();
    this.renderAnalysisPanel();
    this.emitChange();
    this.scheduleAutosave();
    this.options.onActivity?.(message);
  }

  private afterHistoryChange(message: string): void {
    this.recordDocumentChange();
    this.reconcileSelection();
    this.analysisResult = null;
    this.render();
    this.renderAnalysisPanel();
    this.emitChange();
    this.scheduleAutosave();
    this.options.onActivity?.(message);
  }

  private reconcileSelection(): void {
    const cue = this.documentValue.cues.find((candidate) => candidate.cueId === this.selectedCueId);
    if (!cue?.words.some((word) => word.wordId === this.selectedWordId)) {
      this.selectedCueId = "";
      this.selectedWordId = "";
    }
  }

  private emitChange(): void {
    this.options.onChange?.(this.document);
  }

  private recordDocumentChange(): void {
    this.documentRevision += 1;
    let wordCount = 0;
    let disabled = 0;
    for (const cue of this.documentValue.cues) {
      wordCount += cue.words.length;
      if (!cue.enabled || cue.hidden) disabled += 1;
    }
    this.documentWordCount = wordCount;
    this.disabledCueCount = disabled;
  }

  private assertAiRequestCurrent(revision: number, loadGeneration: number, projectKey: string): void {
    if (
      revision !== this.documentRevision ||
      loadGeneration !== this.projectLoadGeneration ||
      projectKey !== this.projectKey
    ) {
      throw new Error("AI 작업 중 자막 문서가 변경되어 이전 결과를 적용하지 않았습니다.");
    }
  }

  private wordElementKey(cueId: string, wordId: string): string {
    return `${cueId}\u0000${wordId}`;
  }

  private scheduleAutosave(): void {
    if (!this.storage) return;
    if (this.autosaveTimer !== null) this.clearTimer(this.autosaveTimer);
    this.autosaveTimer = this.setTimer(() => {
      this.autosaveTimer = null;
      void this.flushAutosave().catch((error) => this.reportError(error, "자막 자동 저장 실패"));
    }, this.autosaveDelay);
  }

  private reportError(error: unknown, context: string): void {
    this.setStatus(error instanceof Error ? error.message : String(error), "error");
    this.options.onError?.(error, context);
  }

  private setStatus(message: string, state: "ready" | "busy" | "error"): void {
    const status = this.optional("subtitle-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.status = state;
  }

  private create(tagName: string, className = "", text = ""): SubtitleDomElement {
    const element = this.dom.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  private actionButton(
    label: string,
    action: string,
    cueId: string,
    wordId = "",
    disabled = false,
    className = "subtitle-action-button",
  ): SubtitleDomElement {
    const button = this.create("button", className, label);
    button.setAttribute("type", "button");
    button.dataset.subtitleAction = action;
    button.dataset.cueId = cueId;
    if (wordId) button.dataset.wordId = wordId;
    button.disabled = disabled || this.isBusy;
    return button;
  }

  private render(): void {
    const list = this.required("subtitle-cue-list");
    clearElementChildren(list);
    this.renderedCueElements.clear();
    this.renderedWordElements.clear();
    this.activeDomDirty = true;
    this.renderedCueCount = 0;
    this.renderedWordCount = 0;
    if (this.documentValue.cues.length === 0) {
      const empty = this.create("div", "subtitle-empty-state");
      empty.setAttribute("role", "status");
      const title = this.create("strong", "", "편집할 자막이 없습니다");
      const copy = this.create("p", "", "STT 결과를 연결하거나 SRT 파일을 불러와 주세요.");
      empty.append(title, copy);
      list.append(empty);
    } else {
      let remainingWords = this.domWordLimit;
      for (let index = 0; index < Math.min(this.domLimit, this.documentValue.cues.length); index += 1) {
        const cue = this.documentValue.cues[index];
        if (!cue || (remainingWords <= 0 && cue.words.length > 0)) break;
        const wordLimit = Math.min(cue.words.length, remainingWords);
        list.append(this.renderCue(cue, index, wordLimit));
        this.renderedCueCount += 1;
        this.renderedWordCount += wordLimit;
        remainingWords -= wordLimit;
      }
      if (this.renderedCueCount === 0) {
        list.append(this.create("p", "subtitle-dom-limit-note", "DOM 안전 제한으로 표시할 수 있는 자막이 없습니다. SRT 내보내기에는 전체 문서가 유지됩니다."));
      }
    }
    list.setAttribute("aria-busy", String(this.isBusy));
    this.renderControls();
    this.renderMeta();
    this.setStatus(this.busyAction ? `${this.busyAction} 처리 중…` : "자막 편집기 준비", this.busyAction ? "busy" : "ready");
    if (Number.isFinite(this.lastPlayheadSeconds)) this.updatePlayhead(this.lastPlayheadSeconds);
  }

  private renderCue(cue: SubtitleCue, index: number, wordLimit: number): SubtitleDomElement {
    const row = this.create("article", `subtitle-cue-row${cue.enabled ? "" : " is-disabled"}${cue.hidden ? " is-hidden" : ""}`);
    row.dataset.cueRow = "true";
    row.dataset.cueId = cue.cueId;
    this.renderedCueElements.set(cue.cueId, row);
    row.setAttribute("role", "listitem");
    row.setAttribute("aria-label", `${index + 1}번 자막, ${secondsToSrtTime(cue.start)}부터 ${secondsToSrtTime(cue.end)}까지`);

    const header = this.create("header", "subtitle-cue-header");
    const number = this.create("strong", "subtitle-cue-number", String(index + 1).padStart(2, "0"));
    const time = this.create("time", "subtitle-cue-time", `${secondsToSrtTime(cue.start)} → ${secondsToSrtTime(cue.end)}`);
    const count = this.create("span", `subtitle-char-count${cue.text.length > this.maxChars() ? " is-warning" : ""}`, `${cue.text.length}자`);
    const actions = this.create("div", "subtitle-cue-actions");
    const toggle = this.actionButton(cue.enabled ? "켜짐" : "꺼짐", "toggle-cue", cue.cueId, "", false);
    toggle.setAttribute("aria-pressed", String(cue.enabled));
    toggle.title = "자막 큐 활성화/비활성화";
    const selected = this.selectedCueId === cue.cueId ? this.selectedWordId : "";
    const selectedIndex = cue.words.findIndex((word) => word.wordId === selected);
    actions.append(
      this.actionButton("앞과 합치기", "merge-previous", cue.cueId, "", index === 0),
      this.actionButton("나누기", "split-cue", cue.cueId, selected, selectedIndex <= 0),
      this.actionButton("뒤와 합치기", "merge-next", cue.cueId, "", index === this.documentValue.cues.length - 1),
      toggle,
    );
    header.append(number, time, count, actions);

    const words = this.create("div", "subtitle-word-list");
    words.setAttribute("aria-label", `${index + 1}번 자막 단어`);
    if (cue.words.length === 0) words.append(this.create("span", "subtitle-plain-text", cue.text));
    cue.words.slice(0, wordLimit).forEach((word) => {
      const selectedWord = this.selectedCueId === cue.cueId && this.selectedWordId === word.wordId;
      const button = this.actionButton(
        word.t,
        "select-word",
        cue.cueId,
        word.wordId,
        !cue.enabled,
        `subtitle-word${word.hidden ? " is-hidden" : ""}${selectedWord ? " is-selected" : ""}`,
      );
      button.dataset.wordId = word.wordId;
      button.setAttribute("aria-pressed", String(selectedWord));
      button.setAttribute("aria-label", `${word.t}, ${secondsToSrtTime(word.s)}${word.hidden ? ", 숨김" : ""}`);
      button.title = "클릭: 재생 위치 이동 · E/F2: 수정 · H: 숨김 · J: 뒤 단어와 붙이기 · S: 큐 나누기";
      this.renderedWordElements.set(this.wordElementKey(cue.cueId, word.wordId), button);
      words.append(button);
    });
    if (wordLimit < cue.words.length) {
      const remainder = this.create("span", "subtitle-dom-limit-note", `+${(cue.words.length - wordLimit).toLocaleString("ko-KR")}개 단어 DOM 생략`);
      remainder.title = "성능 보호를 위해 화면 렌더링만 생략했습니다. 문서·SRT에는 전체 단어가 유지됩니다.";
      words.append(remainder);
    }
    row.append(header, words);
    if (selectedIndex >= 0) row.append(this.renderWordEditor(cue, selectedIndex));
    return row;
  }

  private renderWordEditor(cue: SubtitleCue, wordIndex: number): SubtitleDomElement {
    const word = cue.words[wordIndex];
    if (!word) return this.create("div");
    const cueId = cue.cueId;
    const editor = this.create("div", "subtitle-word-editor-row");
    const label = this.create("label", "sr-only", "선택한 단어 수정");
    const input = this.create("input", "subtitle-word-editor");
    input.value = word.t;
    input.dataset.wordEditor = "true";
    input.dataset.cueId = cueId;
    input.dataset.wordId = word.wordId;
    input.setAttribute("type", "text");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", `${word.t} 단어 수정`);
    const actions = this.create("div", "subtitle-word-editor-actions");
    actions.append(
      this.actionButton("저장", "save-word", cueId, word.wordId),
      this.actionButton(word.hidden ? "숨김 해제" : "숨기기", "toggle-word", cueId, word.wordId),
      this.actionButton("앞 단어와 붙이기", "join-previous", cueId, word.wordId, wordIndex === 0),
      this.actionButton("뒤 단어와 붙이기", "join-next", cueId, word.wordId, wordIndex === cue.words.length - 1),
    );
    editor.append(label, input, actions);
    return editor;
  }

  private renderControls(): void {
    const empty = this.documentValue.cues.length === 0;
    const states: Array<[string, boolean]> = [
      ["subtitle-undo-btn", !this.history.canUndo],
      ["subtitle-redo-btn", !this.history.canRedo],
      ["subtitle-reflow-btn", empty],
      ["subtitle-export-btn", empty || !this.options.onExportSrt],
      ["subtitle-ai-reflow-btn", empty || !this.options.aiProvider],
      ["subtitle-ai-review-btn", empty || !this.options.aiProvider],
      ["subtitle-ai-translate-btn", empty || !this.options.aiProvider],
      ["subtitle-ai-highlight-btn", empty || !this.options.analysisProvider],
      ["subtitle-ai-outline-btn", empty || !this.options.analysisProvider],
      ["subtitle-ai-youtube-btn", empty || !this.options.analysisProvider],
      ["subtitle-import-btn", !this.options.onImportSrt],
    ];
    states.forEach(([id, disabled]) => {
      const element = this.optional(id);
      if (element) element.disabled = disabled || this.isBusy;
    });
    const root = this.optional("subtitle-editor");
    root?.setAttribute("aria-busy", String(this.isBusy));
  }

  private cueLabel(cueId: string): string {
    const cue = this.documentValue.cues.find((candidate) => candidate.cueId === cueId);
    if (!cue) return cueId;
    const text = cue.text.length > 24 ? `${cue.text.slice(0, 24)}…` : cue.text;
    return `${secondsToSrtTime(cue.start).slice(0, 8)} ${text}`;
  }

  private seekButton(cueId: string): SubtitleDomElement {
    // Carries data-subtitle-action/data-cue-id for the delegated panel handler;
    // no per-button listener so repeated renders never leak cleanups.
    return this.actionButton(this.cueLabel(cueId), "seek-analysis-cue", cueId);
  }

  private renderAnalysisPanel(): void {
    const panel = this.optional("subtitle-analysis-panel");
    if (!panel) return;
    clearElementChildren(panel);
    const result = this.analysisResult;
    if (!result) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;

    if (result.action === "interview-highlight") {
      if (result.highlights.length === 0) {
        panel.append(this.create("p", "subtitle-analysis-empty", "유효한 하이라이트를 찾지 못했습니다."));
        return;
      }
      const list = this.create("ul", "subtitle-analysis-list");
      for (const highlight of result.highlights) {
        const item = this.create("li", "subtitle-analysis-item");
        item.append(this.seekButton(highlight.cueId), this.create("span", "subtitle-analysis-reason", highlight.reason));
        list.append(item);
      }
      panel.append(list);
      return;
    }

    if (result.action === "edit-outline") {
      if (result.segments.length === 0) {
        panel.append(this.create("p", "subtitle-analysis-empty", "구성안을 생성하지 못했습니다."));
        return;
      }
      const list = this.create("ol", "subtitle-analysis-list");
      for (const segment of result.segments) {
        const item = this.create("li", "subtitle-analysis-item");
        const cues = this.create("div", "subtitle-analysis-cues");
        segment.cueIds.forEach((cueId) => cues.append(this.seekButton(cueId)));
        item.append(
          this.create("strong", "", `${segment.order}. ${segment.label}`),
          this.create("span", "subtitle-analysis-reason", segment.reason),
          cues,
        );
        list.append(item);
      }
      panel.append(list);
      return;
    }

    // shorts-plan은 자동 컷 카드에서 별도로 렌더하며 이 분석 패널에는 표시하지 않는다.
    if (result.action !== "youtube-metadata") return;

    const copy = this.create("div", "subtitle-analysis-youtube");
    copy.append(
      this.create("p", "subtitle-analysis-youtube-title", result.title),
      this.create("p", "subtitle-analysis-youtube-description", result.description),
      this.create("p", "subtitle-analysis-youtube-tags", result.tags.map((tag) => `#${tag}`).join(" ")),
    );
    panel.append(copy);
  }

  private renderMeta(): void {
    const meta = this.optional("subtitle-meta");
    if (!meta) return;
    const cueCount = this.documentValue.cues.length;
    const wordCount = this.documentWordCount;
    const disabled = this.disabledCueCount;
    meta.textContent = `${cueCount.toLocaleString("ko-KR")}개 큐 · ${wordCount.toLocaleString("ko-KR")}개 단어 · 비활성 ${disabled.toLocaleString("ko-KR")}개 · DOM 큐 ${this.renderedCueCount.toLocaleString("ko-KR")}/${cueCount.toLocaleString("ko-KR")} · 단어 ${this.renderedWordCount.toLocaleString("ko-KR")}/${wordCount.toLocaleString("ko-KR")} · 최대 ${this.maxChars()}자`;
    const truncated = this.renderedCueCount < cueCount || this.renderedWordCount < wordCount;
    meta.classList.toggle("is-warning", truncated);
    meta.title = truncated
      ? `성능 보호를 위해 최대 ${this.domLimit.toLocaleString("ko-KR")}개 큐와 ${this.domWordLimit.toLocaleString("ko-KR")}개 단어만 화면에 렌더링합니다. 전체 문서는 저장·내보내기에 유지됩니다.`
      : "전체 자막 큐를 표시하고 있습니다.";
  }
}
