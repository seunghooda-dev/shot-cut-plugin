// 사용자의 (원본+숏폼) 샘플에서 편집 스타일을 few-shot 예시로 학습하는 순수 로직
import type { SubtitleDocument } from "./subtitles";

export interface AlignSpan {
  cueIds: string[];
}

export interface AlignResult {
  spans: AlignSpan[];
  coverage: number;
}

export interface AlignOptions {
  // 원본 cue의 토큰 중 이 비율 이상이 숏폼에 나타나면 그 cue가 숏폼에 쓰였다고 본다.
  minContainment: number;
  // 숏폼 토큰의 이 비율 미만이 원본에서 설명되면 정렬 실패(다른 영상·재더빙)로 본다.
  minCoverage: number;
}

const DEFAULT_ALIGN_OPTIONS: Readonly<AlignOptions> = Object.freeze({
  minContainment: 0.6,
  minCoverage: 0.5,
});

// 소문자화 + 문장부호 제거 후 토큰화(한글·라틴·숫자 유지).
function tokenize(text: string): string[] {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/**
 * 숏폼 전사를 원본 자막에 매칭해 "원본의 어느 cue가 숏폼이 됐는지" 역추적한다.
 * 결정적 순수 함수. 숏폼이 원본 오디오를 잘라 쓴 경우 잘 맞고, 재더빙·무음 재편집이면
 * coverage가 낮아 spans가 비며(정렬 실패), 호출부는 수동 폴백으로 처리한다.
 */
export function alignShortToOriginal(
  originalDoc: SubtitleDocument,
  shortDoc: SubtitleDocument,
  options?: Partial<AlignOptions>,
): AlignResult {
  const minContainment = num(options?.minContainment, DEFAULT_ALIGN_OPTIONS.minContainment);
  const minCoverage = num(options?.minCoverage, DEFAULT_ALIGN_OPTIONS.minCoverage);

  const original = originalDoc.cues.filter((c) => c.enabled && !c.hidden);
  if (original.length === 0) return { spans: [], coverage: 0 };

  const shortTokenSet = new Set<string>();
  for (const cue of shortDoc.cues) {
    if (!cue.enabled || cue.hidden) continue;
    for (const token of tokenize(cue.text)) shortTokenSet.add(token);
  }
  if (shortTokenSet.size === 0) return { spans: [], coverage: 0 };

  // 원본 cue별로 "숏폼에 쓰였는가" 판정 + 매칭된 cue들의 토큰 합집합.
  const used: boolean[] = [];
  const matchedTokens = new Set<string>();
  for (const cue of original) {
    const tokens = tokenize(cue.text);
    if (tokens.length === 0) {
      used.push(false);
      continue;
    }
    let present = 0;
    for (const token of tokens) if (shortTokenSet.has(token)) present += 1;
    const isUsed = present / tokens.length >= minContainment;
    used.push(isUsed);
    if (isUsed) for (const token of tokens) matchedTokens.add(token);
  }

  // 숏폼 토큰 중 원본으로 설명되는 비율 = 정렬 신뢰도.
  let covered = 0;
  for (const token of shortTokenSet) if (matchedTokens.has(token)) covered += 1;
  const coverage = covered / shortTokenSet.size;
  if (coverage < minCoverage) return { spans: [], coverage };

  // 연속된 used cue를 하나의 span으로 묶는다(숏폼이 여러 순간을 편집했으면 다중 span).
  const spans: AlignSpan[] = [];
  let current: string[] | null = null;
  for (let i = 0; i < original.length; i += 1) {
    if (used[i]) {
      if (!current) {
        current = [];
        spans.push({ cueIds: current });
      }
      current.push(original[i]!.cueId);
    } else {
      current = null;
    }
  }
  return { spans, coverage };
}
