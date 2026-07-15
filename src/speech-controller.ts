import {
  importAndInsertAsset,
  importFilesToProject,
  readActiveContextKey,
  type InsertAssetOptions,
} from "./premiere";
import {
  SpeechApiClient,
  STT_MODELS,
  isEmptyTranscriptError,
  isSttTimeoutError,
  mergeSttChunkResults,
  TTS_MODELS,
  TTS_VOICES,
  type SttModel,
  type SttRequest,
  type SttResult,
  type TtsFormat,
  type TtsModel,
  type TtsRequest,
  type TtsResult,
  type TtsVoice,
  validateSttResult,
  validateTtsResult,
} from "./speech";
import {
  SpeechFileError,
  SpeechFileManager,
  classifySttInput,
  createDefaultSpeechFileAdapter,
  folderInsidePluginTree,
  sttMimeType,
  type SpeechInputFile,
  type SpeechOutputFolder,
  type SpeechWriteResult,
} from "./speech-files";
import type { PluginSettings } from "./settings";
import { bind, checkedOf, element, numberOf, setPathValue, setText, valueOf } from "./ui";
import { encodeWavPcm16, parseWavPcm } from "./wav-pcm";
import { detectSilenceGaps, planChunkBoundaries } from "./audio-silence";

export interface SpeechControllerTranscript {
  name: string;
  duration: number;
  result: SttResult;
}

export interface SpeechHostAdapter {
  getContextKey(): Promise<string>;
  importAndInsertAsset(nativePath: string, options: InsertAssetOptions): Promise<void>;
  importFilesToProject(paths: readonly string[], expectedContextKey?: string): Promise<number>;
}

export interface SpeechControllerOptions {
  getSettings: () => PluginSettings;
  updateSettings: (patch: Partial<PluginSettings>) => void;
  onActivity?: (message: string) => void;
  onWarning?: (message: string) => void;
  onError?: (error: unknown, context: string) => void;
  onTranscript?: (transcript: SpeechControllerTranscript) => void;
  onTtsOutput?: (output: SpeechWriteResult, request: TtsRequest, result: TtsResult) => void | Promise<void>;
  onSourceChange?: () => void;
  fileManager?: SpeechFileManager;
  createClient?: (settings: PluginSettings) => SpeechApiClient;
  ensureAiConsent?: () => void | Promise<void>;
  runTts?: (request: TtsRequest) => Promise<TtsResult>;
  runStt?: (request: SttRequest) => Promise<SttResult>;
  hostAdapter?: SpeechHostAdapter;
  now?: () => number;
  /** 이 길이(초)를 넘는 WAV는 무음 경계에서 분할 전사한다(whisper 25MB=약 13분 상한 대응). 기본 660s. */
  sttChunkSeconds?: number;
  /** 플러그인 설치 폴더 경로(지연 조회) — 출력 폴더가 소스/설치 트리 안이면 경고한다. */
  pluginFolderPath?: () => string | null;
}

interface TtsOperationSnapshot {
  request: TtsRequest;
  insert: boolean;
  audioTrackIndex: number;
  outputBasename: string;
  outputFolder: SpeechOutputFolder | null;
}

interface SttOperationSnapshot {
  request: SttRequest;
  sourceName: string;
  sourceRevision: number;
  sourceSelectionRevision: number;
  outputMode: "both" | "srt" | "text";
  importSrt: boolean;
  outputFolder: SpeechOutputFolder | null;
}

const LEGACY_TTS_VOICES = new Set<TtsVoice>([
  "alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer",
]);

function isTtsModel(value: string): value is TtsModel {
  return TTS_MODELS.includes(value as TtsModel);
}

function isTtsVoice(value: string): value is TtsVoice {
  return TTS_VOICES.includes(value as TtsVoice);
}

function isTtsFormat(value: string): value is TtsFormat {
  return value === "wav" || value === "mp3" || value === "aac" || value === "flac";
}

function isSttModel(value: string): value is SttModel {
  return STT_MODELS.includes(value as SttModel);
}

function stamp(now: number): string {
  const date = new Date(now);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "_",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
}

