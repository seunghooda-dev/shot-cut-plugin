// 다국어 패키지 v1 — 대상 언어 정의·파일명 규칙·매니페스트 빌더 순수 계층(번역 AI 호출은 index.ts 담당)
import { sanitizeFileName } from "./core";

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
