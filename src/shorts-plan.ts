// 모델이 제안한 숏폼 플랜(cueId 집합)을 검증된 컷 구간 세그먼트로 변환하는 순수 로직
import type { SubtitleDocument, SubtitleWord } from "./subtitles";
import type { ShortsPlanItem } from "./subtitle-controller";
import { DEFAULT_HIGHLIGHT_CUT_OPTIONS, type HighlightCutOptions, type HighlightCutSegment } from "./highlight-cut";
import { snapCutPointToSilence, type SilenceGap } from "./audio-silence";

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
    // 겹치는 cue에서 잘리지 않도록 시작이 가장 이르지 않아도 실제 가장 늦게 끝나는 cue를 쓴다.
    const endCue = cues.reduce((latest, cue) => (cue.end > latest.end ? cue : latest), cues[0]!);
    let end = endCue.end;
    if (end - start > maxDuration) {
      end = wordSnapEnd(endCue.words ?? [], start, start + maxDuration);
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

/**
 * 컷 구간의 시작·끝을 근처 무음 gap 경계에 스냅한다(자연스러운 컷). 순수 함수.
 * 시퀀스 오디오에서 detectSilenceGaps로 얻은 gap을 넘기면 되고, gap이 없으면 그대로 둔다.
 * 스냅이 구간을 뒤집거나 1초 미만으로 무너뜨리면 해당 구간은 원본을 유지한다.
 */
export function snapSegmentsToSilence(
  segments: HighlightCutSegment[],
  gaps: SilenceGap[],
  maxShiftSeconds: number,
): HighlightCutSegment[] {
  if (!Array.isArray(gaps) || gaps.length === 0) return segments;
  return segments.map((segment) => {
    const start = snapCutPointToSilence(segment.start, gaps, maxShiftSeconds);
    const end = snapCutPointToSilence(segment.end, gaps, maxShiftSeconds);
    if (!(start >= 0) || !(end - start >= 1)) return segment;
    return { ...segment, start, end, duration: end - start };
  });
}