function stripExtension(filename: string): string {
  const clean = filename.trim();
  const dot = clean.lastIndexOf(".");
  return dot > 0 ? clean.slice(0, dot) : clean;
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += alphabet[(combined >> 18) & 63] ?? "";
    result += alphabet[(combined >> 12) & 63] ?? "";
    result += second === undefined ? "=" : alphabet[(combined >> 6) & 63] ?? "";
    result += third === undefined ? "=" : alphabet[combined & 63] ?? "";
  }
  return result;
}

function previewUrl(bytes: Uint8Array, mimeType: string): { url: string; revoke: boolean } {
  const Url = globalThis.URL as typeof URL | undefined;
  if (Url?.createObjectURL && typeof Blob === "function") {
    // 대용량 원본(수십 MB WAV)에서 전체 복사를 피한다 — 버퍼 전체면 그대로, 부분 뷰일 때만 복사.
    const buffer = (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.slice().buffer) as ArrayBuffer;
    const blob = new Blob([buffer], { type: mimeType });
    return { url: Url.createObjectURL(blob), revoke: true };
  }
  return { url: `data:${mimeType};base64,${bytesToBase64(bytes)}`, revoke: false };
}

function durationFromResult(result: SttResult): number {
  return result.segments.reduce((maximum, segment) => Math.max(maximum, segment.end), 0);
}

function cloneSttResult(result: SttResult): SttResult {
  return {
    ...result,
    segments: result.segments.map((segment) => ({ ...segment })),
  };
}

function cloneTranscript(transcript: SpeechControllerTranscript): SpeechControllerTranscript {
  return {
    ...transcript,
    result: cloneSttResult(transcript.result),
  };
}

function uiAudioTrackIndex(): number {
  const trackNumber = Number(valueOf("tts-audio-track-input"));
  if (!Number.isInteger(trackNumber) || trackNumber < 1 || trackNumber > 99) {
    throw new Error("TTS 오디오 트랙 번호는 1~99 범위의 정수여야 합니다.");
  }
  return trackNumber - 1;
}

