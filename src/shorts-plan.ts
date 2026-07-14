// 모델이 제안한 숏폼 플랜(cueId 집합)을 검증된 컷 구간 세그먼트로 변환하는 순수 로직
import type { SubtitleDocument, SubtitleWord } from "./subtitles";
import type { ShortsPlanItem } from "./subtitle-controller";
import { DEFAULT_HIGHLIGHT_CUT_OPTIONS, type HighlightCutOptions, type HighlightCutSegment } from "./highlight-cut";

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// 한 cue를 중간에서 잘라야 할 때 limit 이하의 마지막 단어 끝(무음 경계)에 스냅한다.
function wordSnapEnd(words: SubtitleWord[], start: number, limit: number): number {
  let best = start;
  for (const word of words) {
    if (typeof word.e === "number" && Number.isFinite(word.e)
      && word.e > start && word.e <= limit && word.e > best) {
      best = word.e;
    }
  }
  return best > start ? best : limit;
}

/**
 * shorts-plan 모델 응답을 컷 구간 후보로 변환한다. 존재하는 cueId만 시간으로 매핑하고,
 * maxDuration 클램프(워드 스냅)·score 정제·겹침 제거·상한을 적용한다. 결정적 순수 함수.
 * 출력 타입은 planHighlightCuts와 동일해 UI·일괄 생성 매핑을 그대로 재사용한다.
 */
export function segmentsFromModelPlan(
  document: SubtitleDocument,
  shorts: ShortsPlanItem[],
  options?: Partial<HighlightCutOptions>,
): HighlightCutSegment[] {
  const maxDuration = Math.max(2, num(options?.maxDuration, DEFAULT_HIGHLIGHT_CUT_OPTIONS.maxDuration));
  const maxSegments = Math.max(1, Math.round(num(options?.maxSegments, DEFAULT_HIGHLIGHT_CUT_OPTIONS.maxSegments)));
  const byId = new Map(document.cues.map((cue) => [cue.cueId, cue]));

  const built: HighlightCutSegment[] = [];
  for (const short of shorts) {
    if (!short || !Array.isArray(short.cueIds)) continue;
    const cues = short.cueIds
      .map((id) => byId.get(id))
      .filter((cue): cue is NonNullable<typeof cue> => Boolean(cue)
        && Number.isFinite(cue!.start) && Number.isFinite(cue!.end) && cue!.end > cue!.start)
      .sort((a, b) => a.start - b.start);
    if (cues.length === 0) continue;

    const start = cues[0]!.start;
    let end = cues[cues.length - 1]!.end;
    if (end - start > maxDuration) {
      end = wordSnapEnd(cues[cues.length - 1]!.words ?? [], start, start + maxDuration);
    }
    if (!(end > start)) continue;

    const score = typeof short.score === "number" && Number.isFinite(short.score)
      ? Math.min(1, Math.max(0, short.score)) : 0.5;
    const title = (typeof short.title === "string" ? short.title.trim() : "").slice(0, 60)
      || `숏폼 ${built.length + 1}`;
    const reason = ((typeof short.reason === "string" ? short.reason.trim() : "")
      || (typeof short.hook === "string" ? short.hook.trim() : "")).slice(0, 200);

    built.push({
      start,
      end,
      duration: end - start,
      cueIds: cues.map((cue) => cue.cueId),
      title,
      reason,
      score: Math.round(score * 1000) / 1000,
      highlightCount: cues.length,
    });
  }

  built.sort((a, b) => b.score - a.score || a.start - b.start);
  const accepted: HighlightCutSegment[] = [];
  for (const segment of built) {
    if (segment.duration < 1) continue;
    if (accepted.some((a) => a.start < segment.end && segment.start < a.end)) continue;
    accepted.push(segment);
    if (accepted.length >= maxSegments) break;
  }
  return accepted;
}
