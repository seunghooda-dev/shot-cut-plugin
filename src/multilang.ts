// 다국어 패키지 v1 — 대상 언어 정의·파일명 규칙·내보내기 전용 번역 검증·매니페스트 빌더 순수 계층
import { sanitizeFileName } from "./core";
import { secondsToSrtTime, type SubtitleDocument } from "./subtitles";

export interface MultilangTarget {
  /** 파일명에 쓰는 짧은 코드. */
  code: string;
  /** AI 번역 프롬프트에 전달하는 대상 언어 라벨(영문 — safeTargetLanguage 정화 대상). */
  label: string;
  /** UI에 보여줄 한국어 이름. */
  koreanName: string;
}

export const MULTILANG_TARGETS: readonly MultilangTarget[] = [
  { code: "en", label: "English", koreanName: "영어" },
  { code: "ja", label: "Japanese", koreanName: "일본어" },
  { code: "zh", label: "Chinese (Simplified)", koreanName: "중국어(간체)" },
  { code: "es", label: "Spanish", koreanName: "스페인어" },
  { code: "id", label: "Indonesian", koreanName: "인도네시아어" },
  { code: "vi", label: "Vietnamese", koreanName: "베트남어" },
];

export function multilangTargetByCode(code: string): MultilangTarget | null {
  return MULTILANG_TARGETS.find((target) => target.code === code) ?? null;
}

export function multilangSrtFileName(baseName: string, code: string): string {
  const base = sanitizeFileName(baseName.trim() || "ShortFlow").replace(/\.+$/u, "");
  return `${base}.${code}.srt`;
}

export interface MultilangResult {
  code: string;
  koreanName: string;
  file: string;
  cueCount: number;
}

export interface MultilangFailure {
  code: string;
  koreanName: string;
  error: string;
}

/** 패키지 요약 매니페스트(Markdown) — 성공·실패 언어와 파일 목록을 남긴다. */
export function buildMultilangManifest(
  baseName: string,
  timestamp: string,
  results: readonly MultilangResult[],
  failures: readonly MultilangFailure[],
): string {
  const lines = [
    `# ${baseName} 다국어 자막 패키지`,
    "",
    `생성: ${timestamp} · ShortFlow Studio`,
    "",
    "## 생성된 자막",
  ];
  if (results.length === 0) {
    lines.push("- (없음)");
  } else {
    lines.push(...results.map((result) => `- ${result.koreanName} (${result.code}) — ${result.file} · 큐 ${result.cueCount}개`));
  }
  if (failures.length > 0) {
    lines.push("", "## 실패한 언어", ...failures.map((failure) => `- ${failure.koreanName} (${failure.code}) — ${failure.error}`));
  }
  lines.push("", "타이밍·cueId는 원본과 동일하게 유지됩니다. TTS 더빙과 언어별 썸네일은 이 버전에 포함되지 않습니다.", "");
  return lines.join("\n");
}

export function multilangManifestFileName(baseName: string): string {
  const base = sanitizeFileName(baseName.trim() || "ShortFlow").replace(/\.+$/u, "");
  return `${base}.multilang.md`;
}

export interface TranslatedCue {
  start: number;
  end: number;
  text: string;
}

const MAX_TRANSLATION_PAYLOAD_CHARS = 2_000_000;
const MAX_TRANSLATED_TEXT_CHARS = 2_000;

/**
 * 내보내기 전용 관대 검증 — 큐 수·cueId 순서·타이밍은 강제하되 단어 토큰은 요구하지 않는다.
 * 일본어·중국어처럼 띄어쓰기가 없는 언어는 단어 수 보존(뮤테이션 경로의 엄격 규칙)이 자주 깨지는데,
 * SRT 파일은 큐 텍스트만 쓰므로 이 경로에서는 그 규칙이 불필요하다. 시각은 원본 값을 그대로 쓴다.
 */
export function validateTranslatedCuesForExport(payload: unknown, original: SubtitleDocument): TranslatedCue[] {
  let value: unknown = payload;
  if (typeof value === "string") {
    if (value.length > MAX_TRANSLATION_PAYLOAD_CHARS) throw new Error("번역 응답이 허용 크기를 초과했습니다.");
    value = JSON.parse(value) as unknown;
  }
  if (value && typeof value === "object" && "document" in (value as Record<string, unknown>)) {
    value = (value as Record<string, unknown>).document;
  }
  const cues = value && typeof value === "object" ? (value as Record<string, unknown>).cues : null;
  if (!Array.isArray(cues) || cues.length !== original.cues.length) {
    throw new Error("번역 응답의 큐 개수가 원본과 다릅니다.");
  }
  return original.cues.map((originalCue, index) => {
    const cue = cues[index];
    if (!cue || typeof cue !== "object") throw new Error(`번역 큐 ${index + 1}이 객체가 아닙니다.`);
    const record = cue as Record<string, unknown>;
    if (record.cueId !== originalCue.cueId) throw new Error(`번역 큐 ${index + 1}의 cueId가 원본과 다릅니다.`);
    for (const key of ["start", "end"] as const) {
      const numeric = record[key];
      if (typeof numeric !== "number" || Math.abs(numeric - originalCue[key]) > 0.001) {
        throw new Error(`번역 큐 ${index + 1}의 시간이 원본과 다릅니다.`);
      }
    }
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) throw new Error(`번역 큐 ${index + 1}의 텍스트가 비어 있습니다.`);
    return { start: originalCue.start, end: originalCue.end, text: text.slice(0, MAX_TRANSLATED_TEXT_CHARS) };
  });
}

/** 검증된 번역 큐를 SRT 문자열로 만든다(빈 배열이면 빈 문자열). */
export function translatedCuesToSrt(cues: readonly TranslatedCue[]): string {
  if (cues.length === 0) return "";
  return cues
    .map((cue, index) => `${index + 1}\n${secondsToSrtTime(cue.start)} --> ${secondsToSrtTime(cue.end)}\n${cue.text}`)
    .join("\n\n") + "\n";
}