function outputMode(): "both" | "srt" | "text" {
  const value = valueOf("stt-output-format-select");
  return value === "srt" || value === "text" ? value : "both";
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

export class SpeechController {
  private readonly files: SpeechFileManager;
  private readonly host: SpeechHostAdapter;
  private readonly now: () => number;
  private readonly outputFolders = new Map<"tts" | "stt", SpeechOutputFolder>();
  private source: SpeechInputFile | null = null;
  private transcriptValue: SpeechControllerTranscript | null = null;
  private readonly sttChunkSeconds: number;
  private previewObjectUrl = "";
  private ttsRunning = false;
  private sttRunning = false;
  private disposed = false;
  private lifecycleRevision = 1;
  private sourceRevision = 0;
  private sourceSelectionRevision = 0;

  constructor(private readonly options: SpeechControllerOptions) {
    this.files = options.fileManager ?? new SpeechFileManager(createDefaultSpeechFileAdapter());
    this.host = options.hostAdapter ?? {
      getContextKey: readActiveContextKey,
      importAndInsertAsset,
      importFilesToProject,
    };
    this.now = options.now ?? (() => Date.now());
    const chunkSeconds = Number(options.sttChunkSeconds);
    this.sttChunkSeconds = Number.isFinite(chunkSeconds) ? Math.min(780, Math.max(30, Math.round(chunkSeconds))) : 660;
  }

  get transcript(): SpeechControllerTranscript | null {
    return this.transcriptValue ? cloneTranscript(this.transcriptValue) : null;
  }

  async initialize(): Promise<void> {
    if (this.disposed) throw new Error("종료된 음성 컨트롤러는 다시 초기화할 수 없습니다.");
    this.bindEvents();
    this.syncTtsIndicators();
    await Promise.all([
      this.guard(() => this.restoreFolder("tts"), "TTS 출력 폴더 복원 실패"),
      this.guard(() => this.restoreFolder("stt"), "STT 출력 폴더 복원 실패"),
    ]);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lifecycleRevision += 1;
    this.sourceSelectionRevision += 1;
    if (this.previewObjectUrl && globalThis.URL?.revokeObjectURL) {
      globalThis.URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewObjectUrl = "";
  }

  private operationIsCurrent(lifecycleRevision: number): boolean {
    return !this.disposed && lifecycleRevision === this.lifecycleRevision;
  }

  private async captureContextKey(): Promise<string> {
    const contextKey = (await this.host.getContextKey()).trim();
    if (!contextKey) throw new Error("활성 프로젝트·시퀀스 context를 확인하지 못했습니다.");
    return contextKey;
  }

  private async contextIsCurrent(expected: string, lifecycleRevision: number): Promise<boolean> {
    if (!this.operationIsCurrent(lifecycleRevision)) return false;
    try {
      return (await this.host.getContextKey()) === expected && this.operationIsCurrent(lifecycleRevision);
    } catch {
      return false;
    }
  }

  private sttSourceIsCurrent(snapshot: SttOperationSnapshot): boolean {
    return snapshot.sourceRevision === this.sourceRevision
      && snapshot.sourceSelectionRevision === this.sourceSelectionRevision;
  }

  private client(): SpeechApiClient {
    const settings = this.options.getSettings();
    return this.options.createClient?.(settings) ?? new SpeechApiClient({ endpoint: settings.aiEndpoint });
  }

  private bindEvents(): void {
    bind("tts-text-input", "input", () => this.syncTtsIndicators());
    bind("tts-speed-input", "input", () => this.syncTtsIndicators());
    bind("tts-model-select", "change", () => {
      this.enforceVoiceCompatibility();
      this.persistControls();
    });
    for (const id of [
      "tts-voice-select", "tts-format-select", "tts-audio-track-input",
      "stt-model-select", "stt-language-input", "stt-output-format-select",
    ] as const) bind(id, "change", () => this.persistControls());

    bind("tts-output-btn", "click", () => this.guard(() => this.chooseFolder("tts"), "TTS 출력 폴더 선택 실패"));
    bind("stt-output-btn", "click", () => this.guard(() => this.chooseFolder("stt"), "STT 출력 폴더 선택 실패"));
    bind("stt-source-btn", "click", () => this.guard(() => this.chooseSttSource(), "STT 입력 파일 선택 실패"));
    bind("tts-generate-btn", "click", () => this.guard(() => this.generateTts(), "TTS 생성 실패"));
    bind("stt-run-btn", "click", () => this.guard(() => this.runStt(), "STT 변환 실패"));
    bind("stt-copy-btn", "click", () => this.guard(() => this.copyTranscript(), "원고 복사 실패"));
  }

  private async guard(task: () => unknown | Promise<unknown>, context: string): Promise<void> {
    try { await task(); } catch (error) {
      if (error instanceof SpeechFileError && error.code === "CANCELLED") return;
      this.options.onError?.(error, context);
    }
  }

  private persistControls(): void {
    const ttsModel = valueOf("tts-model-select");
    const ttsFormat = valueOf("tts-format-select");
    const sttModel = valueOf("stt-model-select");
    this.options.updateSettings({
      ...(isTtsModel(ttsModel) ? { ttsModel } : {}),
      ttsVoice: valueOf("tts-voice-select"),
      ...(isTtsFormat(ttsFormat) ? { ttsFormat } : {}),
      ttsSpeed: numberOf("tts-speed-input", 1),
      ttsAudioTrack: numberOf("tts-audio-track-input", 2),
      ...(isSttModel(sttModel) ? { sttModel } : {}),
      sttLanguage: valueOf("stt-language-input"),
      sttOutputFormat: outputMode(),
    });
  }

  private syncTtsIndicators(): void {
    const text = element<HTMLTextAreaElement>("tts-text-input").value;
    setText("tts-character-count", String((typeof text === "string" ? text : "").length));
    setText("tts-speed-output", `${numberOf("tts-speed-input", 1).toFixed(2)}×`);
    this.persistControls();
  }

  private enforceVoiceCompatibility(): void {
    const model = valueOf("tts-model-select");
    const select = element<HTMLSelectElement>("tts-voice-select");
    if ((model === "tts-1" || model === "tts-1-hd") && !LEGACY_TTS_VOICES.has(select.value as TtsVoice)) {
      select.value = "coral";
      this.options.onActivity?.("선택한 TTS-1 모델에서 지원되는 Coral 목소리로 변경했습니다.");
    }
  }

  private async restoreFolder(kind: "tts" | "stt"): Promise<void> {
    try {
      const folder = await this.files.restoreOutputFolder(kind);
      this.showFolder(kind, folder);
    } catch (error) {
      this.showFolder(kind, null);
      if (!(error instanceof SpeechFileError && error.code === "TOKEN_EXPIRED")) throw error;
      this.options.onActivity?.(`${kind.toUpperCase()} 출력 폴더 권한이 만료되어 다시 선택해야 합니다.`);
    }
  }

  private showFolder(kind: "tts" | "stt", folder: SpeechOutputFolder | null): void {
    if (folder) this.outputFolders.set(kind, { ...folder });
    else this.outputFolders.delete(kind);
    const name = folder?.name || "선택되지 않음";
    setPathValue(`${kind}-output-name`, name, Boolean(folder), folder?.nativePath || name);
    const pluginPath = this.options.pluginFolderPath?.();
    if (folder && pluginPath && folderInsidePluginTree(folder.nativePath, pluginPath)) {
      this.options.onWarning?.(
        `${kind === "tts" ? "TTS" : "STT"} 출력 폴더(${folder.nativePath})가 플러그인 설치/소스 폴더 안입니다 — 산출물이 코드와 섞이지 않게 다른 폴더 선택을 권장합니다.`,
      );
    }
    this.options.updateSettings(kind === "tts"
      ? { ttsOutputName: folder?.name ?? "", ttsOutputToken: folder?.token ?? "" }
      : { sttOutputName: folder?.name ?? "", sttOutputToken: folder?.token ?? "" });
  }

  private outputFolderSnapshot(kind: "tts" | "stt"): SpeechOutputFolder | null {
    const folder = this.outputFolders.get(kind);
    return folder ? { ...folder } : null;
  }

  private async chooseFolder(kind: "tts" | "stt"): Promise<SpeechOutputFolder> {
    const folder = await this.files.selectOutputFolder(kind);
    this.showFolder(kind, folder);
    this.options.onActivity?.(`${kind.toUpperCase()} 출력 폴더를 선택했습니다: ${folder.name}`);
    return folder;
  }

  private async ensureFolder(kind: "tts" | "stt"): Promise<SpeechOutputFolder> {
    const restored = await this.files.restoreOutputFolder(kind);
    if (restored) {
      this.showFolder(kind, restored);
      return restored;
    }
    return this.chooseFolder(kind);
  }

  private async chooseSttSource(): Promise<void> {
    if (this.disposed) return;
    const selectionRevision = ++this.sourceSelectionRevision;
    const lifecycleRevision = this.lifecycleRevision;
    const selected = await this.files.selectSttInput();
    if (!this.operationIsCurrent(lifecycleRevision) || selectionRevision !== this.sourceSelectionRevision) return;
    this.source = {
      ...selected,
      bytes: selected.bytes,
    };
    this.sourceRevision += 1;
    this.transcriptValue = null;
    element<HTMLTextAreaElement>("stt-result-output").value = "";
    element<HTMLButtonElement>("stt-copy-btn").disabled = true;
    setPathValue("stt-source-name", `${this.source.name} · ${(this.source.size / 1_048_576).toFixed(1)}MB`, true, this.source.nativePath);
    setText("stt-result-meta", "입력 파일이 준비되었습니다. 원고·자막 생성을 실행해 주세요.");
    this.options.onSourceChange?.();
    this.options.onActivity?.(`STT 입력 선택: ${this.source.name}`);
  }

  /**
   * 파일 선택 없이 제공된 오디오 바이트(예: 시퀀스에서 추출)를 STT 입력으로 삼아 변환을 실행한다.
   * 파일 피커를 거치지 않는 것 외에는 기존 STT 실행 경로(runStt)를 그대로 재사용한다.
   */
  async transcribeMediaBytes(media: { bytes: Uint8Array; name: string }): Promise<void> {
    if (this.disposed) return;
    const extension = classifySttInput(media.name);
    if (!extension) {
      throw new Error("추출한 오디오 형식을 STT 입력으로 인식하지 못했습니다.");
    }
    // 시퀀스 추출 오디오는 수십 MB — 읽기 전용 경로이므로 복사 없이 참조를 공유한다(웹뷰 메모리 보호).
    const bytes = media.bytes;
    this.source = {
      entry: { name: media.name, nativePath: media.name, isFile: true, read: async () => bytes },
      name: media.name,
      nativePath: media.name,
      extension,
      mimeType: sttMimeType(extension),
      bytes,
      size: bytes.byteLength,
    };
    this.sourceRevision += 1;
    this.sourceSelectionRevision += 1;
    this.transcriptValue = null;
    element<HTMLTextAreaElement>("stt-result-output").value = "";
    element<HTMLButtonElement>("stt-copy-btn").disabled = true;
    setPathValue(
      "stt-source-name",
      `${media.name} · ${(bytes.byteLength / 1_048_576).toFixed(1)}MB`,
      true,
      media.name,
    );
    this.options.onSourceChange?.();
    await this.runStt();
  }

  private ttsSnapshot(): TtsOperationSnapshot {
    const model = valueOf("tts-model-select");
    const voice = valueOf("tts-voice-select");
    const format = valueOf("tts-format-select");
    if (!isTtsModel(model) || !isTtsVoice(voice) || !isTtsFormat(format)) {
      throw new Error("TTS 모델, 목소리 또는 파일 형식 설정이 올바르지 않습니다.");
    }
    const insert = checkedOf("tts-insert-checkbox");
    return {
      request: {
        text: valueOf("tts-text-input"),
        model,
        voice,
        format,
        speed: numberOf("tts-speed-input", 1),
        instructions: valueOf("tts-instructions-input"),
      },
      insert,
      audioTrackIndex: insert ? uiAudioTrackIndex() : 0,
      outputBasename: `ShortFlow_TTS_${stamp(this.now())}`,
      outputFolder: this.outputFolderSnapshot("tts"),
    };
  }

  private sttSnapshot(): SttOperationSnapshot {
    const source = this.source;
    if (!source) throw new Error("먼저 STT 음성·영상 파일을 선택해 주세요.");
    const model = valueOf("stt-model-select");
    if (!isSttModel(model)) throw new Error("STT 모델 설정이 올바르지 않습니다.");
    return {
      request: {
        bytes: source.bytes,
        filename: source.name,
        mimeType: source.mimeType,
        model,
        language: valueOf("stt-language-input"),
        prompt: valueOf("stt-prompt-input"),
      },
      sourceName: source.name,
      sourceRevision: this.sourceRevision,
      sourceSelectionRevision: this.sourceSelectionRevision,
      outputMode: outputMode(),
      importSrt: checkedOf("stt-import-checkbox"),
      outputFolder: this.outputFolderSnapshot("stt"),
    };
  }

  private async generateTts(): Promise<void> {
    if (this.disposed || this.ttsRunning) return;
    this.ttsRunning = true;
    const lifecycleRevision = this.lifecycleRevision;
    const button = element<HTMLButtonElement>("tts-generate-btn");
    button.disabled = true;
    try {
      this.enforceVoiceCompatibility();
      this.persistControls();
      const snapshot = this.ttsSnapshot();
      const contextKey = snapshot.insert ? await this.captureContextKey() : "";
      await this.options.ensureAiConsent?.();
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      const outputFolder = snapshot.outputFolder ?? await this.ensureFolder("tts");
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      const providerRequest: TtsRequest = { ...snapshot.request };
      const provided = await (this.options.runTts?.(providerRequest) ?? this.client().synthesize(providerRequest));
      const result = validateTtsResult(provided, snapshot.request);
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      const written = await this.files.writeTtsAudio(
        result.bytes,
        snapshot.outputBasename,
        result.extension,
        outputFolder,
      );
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      this.setAudioPreview(result.bytes, result.mimeType);
      await this.options.onTtsOutput?.(written, snapshot.request, result);
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      let inserted = false;
      if (snapshot.insert) {
        if (!await this.contextIsCurrent(contextKey, lifecycleRevision)) {
          this.options.onWarning?.("활성 프로젝트 또는 시퀀스가 변경되어 TTS 파일과 미리듣기만 보존하고 타임라인 삽입은 건너뛰었습니다.");
        } else {
          try {
            // Premiere가 OpenAI TTS WAV의 길이를 오독하므로, 방금 만든 바이트에서 직접 계산해 넘긴다.
            // (WAV이 아니면 parseWavPcm이 던지고, MP3 등은 Host의 getMedia 경로가 처리한다.)
            let audioDurationSeconds: number | undefined;
            try {
              const pcm = parseWavPcm(result.bytes);
              if (pcm.sampleRate > 0) audioDurationSeconds = pcm.samples.length / pcm.sampleRate;
            } catch { /* 비 WAV 포맷은 Host 길이 감지로 폴백 */ }
            await this.host.importAndInsertAsset(written.nativePath, {
              videoTrackIndex: 0,
              audioTrackIndex: snapshot.audioTrackIndex,
              displayName: written.name,
              expectedContextKey: contextKey,
              ...(audioDurationSeconds !== undefined ? { audioDurationSeconds } : {}),
            });
            inserted = true;
          } catch (error) {
            // 음성 생성·저장·미리듣기는 이미 끝났으므로 타임라인 삽입 실패로 전체 작업을 실패시키지 않는다.
            const reason = errorCode(error) === "HOST_CONTEXT_CHANGED"
              ? "활성 프로젝트 또는 시퀀스가 변경됨"
              : error instanceof Error ? error.message : String(error);
            this.options.onWarning?.(`TTS 음성을 생성·저장했지만 타임라인 삽입은 건너뛰었습니다: ${reason}`);
          }
        }
      }
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      this.options.onActivity?.(`TTS 생성 완료: ${written.name}${inserted ? " · 타임라인 삽입" : ""}`);
    } finally {
      button.disabled = false;
      this.ttsRunning = false;
    }
  }

  private setAudioPreview(bytes: Uint8Array, mimeType: string): void {
    const audio = element<HTMLAudioElement>("tts-audio-preview");
    const previousObjectUrl = this.previewObjectUrl;
    const preview = previewUrl(bytes, mimeType);
    try {
      audio.src = preview.url;
      audio.hidden = false;
      // Premiere UXP의 <audio>에는 HTMLMediaElement.load()가 없어 호출하면 던진다. src 설정만으로
      // 재생 준비가 되므로, 지원하는 환경에서만 명시적으로 다시 로드한다.
      if (typeof audio.load === "function") audio.load();
      this.previewObjectUrl = preview.revoke ? preview.url : "";
      if (previousObjectUrl && globalThis.URL?.revokeObjectURL) {
        globalThis.URL.revokeObjectURL(previousObjectUrl);
      }
    } catch (error) {
      if (preview.revoke && globalThis.URL?.revokeObjectURL) globalThis.URL.revokeObjectURL(preview.url);
      throw error;
    }
  }

  private async runStt(): Promise<void> {
    if (this.disposed || this.sttRunning) return;
    if (!this.source) throw new Error("먼저 STT 음성·영상 파일을 선택해 주세요.");
    this.sttRunning = true;
    const lifecycleRevision = this.lifecycleRevision;
    const button = element<HTMLButtonElement>("stt-run-btn");
    button.disabled = true;
    try {
      this.persistControls();
      const snapshot = this.sttSnapshot();
      const contextKey = await this.captureContextKey();
      await this.options.ensureAiConsent?.();
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      const outputFolder = snapshot.outputFolder ?? await this.ensureFolder("stt");
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      // 바이트는 읽기 전용으로만 소비되므로 요청·재시도마다 복사하지 않는다 — 수십 MB 원본이
      // 여러 벌 살아 있으면 UXP 웹뷰가 메모리 부족으로 죽는다(20분 오디오 실측).
      const providerRequest: SttRequest = { ...snapshot.request };
      const callProvider = (request: SttRequest): Promise<SttResult> =>
        this.options.runStt?.(request) ?? this.client().transcribe(request);
      let effectiveModel = providerRequest.model;
      // 기본 모델(diarize 등)이 빈 원고·시간 초과로 실패하면 whisper-1로 자동 재시도한다(실측 32-b).
      // 한 번 폴백하면 남은 청크도 whisper-1을 유지한다.
      const callWithFallback = async (request: SttRequest): Promise<SttResult> => {
        try {
          return await callProvider({ ...request, model: effectiveModel });
        } catch (error) {
          if ((isEmptyTranscriptError(error) || isSttTimeoutError(error)) && effectiveModel !== "whisper-1") {
            const cause = isSttTimeoutError(error) ? "시간 초과" : "빈 원고";
            this.options.onActivity?.(`${effectiveModel} STT가 ${cause}로 실패해 whisper-1로 다시 시도합니다.`);
            effectiveModel = "whisper-1";
            return callProvider({ ...request, model: "whisper-1" });
          }
          throw error;
        }
      };
      // 긴 WAV는 무음 경계에서 청크로 나눠 순차 전사한다(whisper 25MB=약 13분 상한 대응, runbook 40).
      let provided: SttResult | null = null;
      const isWav = providerRequest.mimeType === "audio/wav" || /\.wav$/iu.test(providerRequest.filename);
      if (isWav) {
        let pcm: { samples: Float32Array; sampleRate: number } | null = null;
        try {
          const parsed = parseWavPcm(providerRequest.bytes);
          pcm = { samples: parsed.samples, sampleRate: parsed.sampleRate };
        } catch {
          pcm = null; // WAV 파싱 실패는 단일 요청 경로로
        }
        if (pcm && pcm.sampleRate > 0) {
          const duration = pcm.samples.length / pcm.sampleRate;
          if (duration > this.sttChunkSeconds * 1.2) {
            const gaps = detectSilenceGaps(pcm.samples, pcm.sampleRate);
            const boundaries = planChunkBoundaries(duration, this.sttChunkSeconds, gaps, 8);
            const edges = [0, ...boundaries, duration];
            const baseName = stripExtension(snapshot.sourceName);
            const parts: Array<{ offsetSeconds: number; text: string; segments: SttResult["segments"] }> = [];
            for (let index = 0; index + 1 < edges.length; index += 1) {
              const from = Math.max(0, Math.floor(edges[index]! * pcm.sampleRate));
              const to = Math.min(pcm.samples.length, Math.ceil(edges[index + 1]! * pcm.sampleRate));
              if (to <= from) continue;
              const chunkBytes = encodeWavPcm16(pcm.samples.subarray(from, to), pcm.sampleRate);
              this.options.onActivity?.(`긴 오디오 분할 전사 ${index + 1}/${edges.length - 1} (${Math.round(edges[index]!)}초부터)`);
              const part = await callWithFallback({
                ...providerRequest,
                bytes: chunkBytes,
                filename: `${baseName}_part${index + 1}.wav`,
              });
              if (!this.operationIsCurrent(lifecycleRevision)) return;
              parts.push({ offsetSeconds: edges[index]!, text: part.text, segments: part.segments });
            }
            provided = mergeSttChunkResults(parts, effectiveModel) as SttResult;
          }
        }
      }
      if (!provided) provided = await callWithFallback(providerRequest);
      const result = validateSttResult(provided, effectiveModel);
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      const basename = `${stripExtension(snapshot.sourceName)}_ShortFlow`;
      const writtenPaths: string[] = [];
      let srtProjectImportSucceeded = false;
      if (snapshot.outputMode === "both" || snapshot.outputMode === "text") {
        const textFile = await this.files.writeTranscript(result.text, basename, "txt", outputFolder);
        writtenPaths.push(textFile.nativePath);
      }
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      if (snapshot.outputMode === "both" || snapshot.outputMode === "srt") {
        if (!result.srt) {
          if (snapshot.outputMode === "srt") throw new Error("선택한 STT 모델은 타임코드 SRT를 만들지 않습니다. 화자 구분 또는 Whisper SRT를 선택해 주세요.");
          this.options.onActivity?.("선택한 STT 모델에는 타임코드가 없어 TXT만 저장했습니다.");
        } else {
          const srtFile = await this.files.writeTranscript(result.srt, basename, "srt", outputFolder);
          writtenPaths.push(srtFile.nativePath);
          if (snapshot.importSrt) {
            if (!this.sttSourceIsCurrent(snapshot)) {
              this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 새 입력 선택이 시작되어 이전 결과의 프로젝트 가져오기와 화면 적용을 건너뛰었습니다.`);
              return;
            }
            if (!await this.contextIsCurrent(contextKey, lifecycleRevision)) {
              this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 활성 프로젝트 또는 시퀀스가 변경되어 SRT 가져오기와 화면 적용을 건너뛰었습니다.`);
              return;
            }
            if (!this.sttSourceIsCurrent(snapshot)) {
              this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 새 입력 선택이 시작되어 이전 SRT 가져오기를 건너뛰었습니다.`);
              return;
            }
            try {
              await this.host.importFilesToProject([srtFile.nativePath], contextKey);
              srtProjectImportSucceeded = true;
            } catch (error) {
              if (errorCode(error) === "HOST_CONTEXT_CHANGED") {
                this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 프로젝트 context가 변경되어 SRT 가져오기와 화면 적용을 건너뛰었습니다.`);
                return;
              }
              if (!await this.contextIsCurrent(contextKey, lifecycleRevision)) {
                this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 프로젝트 context가 변경되어 SRT 가져오기와 화면 적용을 건너뛰었습니다.`);
                return;
              }
              this.options.onWarning?.("SRT를 프로젝트 bin으로 가져오지 못했지만 로컬 TXT/SRT와 STT 원고는 보존했습니다.");
            }
          }
        }
      }
      if (!this.operationIsCurrent(lifecycleRevision)) return;
      if (!this.sttSourceIsCurrent(snapshot)) {
        this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 새 입력 선택이 시작되어 이전 결과는 화면에 적용하지 않았습니다.`);
        return;
      }
      if (!await this.contextIsCurrent(contextKey, lifecycleRevision)) {
        this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 활성 프로젝트 또는 시퀀스가 변경되어 화면과 자막 문서에 적용하지 않았습니다.`);
        return;
      }
      if (!this.sttSourceIsCurrent(snapshot)) {
        this.options.onWarning?.(`STT 저장 완료: ${snapshot.sourceName} · 새 입력 선택이 시작되어 이전 결과는 화면에 적용하지 않았습니다.`);
        return;
      }
      element<HTMLTextAreaElement>("stt-result-output").value = result.text;
      element<HTMLButtonElement>("stt-copy-btn").disabled = false;
      setText("stt-result-meta", `${result.segments.length}개 타임코드 · ${writtenPaths.length}개 파일 저장${srtProjectImportSucceeded ? " · SRT 프로젝트 가져오기" : ""}`);
      this.transcriptValue = {
        name: snapshot.sourceName,
        duration: durationFromResult(result),
        result: cloneSttResult(result),
      };
      this.options.onTranscript?.(cloneTranscript(this.transcriptValue));
      this.options.onActivity?.(`STT 완료: ${snapshot.sourceName} · ${result.segments.length}개 타임코드`);
    } finally {
      button.disabled = false;
      this.sttRunning = false;
    }
  }

  private async copyTranscript(): Promise<void> {
    const text = element<HTMLTextAreaElement>("stt-result-output").value;
    if (!text) throw new Error("복사할 STT 원고가 없습니다.");
    if (!navigator.clipboard?.writeText) throw new Error("이 UXP 환경은 클립보드 쓰기를 지원하지 않습니다.");
    await navigator.clipboard.writeText(text);
    this.options.onActivity?.("STT 원고를 클립보드에 복사했습니다.");
  }
}
