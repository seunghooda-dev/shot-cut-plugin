// 자막 문서를 Premiere 텍스트 패널 트랜스크립트 JSON(세그먼트·단어)으로 변환하는 순수 계층
import type { SubtitleCue, SubtitleDocument, SubtitleWord } from "./subtitles";

export interface BuildPremiereTranscriptOptions {
  /** Premiere 트랜스크립트 언어 코드(소문자, 예: "ko-kr"). */
  language?: string;
  /** 텍스트 패널에 표시할 화자 이름. */
  speakerName?: string;
  /** 화자 id 생성기(테스트 재현성 주입용). 기본은 무작위 UUID v4. */
  uuid?: () => string;
}

export interface PremiereTranscriptBuild {
  json: string;
  segmentCount: number;
  wordCount: number;
}

const MIN_DURATION = 0.001;
const WORD_CONFIDENCE = 0.95;

function randomUuidV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/gu, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function visibleWords(cue: SubtitleCue): SubtitleWord[] {
  return cue.words.filter((word) => !word.hidden && word.t.trim().length > 0);
}

/**
 * SRT 내보내기와 같은 노출 규칙(enabled·비숨김·비어있지 않음)으로 자막을
 * Premiere 트랜스크립트 스키마(초 단위, 단어별 eos)로 변환한다.
 * 실제 첨부는 premiere.attachTranscriptToActiveSequence가 수행한다.
 */
export function buildPremiereTranscript(
  document: SubtitleDocument,
  options: BuildPremiereTranscriptOptions = {},
): PremiereTranscriptBuild {
  const language = (options.language ?? "ko-kr").trim().toLowerCase() || "ko-kr";
  const speakerId = (options.uuid ?? randomUuidV4)();
  const cues = document.cues.filter((cue) => cue.enabled && !cue.hidden && cue.text.trim().length > 0);
  let wordCount = 0;
  const segments = cues.map((cue) => {
    const words = visibleWords(cue);
    // 단어 타이밍이 전부 숨겨진 큐는 큐 전체를 한 단어로 강등해 시간 정보를 보존한다.
    const source = words.length > 0
      ? words.map((word) => ({ text: word.t.trim(), start: word.s, duration: Math.max(word.e - word.s, MIN_DURATION) }))
      : [{ text: cue.text.trim(), start: cue.start, duration: Math.max(cue.end - cue.start, MIN_DURATION) }];
    wordCount += source.length;
    return {
      start: cue.start,
      duration: Math.max(cue.end - cue.start, MIN_DURATION),
      language,
      speaker: speakerId,
      words: source.map((word, index) => ({
        confidence: WORD_CONFIDENCE,
        duration: word.duration,
        eos: index === source.length - 1,
        start: word.start,
        tags: [] as string[],
        text: word.text,
        type: "word" as const,
      })),
    };
  });
  const transcript = {
    language,
    segments,
    speakers: [{ id: speakerId, name: options.speakerName?.trim() || "화자 1" }],
  };
  return { json: JSON.stringify(transcript), segmentCount: segments.length, wordCount };
}
