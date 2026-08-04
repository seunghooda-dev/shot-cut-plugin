import type { AutomationTranscript } from "./automation-controller";
import type { SpeechControllerTranscript } from "./speech-controller";
import type { SubtitleCue, SubtitleDocument, SubtitleWord } from "./subtitles";

export const SUBTITLE_AUTOMATION_TRANSCRIPT_PREFIX = "자막";
// §189 #3(사용자 확정): 자동 편집 원고가 어느 소스 기준인지 상태줄에서 드러나야 한다 —
// STT가 있는 동안 자막 편집이 반영되지 않는 규칙을 이 라벨이 사용자에게 설명한다.
export const STT_AUTOMATION_TRANSCRIPT_PREFIX = "STT 원본";

function visibleWords(cue: SubtitleCue): SubtitleWord[] {
  return cue.words.filter((word) => !word.hidden && word.t.trim());
}

function visibleCueText(cue: SubtitleCue): string {
  const words = visibleWords(cue);
  if (words.length > 0) return words.map((word) => word.t.trim()).filter(Boolean).join(" ").trim();
  return cue.text.trim();
}

export function subtitleDocumentToAutomationTranscript(document: SubtitleDocument): AutomationTranscript | null {
  const segments = document.cues
    .filter((cue) => cue.enabled && !cue.hidden && cue.end > cue.start)
    .map((cue) => ({
      start: cue.start,
      end: cue.end,
      text: visibleCueText(cue),
    }))
    .filter((segment) => segment.text.length > 0);

  if (segments.length === 0) return null;
  return {
    name: `${SUBTITLE_AUTOMATION_TRANSCRIPT_PREFIX}: ${document.projectKey}`,
    // 한계(§189 감사 #14): 자막 문서에는 시퀀스 실제 길이가 없어 마지막 발화 끝을 쓴다 —
    // 끝에 무음 여백이 있는 시퀀스에서는 복구 저널의 원본 길이가 짧게 기록되고 후미 무음이
    // trimTrailing 대상에서 빠진다. 정확한 길이가 필요하면 호출부가 시퀀스 길이를 따로 대야 한다.
    duration: Math.max(...segments.map((segment) => segment.end)),
    segments,
  };
}

export function speechControllerTranscriptToAutomationTranscript(
  transcript: SpeechControllerTranscript,
): AutomationTranscript {
  return {
    name: `${STT_AUTOMATION_TRANSCRIPT_PREFIX}: ${transcript.name}`,
    duration: transcript.duration,
    segments: transcript.result.segments,
  };
}

export function resolveAutomationTranscript(
  speechTranscript: SpeechControllerTranscript | null | undefined,
  subtitleDocument: SubtitleDocument | null | undefined,
): AutomationTranscript | null {
  if (speechTranscript) return speechControllerTranscriptToAutomationTranscript(speechTranscript);
  return subtitleDocument ? subtitleDocumentToAutomationTranscript(subtitleDocument) : null;
}
