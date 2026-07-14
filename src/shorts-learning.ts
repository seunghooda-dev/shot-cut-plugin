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

export interface StyleExampleChoice {
  cueIds: string[];
  title: string;
  durationSeconds: number;
}

export interface StyleExample {
  transcript: string;
  chosen: StyleExampleChoice[];
}

/**
 * 정렬 결과(원본에서 숏폼이 된 span들)를 few-shot 스타일 예시로 만든다.
 * "이 전사에서 사용자는 이 cueId들을 이 제목·길이의 숏폼으로 골랐다"를 시연한다.
 */
export function buildStyleExample(
  originalDoc: SubtitleDocument,
  spans: AlignSpan[],
  meta?: { title?: string },
): StyleExample | null {
  const byId = new Map(originalDoc.cues.map((cue) => [cue.cueId, cue]));
  const chosen: StyleExampleChoice[] = [];
  const included = new Set<string>();
  for (const span of spans) {
    const cues = span.cueIds
      .map((id) => byId.get(id))
      .filter((cue): cue is NonNullable<typeof cue> => Boolean(cue));
    if (cues.length === 0) continue;
    for (const cue of cues) included.add(cue.cueId);
    const start = Math.min(...cues.map((cue) => cue.start));
    const end = Math.max(...cues.map((cue) => cue.end));
    chosen.push({
      cueIds: cues.map((cue) => cue.cueId),
      title: (typeof meta?.title === "string" && meta.title.trim() ? meta.title : cues[0]!.text).trim().slice(0, 60),
      durationSeconds: Math.round((end - start) * 10) / 10,
    });
  }
  if (chosen.length === 0) return null;
  const lines: string[] = [];
  for (const cue of originalDoc.cues) {
    if (included.has(cue.cueId)) lines.push(`[${cue.cueId}] ${cue.text}`);
  }
  return { transcript: lines.join("\n"), chosen };
}

export interface StyleProfile {
  exampleCount: number;
  avgDurationSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
}

/** 여러 스타일 예시를 압축한 프로필(선호 길이 범위). verbatim 예시와 함께 프롬프트에 얹어 스타일 신호를 강화한다. */
export function distillStyleProfile(examples: StyleExample[]): StyleProfile | null {
  const durations: number[] = [];
  for (const example of examples) {
    for (const choice of example.chosen) {
      if (typeof choice.durationSeconds === "number" && choice.durationSeconds > 0) {
        durations.push(choice.durationSeconds);
      }
    }
  }
  if (durations.length === 0) return null;
  const sum = durations.reduce((total, value) => total + value, 0);
  return {
    exampleCount: examples.length,
    avgDurationSeconds: Math.round(sum / durations.length),
    minDurationSeconds: Math.round(Math.min(...durations)),
    maxDurationSeconds: Math.round(Math.max(...durations)),
  };
}

/** 스타일 프로필을 프롬프트용 한 줄 가이드로 만든다. */
export function formatStyleProfileForPrompt(profile: StyleProfile | null): string {
  if (!profile) return "";
  return `The user's past shorts run about ${profile.minDurationSeconds}-${profile.maxDurationSeconds}s (average ~${profile.avgDurationSeconds}s). Prefer clip lengths in that range.`;
}

/** 스타일 예시들을 shorts-plan 프롬프트에 넣을 few-shot 텍스트로 직렬화한다. */
export function formatStyleExamplesForPrompt(examples: StyleExample[]): string {
  const blocks: string[] = [];
  for (const example of examples) {
    if (!example || !example.transcript || example.chosen.length === 0) continue;
    const chosen = example.chosen
      .map((choice) => `{"cueIds": ${JSON.stringify(choice.cueIds)}, "title": ${JSON.stringify(choice.title)}, "durationSeconds": ${choice.durationSeconds}}`)
      .join(", ");
    blocks.push(`Transcript:\n${example.transcript}\nChosen shorts: [${chosen}]`);
  }
  return blocks.join("\n\n");
}

/**
 * SRT 파일 2개로 쌍을 등록할 때 어느 쪽이 원본인지 자동 판별한다. 원본은 항상 숏폼보다
 * 실질적으로 길다(총 길이 1.5배·cue 수 기준 병행 확인). 애매하면 null — 호출부가 사용자에게
 * 순서를 확인한다. 결정적 순수 함수.
 */
export function classifyStylePair(
  a: SubtitleDocument,
  b: SubtitleDocument,
): { original: SubtitleDocument; short: SubtitleDocument } | null {
  const durationOf = (doc: SubtitleDocument): number => {
    let max = 0;
    for (const cue of doc.cues) { if (cue.end > max) max = cue.end; }
    return max;
  };
  const durA = durationOf(a);
  const durB = durationOf(b);
  if (!(durA > 0) || !(durB > 0)) return null;
  const longerIsA = durA >= durB;
  const ratio = longerIsA ? durA / durB : durB / durA;
  const cueRatio = longerIsA
    ? a.cues.length / Math.max(1, b.cues.length)
    : b.cues.length / Math.max(1, a.cues.length);
  // 길이 1.5배 이상이면 명확. 1.2~1.5배는 cue 수까지 원본이 우세할 때만 인정.
  if (ratio >= 1.5 || (ratio >= 1.2 && cueRatio >= 1.2)) {
    return longerIsA ? { original: a, short: b } : { original: b, short: a };
  }
  return null;
}
