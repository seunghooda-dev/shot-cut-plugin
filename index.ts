import { PROFILES, formatDuration } from "./src/core";
import type { HighlightCutSegment } from "./src/highlight-cut";
import { normalizeNativePath, type AssetItem } from "./src/asset-library";
import { createAssetBrowserPanel } from "./src/asset-browser-panel";
import { createMarkersQcPanel } from "./src/markers-qc-panel";
import {
  addStoryMarkers,
  addAutomationMarkers,
  alignSelectedVideoToSafeZone,
  applyAutomationPlan,
  choosePersistentFile,
  applyClipMotion,
  choosePersistentFolder,
  createShort,
  createShortsFromMarkers,
  writeShortsMarkers,
  writeDuckMarkers,
  writeTextGuideMarkers,
  applyDuckingLevelKeyframes,
  buildHighlightReel,
  exportFrameToFolder,
  activeSequenceFrameSize,
  applyShotFocalPositionCorrection,
  type ShortSegmentInput,
  errorMessage,
  exportCover,
  exportVideo,
  importAndInsertAsset,
  insertMogrt,
  readSequenceStatus,
  readActiveContextKey,
  readPlayerPositionSeconds,
  removeVerifiedClonedSequence,
  restorePersistentEntry,
  runSequenceQC,
  scanSequenceMediaQC,
  setSequencePlayerPosition,
  scanShortMarkers,
  type CreateShortOptions,
  type PersistentEntryResult,
  type SequenceStatus,
} from "./src/premiere";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type PluginSettings,
  type SequenceRangeMode,
} from "./src/settings";
import { ReferenceController } from "./src/reference-controller";
import {
  OpenAIImageClient,
  createDefaultOpenAIImageAdapter,
  type ImageEditPreset,
  type ImageGenerateSize,
} from "./src/ai";
import {
  initializeThumbnailController,
  type ThumbnailAIInput,
  type ThumbnailController,
} from "./src/thumbnail-controller";
import { SpeechController } from "./src/speech-controller";
import { AutomationController } from "./src/automation-controller";
import { BrandKitController } from "./src/brand-kit-controller";
import { AIQueueController } from "./src/ai-queue-controller";
import { deterministicHash } from "./src/job-queue";
import { SpeechApiClient, isSttTimeoutError } from "./src/speech";
import {
  renderSafeZoneGuideBmp,
  safeZoneGuideLabel,
  type SocialPlatform,
} from "./src/safe-zone";
import { FinalQCController } from "./src/final-qc-controller";
import type { FinalQCSnapshot } from "./src/final-qc";
import {
  AssetRightsRegistry,
  createAssetRightsReport,
  createMissingAssetRightsRecord,
  createReferenceAssetRightsRecord,
  createTtsAssetRightsRecord,
  normalizeAssetRightsRecord,
  type AssetRightsInput,
  type AssetRightsRecord,
} from "./src/asset-rights";
import { SubtitleController, type SubtitleAiRequest, type SubtitleAnalysisRequest } from "./src/subtitle-controller";
import { resolveAutomationTranscript, subtitleDocumentToAutomationTranscript } from "./src/automation-transcript";
import { createSubtitleDocument, type SubtitleDocument } from "./src/subtitles";
import { addStyleExample, clearStyleCorpus, loadStyleCorpus } from "./src/style-corpus";
import { computeDuckingEnvelope, duckLevelValueFromDb, duckRangesFromEnvelope, speechSpansFromCues } from "./src/audio-ducking";
import { resolveSubjectFocal, type SubjectPoint } from "./src/subject-focus";
import { annotateSpanTransitions, correctedFocalX, planSampleTimes, planShotFocalSpans, type FocalSpan, type TimedSubjectSample } from "./src/shot-focus";
import {
  alignShortToOriginal,
  buildStyleExample,
  distillStyleProfile,
  formatStyleExamplesForPrompt,
  formatStyleProfileForPrompt,
} from "./src/shorts-learning";
import { OpenAITextClient, chunkSubtitleCues } from "./src/openai-text";
import {
  buildReferencePrompt,
  type ReferenceFileEntry,
  type ReferenceItem,
} from "./src/references";
import { RecoveryManager } from "./src/recovery";
import { createRecoveryPanel } from "./src/recovery-panel";
import { installTextEncodingPolyfill } from "./src/text-encoding";
import { createAiSettingsPanel } from "./src/ai-settings-panel";
import { createDiagnosticsPanel } from "./src/diagnostics-panel";
import {
  ActivityLog,
  BusyState,
  bind,
  checkedOf,
  numberOf,
  optionalElement,
  setChecked,
  setText,
  setValue,
  setupTabs,
  toast,
  valueOf,
} from "./src/ui";

const { entrypoints } = require("uxp") as any;
const ASSET_RIGHTS_EMPTY_STATUS = "선택한 음악·효과음·이미지·영상·AI 에셋의 권리 정보를 기록하면 최종 QC에 반영됩니다.";
const SESSION_FALLBACK_PROJECT_KEY = "session";

installTextEncodingPolyfill();

const activity = new ActivityLog();
const busy = new BusyState();
let settings: PluginSettings = loadSettings();
let initialized = false;
const sessionGeneratedAssetRightsIdsByProject = new Map<string, Set<string>>();
let assetRightsRegistry: AssetRightsRegistry | null = null;
let referenceController: ReferenceController | null = null;
let imageAIClient: OpenAIImageClient | null = null;
let speechController: SpeechController | null = null;
let automationController: AutomationController | null = null;
let thumbnailController: ThumbnailController | null = null;
let brandKitController: BrandKitController | null = null;
let aiQueueController: AIQueueController | null = null;
let finalQCController: FinalQCController | null = null;
let subtitleController: SubtitleController | null = null;
let subtitlePlayheadTimer: ReturnType<typeof setInterval> | null = null;
let statusRefreshGeneration = 0;
let recoveryManager: RecoveryManager | null = null;

function reportError(error: unknown, context: string): void {
  const message = errorMessage(error);
  activity.add("error", `${context}: ${message}`);
  toast(message, "error", 5200);
}

function saveCurrentSettings(): void {
  settings = saveSettings(settings);
}

function updateSettings(patch: Partial<PluginSettings>): void {
  settings = saveSettings({ ...settings, ...patch });
}

function profileById(id: string) {
  return PROFILES.find((profile) => profile.id === id) ?? PROFILES[0]!;
}

function optionalNumberValue(id: string): number | undefined {
  const raw = valueOf(id).trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function commaList(id: string): string[] {
  return valueOf(id).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 500);
}

function ensureAssetRightsRegistry(): AssetRightsRegistry {
  if (!assetRightsRegistry) {
    assetRightsRegistry = new AssetRightsRegistry(localStorage);
  }
  return assetRightsRegistry;
}

function assetRightsFor(asset: AssetItem): AssetRightsRecord {
  return ensureAssetRightsRegistry().items.find((record) => record.assetId === asset.normalizedPath) ??
    createMissingAssetRightsRecord(asset);
}

function rememberSessionGeneratedAssetRights(assetId: string, projectKey = SESSION_FALLBACK_PROJECT_KEY): void {
  const key = projectKey.trim() || SESSION_FALLBACK_PROJECT_KEY;
  const ids = sessionGeneratedAssetRightsIdsByProject.get(key) ?? new Set<string>();
  ids.add(assetId);
  sessionGeneratedAssetRightsIdsByProject.set(key, ids);
}

function sessionGeneratedAssetRightsIds(projectKey = SESSION_FALLBACK_PROJECT_KEY): ReadonlySet<string> {
  return sessionGeneratedAssetRightsIdsByProject.get(projectKey.trim() || SESSION_FALLBACK_PROJECT_KEY) ?? new Set<string>();
}

function currentAssetRightsRecords(projectKey = SESSION_FALLBACK_PROJECT_KEY): AssetRightsRecord[] {
  const registry = ensureAssetRightsRegistry();
  const byId = new Map(registry.items.map((record) => [record.assetId, record]));
  const libraryRecords = assetBrowserPanel.getAssets()
    .filter((asset) => asset.kind === "audio" || asset.kind === "image" || asset.kind === "video")
    .map((asset) => byId.get(asset.normalizedPath) ?? createMissingAssetRightsRecord(asset));
  const referenceRecords = (referenceController?.items ?? [])
    .map((reference) => {
      try {
        const fallback = createReferenceAssetRightsRecord(reference);
        const nativePath = typeof reference.nativePath === "string" ? reference.nativePath : "";
        const normalizedReferenceId = nativePath ? normalizeNativePath(nativePath) : fallback.assetId;
        const registryRecord = byId.get(fallback.assetId) ?? byId.get(normalizedReferenceId);
        if (registryRecord) return registryRecord;
        return normalizedReferenceId === fallback.assetId
          ? fallback
          : normalizeAssetRightsRecord({ ...fallback, assetId: normalizedReferenceId }, fallback.updatedAt);
      } catch {
        return null;
      }
    })
    .filter((record): record is AssetRightsRecord => Boolean(record));
  const visibleRecords = [...libraryRecords, ...referenceRecords];
  const visibleIds = new Set(visibleRecords.map((record) => record.assetId));
  const sessionGeneratedIds = sessionGeneratedAssetRightsIds(projectKey);
  const registryOnlyRecords = registry.items.filter((record) => (
    !visibleIds.has(record.assetId) && sessionGeneratedIds.has(record.assetId)
  ));
  return [...visibleRecords, ...registryOnlyRecords];
}

function rightsInputFor(asset: AssetItem): AssetRightsInput {
  return {
    assetId: asset.normalizedPath,
    assetName: asset.name,
    kind: valueOf("asset-rights-kind-select"),
    source: valueOf("asset-rights-source-input"),
    license: valueOf("asset-rights-license-input"),
    commercialUse: valueOf("asset-rights-commercial-select"),
    expiresAt: valueOf("asset-rights-expiry-input"),
    attribution: valueOf("asset-rights-attribution-input"),
    notes: valueOf("asset-rights-notes-input"),
    updatedAt: Date.now(),
  };
}

function renderAssetRights(asset: AssetItem | null): void {
  const selected = Boolean(asset);
  for (const id of [
    "asset-rights-kind-select",
    "asset-rights-source-input",
    "asset-rights-license-input",
    "asset-rights-commercial-select",
    "asset-rights-expiry-input",
    "asset-rights-attribution-input",
    "asset-rights-notes-input",
    "asset-rights-save-btn",
  ]) {
    const field = optionalElement<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(id);
    if (field) field.disabled = !selected;
  }
  if (!asset) {
    setText("asset-rights-selected-name", "에셋을 선택해 주세요");
    setValue("asset-rights-kind-select", "other");
    setValue("asset-rights-source-input", "");
    setValue("asset-rights-license-input", "");
    setValue("asset-rights-commercial-select", "unknown");
    setValue("asset-rights-expiry-input", "");
    setValue("asset-rights-attribution-input", "");
    setValue("asset-rights-notes-input", "");
    setText("asset-rights-status", ASSET_RIGHTS_EMPTY_STATUS);
    return;
  }

  const record = assetRightsFor(asset);
  setText("asset-rights-selected-name", asset.name, asset.nativePath);
  setValue("asset-rights-kind-select", record.kind);
  setValue("asset-rights-source-input", record.source);
  setValue("asset-rights-license-input", record.license);
  setValue("asset-rights-commercial-select", record.commercialUse);
  setValue("asset-rights-expiry-input", record.expiresAt ?? "");
  setValue("asset-rights-attribution-input", record.attribution);
  setValue("asset-rights-notes-input", record.notes);
  const issueCount = createAssetRightsReport([record]).issues.length;
  setText("asset-rights-status", issueCount === 0
    ? "권리 정보가 충분히 기록되었습니다."
    : `권리 정보 확인 필요 · 경고/오류 ${issueCount}개`);
}

const assetBrowserPanel = createAssetBrowserPanel({
  runBusy: (message, task) => busy.during(message, task),
  onActivity: (level, message) => activity.add(level, message),
  onError: reportError,
  formatError: errorMessage,
  getAssetRootName: () => settings.assetRootName,
  setAssetRootName: (name) => { settings.assetRootName = name; },
  persistSettings: saveCurrentSettings,
  ensureRightsRegistry: ensureAssetRightsRegistry,
  renderRights: renderAssetRights,
  insertToTimeline: importAndInsertAsset,
  previewInSourceMonitor: (asset) => previewAssetInPremiereSourceMonitor(asset),
});

async function previewAssetInPremiereSourceMonitor(asset: AssetItem): Promise<boolean> {
  const current = assetBrowserPanel.getAssets().find((candidate) =>
    candidate.id === asset.id &&
    candidate.normalizedPath === asset.normalizedPath &&
    candidate.nativePath === asset.nativePath);
  if (!current) throw new Error("현재 동기화된 오디오가 아닙니다. 음악·효과음 폴더를 다시 동기화해 주세요.");

  const premiere = require("premierepro") as any;
  const sourceMonitor = premiere?.SourceMonitor;
  if (typeof sourceMonitor?.openFilePath !== "function") {
    await assetBrowserPanel.openAssetFile(current);
    return false;
  }
  const opened = await sourceMonitor.openFilePath(current.nativePath);
  if (opened === false) throw new Error("Premiere 소스 모니터에서 오디오 파일을 열지 못했습니다.");
  if (typeof sourceMonitor.play !== "function") return false;
  try {
    return (await sourceMonitor.play(1)) !== false;
  } catch {
    return false;
  }
}

function finalQCPlatform(): SocialPlatform {
  const value = valueOf("final-qc-platform-select");
  return value === "instagram-reels" || value === "tiktok" ? value : "youtube-shorts";
}

async function buildFinalQCSnapshot(): Promise<FinalQCSnapshot> {
  const [status, media] = await Promise.all([readSequenceStatus(), scanSequenceMediaQC()]);
  if (media.truncated) activity.add("warning", `최종 QC 미디어 스캔이 ${media.scannedItems}개 안전 제한에서 중단됐습니다.`);
  let outputPath = "";
  if (settings.outputFolderToken) {
    try {
      const outputFolder = await restorePersistentEntry(settings.outputFolderToken);
      outputPath = String(outputFolder?.nativePath ?? "");
    } catch {
      outputPath = "";
    }
  }
  const platform = finalQCPlatform();
  const transcript = speechController?.transcript;
  const rect = {
    x: numberOf("safe-box-x-input", 20) / 100,
    y: numberOf("safe-box-y-input", 55) / 100,
    width: numberOf("safe-box-width-input", 60) / 100,
    height: numberOf("safe-box-height-input", 12) / 100,
  };
  const subtitleCues = subtitleController?.document.cues
    .filter((cue) => cue.enabled && !cue.hidden)
    .slice(0, 5_000);
  const captions = subtitleCues?.length
    ? subtitleCues.map((cue) => ({
      id: cue.cueId,
      text: cue.words.length
        ? cue.words.filter((word) => !word.hidden).map((word) => word.t).join(" ").trim()
        : cue.text,
      start: cue.start,
      end: cue.end,
      rect,
    }))
    : (transcript?.result.segments ?? []).slice(0, 5_000).map((segment, index) => ({
      id: `stt-${index + 1}`,
      text: segment.text,
      start: segment.start,
      end: segment.end,
      rect,
    }));
  const role = valueOf("safe-role-select");
  const audio: FinalQCSnapshot["audio"] = {
    ...(optionalNumberValue("final-qc-true-peak") !== undefined ? { truePeakDbtp: optionalNumberValue("final-qc-true-peak")! } : {}),
    ...(optionalNumberValue("final-qc-clipped-samples") !== undefined ? { clippedSampleCount: optionalNumberValue("final-qc-clipped-samples")! } : {}),
    ...(optionalNumberValue("final-qc-longest-silence") !== undefined ? { longestSilenceSeconds: optionalNumberValue("final-qc-longest-silence")! } : {}),
    ...(optionalNumberValue("final-qc-dialogue-lufs") !== undefined ? { dialogueLufs: optionalNumberValue("final-qc-dialogue-lufs")! } : {}),
    ...(optionalNumberValue("final-qc-bgm-lufs") !== undefined ? { bgmLufs: optionalNumberValue("final-qc-bgm-lufs")! } : {}),
  };
  return {
    platform,
    sequence: {
      name: status.sequenceName,
      width: status.width,
      height: status.height,
      duration: status.sequenceEnd,
      frameRate: status.frameRate,
      videoTrackCount: status.videoTrackCount,
      audioTrackCount: status.audioTrackCount,
    },
    captions,
    safeZoneElements: role === "content" ? [{ id: "safe-preview-element", label: "Safe Zone 검사 요소", rect }] : [],
    audio,
    media: {
      offlineMedia: media.offlineMedia,
      guideOverlays: media.guideOverlays,
      missingFonts: commaList("final-qc-missing-fonts"),
      missingAssets: commaList("final-qc-missing-assets"),
      rightsReport: createAssetRightsReport(currentAssetRightsRecords(subtitleProjectKeyFromStatus(status))),
    },
    output: {
      fileName: valueOf("final-qc-output-name"),
      directoryPath: outputPath,
    },
  };
}

function subtitleProjectKeyFromStatus(status: Pick<SequenceStatus, "projectPath" | "sequenceGuid">): string {
  return `project-${deterministicHash({ path: status.projectPath, sequence: status.sequenceGuid })}`;
}

async function subtitleProjectKey(): Promise<string> {
  try {
    return subtitleProjectKeyFromStatus(await readSequenceStatus());
  } catch {
    return SESSION_FALLBACK_PROJECT_KEY;
  }
}

async function readSrtFile(): Promise<string | null> {
  const uxpRoot = require("uxp") as any;
  const selected = await uxpRoot?.storage?.localFileSystem?.getFileForOpening?.({ types: ["srt", "json"], allowMultiple: false });
  const file = Array.isArray(selected) ? selected[0] : selected;
  if (!file) return null;
  const value = await file.read({ format: uxpRoot?.storage?.formats?.utf8 });
  if (typeof value === "string") return value;
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(value);
  if (ArrayBuffer.isView(value)) return new TextDecoder().decode(value as ArrayBufferView);
  throw new Error("SRT/Whisper JSON 파일을 UTF-8 텍스트로 읽지 못했습니다.");
}

async function writeSrtFile(srt: string, suggestedName: string): Promise<void> {
  const uxpRoot = require("uxp") as any;
  const file = await uxpRoot?.storage?.localFileSystem?.getFileForSaving?.(suggestedName, { types: ["srt"] });
  if (!file) return;
  await file.write(srt, { format: uxpRoot?.storage?.formats?.utf8 });
}

async function runSubtitleAI(request: SubtitleAiRequest): Promise<unknown> {
  ensureAiConsent("AI 자막");
  const batches = chunkSubtitleCues(request.document.cues).length;
  const descriptor = {
    action: request.action,
    documentHash: deterministicHash(request.document),
    cueCount: request.document.cues.length,
    batchCount: batches,
    maxChars: request.maxChars,
    targetLanguageHash: deterministicHash(request.targetLanguage ?? ""),
    model: "gpt-5.4-mini",
  };
  const task = () => new OpenAITextClient({
    endpoint: settings.aiEndpoint,
    onProgress: (completed, total) => activity.add("info", `AI 자막 ${completed}/${total} 묶음 처리`),
  }).editSubtitles(request);
  return aiQueueController
    ? aiQueueController.run("text", descriptor, task, {
      estimateUnits: Math.max(1, batches),
      cacheTtlMs: 0,
      confirmRequired: batches > 10,
    })
    : task();
}

async function runSubtitleAnalysis(request: SubtitleAnalysisRequest): Promise<unknown> {
  ensureAiConsent("AI 자막 분석");
  const batches = chunkSubtitleCues(request.document.cues).length;
  const descriptor = {
    action: request.action,
    documentHash: deterministicHash(request.document),
    cueCount: request.document.cues.length,
    batchCount: batches,
    model: "gpt-5.4-mini",
  };
  const task = () => new OpenAITextClient({
    endpoint: settings.aiEndpoint,
    onProgress: (completed, total) => activity.add("info", `AI 자막 분석 ${completed}/${total} 묶음 처리`),
  }).analyzeSubtitles(request);
  return aiQueueController
    ? aiQueueController.run("text", descriptor, task, {
      estimateUnits: Math.max(1, batches),
      cacheTtlMs: 0,
      confirmRequired: batches > 10,
    })
    : task();
}

async function runPromptEnrich(prompt: string): Promise<string> {
  ensureAiConsent("AI 프롬프트 보강");
  const descriptor = {
    action: "prompt-enrich",
    promptHash: deterministicHash(prompt),
    model: "gpt-5.4-mini",
  };
  const task = () => new OpenAITextClient({ endpoint: settings.aiEndpoint }).enrichPrompt(prompt);
  return aiQueueController
    ? aiQueueController.run("text", descriptor, task, { estimateUnits: 1, cacheTtlMs: 0 })
    : task();
}

function startSubtitlePlayheadTracking(): void {
  if (subtitlePlayheadTimer !== null) return;
  subtitlePlayheadTimer = setInterval(() => {
    const controller = subtitleController;
    if (!controller || controller.cueCount === 0) return;
    void readPlayerPositionSeconds()
      .then((seconds) => controller.updatePlayhead(seconds))
      .catch(() => undefined);
  }, 350);
}

function stopSubtitlePlayheadTracking(): void {
  if (subtitlePlayheadTimer !== null) clearInterval(subtitlePlayheadTimer);
  subtitlePlayheadTimer = null;
}

const recoveryPanel = createRecoveryPanel({
  getManager: () => recoveryManager,
  removeClone: removeVerifiedClonedSequence,
  onActivity: (level, message) => activity.add(level, message),
  onError: reportError,
});

function localDiagnosticsContext(): Record<string, unknown> {
  const recoveryEntries = recoveryManager?.list() ?? [];
  const recoveryByStatus = recoveryEntries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    return counts;
  }, {});
  return {
    plugin: "shortflow-studio",
    reportPurpose: "user-initiated-local-export",
    settings: {
      profileId: settings.profileId,
      width: settings.width,
      height: settings.height,
      rangeMode: settings.rangeMode,
      reframeMode: settings.reframeMode,
      scope: settings.scope,
      exportMode: settings.exportMode,
      exportRange: settings.exportRange,
      ttsModel: settings.ttsModel,
      ttsFormat: settings.ttsFormat,
      ttsSpeed: settings.ttsSpeed,
      ttsAudioTrack: settings.ttsAudioTrack,
      sttModel: settings.sttModel,
      sttLanguage: settings.sttLanguage,
      sttOutputFormat: settings.sttOutputFormat,
      aiConsentAccepted: settings.aiConsentAccepted,
    },
    workspace: {
      assetCount: assetBrowserPanel.getAssets().length,
      audioAssetCount: assetBrowserPanel.getAssets().filter((asset) => asset.kind === "audio").length,
      selectedAsset: Boolean(assetBrowserPanel.getSelectedAssetId()),
      referenceCount: referenceController?.items.length ?? 0,
      thumbnailReady: Boolean(thumbnailController),
      subtitlesReady: Boolean(subtitleController),
      speechReady: Boolean(speechController),
    },
    recovery: {
      count: recoveryEntries.length,
      byStatus: recoveryByStatus,
      interruptedCount: recoveryByStatus.interrupted ?? 0,
      failedCount: (recoveryByStatus.failed ?? 0) + (recoveryByStatus["rollback-failed"] ?? 0),
    },
  };
}

const diagnosticsPanel = createDiagnosticsPanel({
  runBusy: (message, task) => busy.during(message, task),
  onActivity: (level, message) => activity.add(level, message),
  getLocalContext: localDiagnosticsContext,
});

function applySettingsToUI(): void {
  setValue("preset-select", settings.profileId);
  setValue("width-input", settings.width);
  setValue("height-input", settings.height);
  setValue("name-input", settings.sequenceName);
  setValue("range-select", settings.rangeMode);
  setValue("max-duration-input", settings.maxDuration);
  setValue("reframe-select", settings.reframeMode === "none" ? "keep" : settings.reframeMode);
  setValue("scope-select", settings.scope);
  setChecked("center-checkbox", settings.centerClips);
  setValue("focal-x-input", Math.round(settings.focalX * 100));
  setValue("focal-y-input", Math.round(settings.focalY * 100));
  setValue("hook-seconds-input", settings.hookSeconds);
  setValue("cta-seconds-input", settings.ctaSeconds);
  setValue("mogrt-track-input", settings.mogrtTrack);
  setValue("export-mode-select", settings.exportMode);
  setValue("export-range-select", settings.exportRange);
  setText("preset-name", settings.presetName || "선택되지 않음", settings.presetName);
  setText("output-name", settings.outputFolderName || "선택되지 않음", settings.outputFolderName);
  setText("mogrt-name", settings.mogrtName || "선택되지 않음", settings.mogrtName);
  setText("asset-root-name", settings.assetRootName || "선택되지 않음", settings.assetRootName);
  setValue("ai-provider-select", settings.aiProvider);
  setValue("ai-endpoint-input", settings.aiEndpoint);
  setValue("ai-model-input", settings.aiModel);
  setChecked("ai-consent-checkbox", settings.aiConsentAccepted);
  setValue("tts-model-select", settings.ttsModel);
  setValue("tts-voice-select", settings.ttsVoice);
  setValue("tts-format-select", settings.ttsFormat);
  setValue("tts-speed-input", settings.ttsSpeed);
  setValue("tts-audio-track-input", settings.ttsAudioTrack);
  setText("tts-output-name", settings.ttsOutputName || "선택되지 않음", settings.ttsOutputName);
  setValue("stt-model-select", settings.sttModel);
  setValue("stt-language-input", settings.sttLanguage);
  setValue("stt-output-format-select", settings.sttOutputFormat);
  setText("stt-output-name", settings.sttOutputName || "선택되지 않음", settings.sttOutputName);
  updateFocalReadouts();
}

// 초점 슬라이더(0~100%)의 현재 값을 사람이 읽을 위치 라벨로 표시한다.
function updateFocalReadouts(): void {
  const x = Math.round(Math.min(100, Math.max(0, numberOf("focal-x-input", settings.focalX * 100))));
  const y = Math.round(Math.min(100, Math.max(0, numberOf("focal-y-input", settings.focalY * 100))));
  setText("focal-x-readout", `${x}% · ${x < 50 ? "왼쪽" : x > 50 ? "오른쪽" : "중앙"}`);
  setText("focal-y-readout", `${y}% · ${y < 50 ? "위" : y > 50 ? "아래" : "중앙"}`);
}

function rangeModeFromUI(raw: string): SequenceRangeMode {
  if (raw === "sequence" || raw === "selection" || raw === "playhead") return raw;
  return "inout";
}

function syncSettingsFromUI(): PluginSettings {
  const reframeRaw = valueOf("reframe-select");
  settings = {
    ...settings,
    profileId: valueOf("preset-select"),
    width: numberOf("width-input", settings.width),
    height: numberOf("height-input", settings.height),
    sequenceName: valueOf("name-input"),
    rangeMode: rangeModeFromUI(valueOf("range-select")),
    maxDuration: numberOf("max-duration-input", settings.maxDuration),
    reframeMode: reframeRaw === "keep" ? "none" : reframeRaw === "fit" ? "fit" : "fill",
    scope: valueOf("scope-select") === "selected"
      ? "selected"
      : valueOf("scope-select") === "primary" ? "primary" : "video",
    centerClips: reframeRaw === "scale-only" ? false : checkedOf("center-checkbox"),
    focalX: Math.min(1, Math.max(0, numberOf("focal-x-input", settings.focalX * 100) / 100)),
    focalY: Math.min(1, Math.max(0, numberOf("focal-y-input", settings.focalY * 100) / 100)),
    hookSeconds: numberOf("hook-seconds-input", settings.hookSeconds),
    ctaSeconds: numberOf("cta-seconds-input", settings.ctaSeconds),
    mogrtTrack: numberOf("mogrt-track-input", settings.mogrtTrack),
    exportMode: valueOf("export-mode-select") === "immediate" ? "immediate" : "queue",
    exportRange: valueOf("export-range-select") === "entire" ? "entire" : "inout",
    // UXP manifest가 허용한 공식 OpenAI origin만 사용합니다. readonly UI 값도
    // 신뢰하지 않아, 개발자 도구로 변조되어도 저장 설정에 반영되지 않게 합니다.
    aiProvider: "openai",
    aiEndpoint: DEFAULT_SETTINGS.aiEndpoint,
    aiModel: valueOf("ai-model-input") || DEFAULT_SETTINGS.aiModel,
    aiConsentAccepted: checkedOf("ai-consent-checkbox"),
    ttsModel: valueOf("tts-model-select") as PluginSettings["ttsModel"],
    ttsVoice: valueOf("tts-voice-select"),
    ttsFormat: valueOf("tts-format-select") as PluginSettings["ttsFormat"],
    ttsSpeed: numberOf("tts-speed-input", settings.ttsSpeed),
    ttsAudioTrack: numberOf("tts-audio-track-input", settings.ttsAudioTrack),
    sttModel: valueOf("stt-model-select") as PluginSettings["sttModel"],
    sttLanguage: valueOf("stt-language-input") || DEFAULT_SETTINGS.sttLanguage,
    sttOutputFormat: valueOf("stt-output-format-select") as PluginSettings["sttOutputFormat"],
  };
  saveCurrentSettings();
  return settings;
}

function ensureAiConsent(context: string): void {
  syncSettingsFromUI();
  if (!settings.aiConsentAccepted) {
    optionalElement<HTMLInputElement>("ai-consent-checkbox")?.focus();
    throw new Error(`${context} 실행 전 AI 전송·개인정보·권리·AI 음성 고지 동의가 필요합니다.`);
  }
}

function createOptions(): CreateShortOptions {
  const current = syncSettingsFromUI();
  return {
    width: current.width,
    height: current.height,
    name: current.sequenceName,
    rangeMode: current.rangeMode,
    maxDuration: current.maxDuration,
    reframeMode: current.reframeMode,
    scope: current.scope,
    centerClips: current.centerClips,
    focalX: current.focalX,
    focalY: current.focalY,
  };
}

function renderStatus(status: SequenceStatus): void {
  setText("status-project", status.projectName, status.projectPath || status.projectName);
  setText("status-sequence", status.sequenceName, status.sequenceName);
  setText("status-frame", `${status.width} × ${status.height}`);
  setText("status-duration", formatDuration(status.effectiveDuration || status.sequenceEnd));
  setText("status-playhead", formatDuration(status.playerPosition));
  const inOut = `${formatDuration(status.inPoint)} → ${formatDuration(status.outPoint)}`;
  setText("status-inout", inOut, inOut);
  const selection = status.selectedItemCount > 0
    ? `타임라인 ${status.selectedItemCount}개 선택 · ${formatDuration((status.selectedEnd ?? 0) - (status.selectedStart ?? 0))}`
    : "타임라인 선택 없음";
  setText("status-selection", selection, selection);
  setText("qc-status-sequence", status.sequenceName, status.sequenceName);
  setText("qc-status-frame", `${status.width} × ${status.height}`);
  setText("qc-status-duration", formatDuration(status.effectiveDuration || status.sequenceEnd));
  setText("qc-status-playhead", formatDuration(status.playerPosition));
  setText("qc-status-selection", selection, selection);
}

async function refreshStatus(silent = false): Promise<SequenceStatus | null> {
  const generation = ++statusRefreshGeneration;
  try {
    const status = await readSequenceStatus();
    if (generation !== statusRefreshGeneration) return status;
    renderStatus(status);
    const controller = subtitleController;
    const projectKey = subtitleProjectKeyFromStatus(status);
    if (controller && controller.projectKey !== projectKey) {
      try {
        await controller.loadProject(projectKey);
      } catch (error) {
        if (generation === statusRefreshGeneration) {
          if (silent) activity.add("error", `자막 프로젝트 동기화 실패: ${errorMessage(error)}`);
          else reportError(error, "자막 프로젝트 동기화 실패");
        }
      }
    }
    if (generation !== statusRefreshGeneration) return status;
    if (!silent) activity.add("info", `활성 시퀀스 확인: ${status.sequenceName}`);
    return status;
  } catch (error) {
    if (generation !== statusRefreshGeneration) return null;
    setText("status-project", "Premiere 연결 필요");
    setText("status-sequence", "활성 시퀀스 없음");
    setText("status-frame", "—");
    setText("status-duration", "—");
    setText("status-playhead", "—");
    setText("status-inout", "—");
    setText("status-selection", "—");
    setText("qc-status-sequence", "활성 시퀀스 없음");
    setText("qc-status-frame", "—");
    setText("qc-status-duration", "—");
    setText("qc-status-playhead", "—");
    setText("qc-status-selection", "—");
    if (!silent) reportError(error, "프로젝트 상태 확인 실패");
    return null;
  }
}

const markersQcPanel = createMarkersQcPanel({
  runBusy: (message, task) => busy.during(message, task),
  onActivity: (level, message) => activity.add(level, message),
  syncSettings: syncSettingsFromUI,
  getCreateOptions: createOptions,
  renderStatus,
  refreshStatus,
  runSequenceQC,
  createShort,
  scanShortMarkers,
  createShortsFromMarkers,
  addStoryMarkers,
});

function applyPersistentResult(
  kind: "preset" | "output" | "mogrt",
  result: PersistentEntryResult,
): void {
  if (kind === "preset") {
    settings.presetToken = result.token;
    settings.presetName = result.name;
    setText("preset-name", result.name, result.nativePath);
  } else if (kind === "output") {
    settings.outputFolderToken = result.token;
    settings.outputFolderName = result.name;
    setText("output-name", result.name, result.nativePath);
  } else {
    settings.mogrtToken = result.token;
    settings.mogrtName = result.name;
    setText("mogrt-name", result.name, result.nativePath);
  }
  saveCurrentSettings();
}

async function handleChoosePreset(): Promise<void> {
  const result = await choosePersistentFile(["epr"]);
  if (!result) return;
  applyPersistentResult("preset", result);
  activity.add("info", `내보내기 프리셋 선택: ${result.name}`);
}

async function handleChooseOutput(): Promise<void> {
  const result = await choosePersistentFolder();
  if (!result) return;
  applyPersistentResult("output", result);
  activity.add("info", `출력 폴더 선택: ${result.name}`);
}

async function handleChooseMogrt(): Promise<void> {
  const result = await choosePersistentFile(["mogrt"]);
  if (!result) return;
  applyPersistentResult("mogrt", result);
  activity.add("info", `MOGRT 선택: ${result.name}`);
}

async function requireStoredEntry(token: string, label: string): Promise<any> {
  const entry = await restorePersistentEntry(token);
  if (!entry) throw new Error(`${label} 접근 권한이 만료되었습니다. 다시 선택해 주세요.`);
  return entry;
}

async function handleInsertMogrt(): Promise<void> {
  syncSettingsFromUI();
  const file = await requireStoredEntry(settings.mogrtToken, "MOGRT 파일");
  const count = await busy.during("MOGRT를 삽입하고 있습니다…", () => insertMogrt(file, settings.mogrtTrack));
  activity.add("success", `${settings.mogrtName} 삽입 · 트랙 아이템 ${count}개`);
  toast("MOGRT를 현재 재생 위치에 삽입했습니다.", "success");
}

function motionDirectionOf(value: string): "left" | "right" | "top" | "bottom" {
  return value === "right" || value === "top" || value === "bottom" ? value : "left";
}

function motionEasingOf(value: string): "linear" | "ease-out" | "spring" | "bounce" {
  return value === "spring" || value === "bounce" || value === "linear" ? value : "ease-out";
}

async function handleApplyClipMotion(): Promise<void> {
  const result = await busy.during("클립 모션을 적용하고 있습니다…", () => applyClipMotion({
    kind: valueOf("motion-kind-select") === "out" ? "out" : "in",
    direction: motionDirectionOf(valueOf("motion-direction-select")),
    easing: motionEasingOf(valueOf("motion-easing-select")),
    durationSeconds: Math.max(0.1, Math.min(10, numberOf("motion-duration-input", 0.6))),
    fade: checkedOf("motion-fade-checkbox"),
    scope: "selected",
  }));
  const detail = result.warnings.length > 0 ? ` · ${result.warnings.join(" ")}` : "";
  activity.add(
    result.changed > 0 ? "success" : "warning",
    `클립 모션: ${result.changed}/${result.discovered}개 클립에 적용${detail}`,
  );
  toast(
    result.changed > 0 ? `${result.changed}개 클립에 모션을 적용했습니다.` : "모션이 적용된 클립이 없습니다.",
    result.changed > 0 ? "success" : "warning",
  );
}

let autoCutSegments: HighlightCutSegment[] = [];
// 학습 흐름: 현재 자막을 원본으로 지정해 두었다가, 숏폼 자막과 정렬해 스타일 예시를 뽑는다.
let pendingLearnOriginal: SubtitleDocument | null = null;

// AI가 자막 타임코드를 근거로 숏폼 컷 후보를 랭킹해 제안한다(shorts-plan 우선, 스타일 코퍼스 few-shot 주입).
async function handleAutoCutScan(): Promise<void> {
  ensureAiConsent("AI 자동 컷");
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다. 패널을 다시 열어 주세요.");
  const corpus = loadStyleCorpus();
  const styleExamples = [
    formatStyleProfileForPrompt(distillStyleProfile(corpus)),
    formatStyleExamplesForPrompt(corpus),
  ].filter(Boolean).join("\n\n");
  autoCutSegments = await controller.planAutoCuts(
    { maxDuration: syncSettingsFromUI().maxDuration },
    styleExamples || undefined,
  );
  renderAutoCutCandidates();
  if (autoCutSegments.length === 0) {
    activity.add("warning", "AI 자동 컷: 후보 0개");
    toast("자동 컷 후보를 찾지 못했습니다. 하이라이트가 없거나 자막이 짧습니다.", "warning");
    return;
  }
  activity.add("success", `AI 자동 컷: 후보 ${autoCutSegments.length}개 제안`);
  toast(`자동 컷 후보 ${autoCutSegments.length}개를 제안했습니다. 원하는 구간을 골라 생성하세요.`, "success");
}

// AI가 돌려준 제목·근거는 신뢰할 수 없는 텍스트이므로 textContent로만 넣어 주입을 막는다.
function renderAutoCutCandidates(): void {
  const container = optionalElement<HTMLElement>("auto-cut-candidates");
  const generateRow = optionalElement<HTMLElement>("auto-cut-generate-row");
  if (!container) return;
  container.replaceChildren();
  const hasCandidates = autoCutSegments.length > 0;
  container.hidden = !hasCandidates;
  if (generateRow) generateRow.hidden = !hasCandidates;
  autoCutSegments.forEach((segment, index) => {
    const row = document.createElement("label");
    row.className = "auto-cut-candidate";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = index < 5;
    checkbox.dataset.cutIndex = String(index);
    const body = document.createElement("div");
    body.className = "auto-cut-candidate-body";
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${segment.title}`;
    const meta = document.createElement("small");
    meta.textContent = `${formatDuration(segment.start)} – ${formatDuration(segment.end)} · ${Math.round(segment.duration)}초 · 점수 ${segment.score.toFixed(2)}`;
    body.append(title, meta);
    if (segment.hook) {
      const hook = document.createElement("small");
      hook.className = "auto-cut-reason";
      hook.textContent = `훅: "${segment.hook}"`;
      body.append(hook);
    }
    if (segment.reason) {
      const reason = document.createElement("small");
      reason.className = "auto-cut-reason";
      reason.textContent = segment.reason;
      body.append(reason);
    }
    row.append(checkbox, body);
    container.append(row);
  });
}

// 자동 컷 후보 중 체크된 세그먼트를 읽는다(생성·마커 표시 공용).
function selectedAutoCutSegments(): HighlightCutSegment[] {
  const container = optionalElement<HTMLElement>("auto-cut-candidates");
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLInputElement>("input[data-cut-index]:checked"))
    .map((checkbox) => autoCutSegments[Number(checkbox.dataset.cutIndex)])
    .filter((segment): segment is HighlightCutSegment => Boolean(segment));
}

// 선택한 후보 구간을 타임라인에 #sf 마커로 표시한다(생성 전 검토용, 기존 마커 검색과 연결).
async function handleAutoCutMarkers(): Promise<void> {
  const selected = selectedAutoCutSegments();
  if (selected.length === 0) {
    toast("마커로 표시할 구간을 하나 이상 선택해 주세요.", "warning");
    return;
  }
  const count = await busy.during("자동 컷 구간을 타임라인 마커로 표시하고 있습니다…", () =>
    writeShortsMarkers(selected.map((segment) => ({
      start: segment.start,
      end: segment.end,
      title: segment.title,
      reason: segment.reason,
    }))));
  activity.add("success", `자동 컷 마커 ${count}개를 타임라인에 표시했습니다.`);
  toast(`${count}개 구간을 #sf 마커로 표시했습니다. QC 탭 '마커 검색'으로 검토·생성할 수 있습니다.`, "success");
}

// UXP 데이터 폴더 접근(프레임 샘플 저장용). 사용할 수 없으면 null.
function frameDataFolderApi(): { fileSystem: any; formats: any } | null {
  let uxp: any;
  try {
    uxp = require("uxp");
  } catch {
    return null;
  }
  const fileSystem = uxp?.storage?.localFileSystem;
  const formats = uxp?.storage?.formats;
  if (typeof fileSystem?.getDataFolder !== "function") return null;
  return { fileSystem, formats };
}

// exportSequenceFrame은 성공을 반환해도 파일이 디스크에 늦게 나타난다(Host 실측) — 재시도 읽기.
async function readExportedFrameBytes(dataFolder: any, formats: any, filename: string): Promise<Uint8Array | null> {
  let bytes: Uint8Array | null = null;
  for (let attempt = 0; attempt < 12 && (!bytes || bytes.byteLength === 0); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      const entry = await dataFolder.getEntry(filename);
      const data = await entry.read({ format: formats?.binary });
      bytes = data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : null;
    } catch {
      bytes = null;
    }
  }
  return bytes && bytes.byteLength > 0 ? bytes.slice() : null;
}

// 세그먼트의 프레임 샘플 3장을 비전으로 감지해 컷 초점을 구한다. 실패 시 null(슬라이더 폴백).
async function detectSegmentSubjectFocal(segment: HighlightCutSegment): Promise<{ x: number; y: number } | null> {
  const api = frameDataFolderApi();
  if (!api) return null;
  const dataFolder = await api.fileSystem.getDataFolder();
  const mid = (segment.start + segment.end) / 2;
  const times = [Math.min(segment.start + 0.7, mid), mid, Math.max(segment.end - 0.7, mid)];
  const client = new OpenAITextClient({ endpoint: settings.aiEndpoint });
  const points: SubjectPoint[] = [];
  for (const time of times) {
    try {
      const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 640);
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      if (!bytes) continue;
      points.push(await client.detectSubjectPoint({ bytes, mimeType: "image/png" }));
    } catch {
      // 샘플 하나의 실패는 무시하고 남은 샘플로 종합한다.
    }
  }
  return resolveSubjectFocal(points);
}

// 세그먼트 안의 카메라 컷까지 따라가는 샷 단위 초점 스팬을 감지한다(배치 비전 1회).
// 자막 발화 중간 시점 위주로 프레임을 샘플링해 "말하는 사람"을 프레임별로 잡는다.
async function detectSegmentShotSpans(segment: HighlightCutSegment): Promise<FocalSpan[] | null> {
  const api = frameDataFolderApi();
  if (!api) return null;
  const controller = subtitleController;
  const cueMidpoints: number[] = [];
  if (controller) {
    const wanted = new Set(segment.cueIds);
    for (const cue of controller.document.cues) {
      if (wanted.has(cue.cueId)) cueMidpoints.push((cue.start + cue.end) / 2);
    }
  }
  const times = planSampleTimes(segment.start, segment.end, cueMidpoints, { maxSamples: 14, minGapSeconds: 1.5 });
  if (times.length < 2) return null;
  const dataFolder = await api.fileSystem.getDataFolder();
  let frames: Array<{ bytes: Uint8Array; time: number }> = [];
  for (const time of times) {
    try {
      const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 320);
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      if (bytes) frames.push({ bytes, time });
    } catch {
      // 샘플 하나 실패는 무시
    }
  }
  if (frames.length < 2) return null;
  // 배치 요청 바이트 상한(어댑터 1.2MB)에 맞춰 초과 시 절반씩 솎는다.
  let total = frames.reduce((sum, frame) => sum + frame.bytes.byteLength, 0);
  while (total > 1_150_000 && frames.length > 4) {
    frames = frames.filter((_, index) => index % 2 === 0);
    total = frames.reduce((sum, frame) => sum + frame.bytes.byteLength, 0);
  }
  const client = new OpenAITextClient({ endpoint: settings.aiEndpoint });
  const toSamples = (
    detected: Array<{ index: number; x: number; y: number; confidence: number; faceHeight?: number; personCount?: number }>,
    sourceFrames: Array<{ bytes: Uint8Array; time: number }>,
  ): TimedSubjectSample[] => detected
    .filter((item) => item.index >= 0 && item.index < sourceFrames.length)
    .map((item) => ({
      time: sourceFrames[item.index]!.time,
      x: item.x,
      y: item.y,
      confidence: item.confidence,
      ...(typeof item.faceHeight === "number" ? { faceHeight: item.faceHeight } : {}),
      ...(typeof item.personCount === "number" ? { personCount: item.personCount } : {}),
    }));
  // 배치 감지(어댑터 상한 24장/1.2MB에 맞춰 12장씩 분할).
  const detectChunked = async (
    input: Array<{ bytes: Uint8Array; time: number }>,
  ): Promise<TimedSubjectSample[]> => {
    const out: TimedSubjectSample[] = [];
    for (let offset = 0; offset < input.length; offset += 12) {
      const chunk = input.slice(offset, offset + 12);
      const detected = await client.detectSubjectTimeline(chunk.map((frame) => ({ bytes: frame.bytes, mimeType: "image/png" })));
      out.push(...toSamples(detected, chunk));
    }
    return out;
  };
  let samples = await detectChunked(frames);
  let spans = planShotFocalSpans(samples, segment.start, segment.end);
  // 경계 스냅: 1차 경계는 샘플 간격 탓에 실제 컷과 최대 ±1초쯤 어긋날 수 있고, 그러면
  // 크롭 점프가 컷 밖에서 일어나 "튀는" 느낌을 준다. 경계 주변을 촘촘히(0.325s 간격 9장)
  // 버스트 샘플해 재계산하면 경계가 실제 컷의 ±0.16s 안으로 수렴한다.
  const boundaries = spans.slice(0, -1).map((span) => span.end)
    .filter((time) => time > segment.start + 0.2 && time < segment.end - 0.2)
    .slice(0, 4);
  if (boundaries.length > 0) {
    const burstFrames: Array<{ bytes: Uint8Array; time: number }> = [];
    for (const boundary of boundaries) {
      for (let step = -4; step <= 4; step += 1) {
        const time = Math.round((boundary + step * 0.325) * 1000) / 1000;
        if (time <= segment.start + 0.1 || time >= segment.end - 0.1) continue;
        try {
          const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 320);
          const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
          if (bytes) burstFrames.push({ bytes, time });
        } catch {
          // 버스트 샘플 하나 실패는 무시
        }
      }
    }
    if (burstFrames.length > 0) {
      try {
        samples = [...samples, ...await detectChunked(burstFrames)];
        spans = planShotFocalSpans(samples, segment.start, segment.end);
      } catch {
        // 경계 스냅 실패 시 1차 스팬 유지
      }
    }
  }
  // 경계 전환 주석: 버스트에서도 점프가 안 보이는 불확실 경계는 하드 점프 대신 짧은 팬.
  spans = annotateSpanTransitions(spans, samples);
  return spans.length > 0 ? spans : null;
}

// 측정 피드백 보정: 생성된 숏폼의 각 샷 중간 프레임에서 얼굴 위치를 재측정하고,
// 오차(|x-0.5|>deadZone)를 초점에 반영해 위치 키프레임을 교체한다(폐루프 1스텝).
async function correctGeneratedShortFraming(
  created: Array<{ sequence: any; sequenceName: string }>,
  segments: ShortSegmentInput[],
  sourceDims: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
): Promise<number> {
  const api = frameDataFolderApi();
  if (!api) return 0;
  const dataFolder = await api.fileSystem.getDataFolder();
  const client = new OpenAITextClient({ endpoint: settings.aiEndpoint });
  const baseVisible = (targetWidth / targetHeight) / (sourceDims.width / sourceDims.height);
  if (!(baseVisible > 0) || baseVisible >= 1) return 0; // 가로 크롭이 없으면 보정 무의미
  let correctedShots = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const spans = segments[index]?.focalSpans;
    if (!spans || spans.length === 0) continue;
    const marker = `_${String(index + 1).padStart(2, "0")}_`;
    const shortResult = created.find((item) => item.sequenceName.includes(marker));
    if (!shortResult) continue;
    // 각 샷 중간 프레임을 숏폼 시퀀스에서 내보내 재측정한다.
    const frames: Array<{ bytes: Uint8Array; spanIndex: number }> = [];
    for (let spanIndex = 0; spanIndex < Math.min(spans.length, 8); spanIndex += 1) {
      const span = spans[spanIndex]!;
      const mid = (span.start + span.end) / 2;
      try {
        const { filename } = await exportFrameToFolder(mid, String(dataFolder.nativePath), 270, shortResult.sequence);
        const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
        if (bytes) frames.push({ bytes, spanIndex });
      } catch {
        // 프레임 하나 실패는 무시
      }
    }
    if (frames.length === 0) continue;
    let measured: Array<{ index: number; x: number; y: number; confidence: number }> = [];
    try {
      measured = await client.detectSubjectTimeline(frames.map((frame) => ({ bytes: frame.bytes, mimeType: "image/png" })));
    } catch {
      continue;
    }
    const correctedSpans = spans.map((span) => ({ ...span }));
    let changed = false;
    for (const point of measured) {
      const frame = frames[point.index];
      if (!frame || point.confidence < 0.3) continue;
      const span = correctedSpans[frame.spanIndex]!;
      const zoom = typeof span.zoom === "number" && span.zoom > 1.01 ? Math.min(2, span.zoom) : 1;
      const nextX = correctedFocalX(span.x, point.x, baseVisible / zoom);
      if (Math.abs(nextX - span.x) > 1e-6) {
        span.x = nextX;
        changed = true;
        correctedShots += 1;
      }
    }
    if (changed) {
      await applyShotFocalPositionCorrection(
        shortResult.sequence,
        correctedSpans,
        targetWidth,
        targetHeight,
        sourceDims.width,
        sourceDims.height,
      );
    }
  }
  return correctedShots;
}

// 선택한 후보 구간을 원본 비율 그대로 한 시퀀스에 시간순으로 이어붙인다(방송용 하이라이트 릴).
// 세그먼트마다 릴 로컬 시각에 훅·제목 텍스트 마커를 넣는다.
async function handleAutoCutReel(): Promise<void> {
  const selected = selectedAutoCutSegments();
  if (selected.length === 0) {
    toast("릴로 이어붙일 구간을 하나 이상 선택해 주세요.", "warning");
    return;
  }
  const baseName = valueOf("name-input") || "ShortFlow";
  const result = await busy.during("하이라이트 릴을 만들고 있습니다…", () =>
    buildHighlightReel(
      selected.map((segment) => ({ start: segment.start, end: segment.end, title: segment.title })),
      `${baseName}_하이라이트릴_169`,
    ));
  // 시간순 정렬된 릴 오프셋에 맞춰 세그먼트 문구 마커 삽입.
  const ordered = selected.slice().sort((a, b) => a.start - b.start);
  try {
    const entries = result.reelOffsets.flatMap((offset, index) => {
      const segment = ordered[index];
      if (!segment) return [];
      const hookText = segment.hook ? `"${segment.hook.replace(/^["']+|["']+$/gu, "")}"` : segment.title;
      return [{ label: `${index + 1} ${segment.title.slice(0, 12)}`, text: hookText, seconds: offset }];
    });
    if (entries.length > 0) await writeTextGuideMarkers(result.sequence, entries);
  } catch (error) {
    activity.add("warning", `릴 텍스트 마커 실패: ${errorMessage(error)}`);
  }
  const warn = result.warnings.length > 0 ? ` · ${result.warnings.join(" ")}` : "";
  activity.add(
    result.warnings.length > 0 ? "warning" : "success",
    `하이라이트 릴 생성 · ${result.insertedCount}개 구간 · ${formatDuration(result.totalSeconds)}${warn}`,
  );
  toast(`하이라이트 릴(${result.sequenceName})을 만들었습니다 · ${formatDuration(result.totalSeconds)}`, "success");
  await refreshStatus(true);
}

// 선택한 후보 구간을 각각 새 숏폼 시퀀스로 일괄 생성(기존 createShortsFromMarkers 재사용).
// 생성 전에 컷마다 인물 위치를 감지해, 그 인물이 프레임 중앙에 오도록 세그먼트별 초점을 적용한다.
async function handleAutoCutGenerate(): Promise<void> {
  const selected = selectedAutoCutSegments();
  if (selected.length === 0) {
    toast("생성할 구간을 하나 이상 선택해 주세요.", "warning");
    return;
  }
  ensureAiConsent("AI 자동 컷 생성");
  // 뉴스 스타일: 크롭 없이 원본 비율(fit) 그대로 가운데 배치 — 인물 추적·비전이 불필요하다.
  const newsStyle = checkedOf("news-style-checkbox");
  type SegmentFocalPlan = { spans?: FocalSpan[]; focal?: { x: number; y: number } };
  const plans = newsStyle ? selected.map(() => ({} as SegmentFocalPlan)) : await busy.during("컷별 인물 위치를 추적하고 있습니다…", async () => {
    const out: SegmentFocalPlan[] = [];
    for (const segment of selected) {
      const title = segment.title.slice(0, 24);
      let plan: SegmentFocalPlan = {};
      // 1순위: 샷 단위 추적(카메라 컷마다 말하는 사람을 따라감).
      try {
        const spans = await detectSegmentShotSpans(segment);
        if (spans) plan = { spans };
      } catch {
        // 배치 추적 실패 → 정적 감지로
      }
      // 2순위: 정적 인물 감지(세그먼트당 초점 1개). 3순위: 슬라이더.
      if (!plan.spans) {
        const focal = await detectSegmentSubjectFocal(segment);
        if (focal) plan = { focal };
      }
      out.push(plan);
      activity.add(
        plan.spans || plan.focal ? "info" : "warning",
        plan.spans
          ? `샷 초점 추적 · ${title} → ${plan.spans.length}개 샷 (${plan.spans.map((span) => span.x.toFixed(2)).join("→")})`
          : plan.focal
            ? `인물 초점 감지 · ${title} → x=${plan.focal.x.toFixed(2)}`
            : `인물 감지 실패(슬라이더 초점 사용) · ${title}`,
      );
    }
    return out;
  });
  const segments: ShortSegmentInput[] = selected.map((segment, index) => {
    const plan = plans[index] ?? {};
    // 정적 base 초점: 스팬이 있으면 첫 스팬(시작 훅 프레이밍), 아니면 정적 감지값.
    const base = plan.spans?.[0] ?? plan.focal;
    return {
      name: segment.title || `AutoCut_${index + 1}`,
      comments: segment.reason,
      start: segment.start,
      end: segment.end,
      duration: segment.duration,
      index,
      ...(base ? { focalX: base.x, focalY: base.y } : {}),
      ...(plan.spans ? { focalSpans: plan.spans } : {}),
    };
  });
  const shortOptions = createOptions();
  if (newsStyle) {
    // 크롭 금지: fit(레터박스)으로 원본 전체를 보여준다. 초점·스팬은 사용하지 않는다.
    shortOptions.reframeMode = "fit";
  }
  // 보정 패스에서 소스 종횡비가 필요하다 — 생성 전에(소스가 아직 active일 때) 캡처.
  let sourceDims: { width: number; height: number } | null = null;
  try {
    sourceDims = await activeSequenceFrameSize();
  } catch {
    sourceDims = null;
  }
  const result = await busy.during("자동 컷 구간을 생성하고 있습니다…", () =>
    createShortsFromMarkers(segments, shortOptions, (completed, total, name) => {
      setText("busy-message", `${completed}/${total} · ${name}`);
    }));
  // 뉴스 스타일: 훅·제목 문구를 각 숏폼 시퀀스에 #텍스트 마커로 넣는다(상단=제목, 하단=근거).
  if (newsStyle) {
    for (let index = 0; index < segments.length; index += 1) {
      const marker = `_${String(index + 1).padStart(2, "0")}_`;
      const created = result.created.find((item) => item.sequenceName.includes(marker));
      const source = selected[index];
      if (!created || !source) continue;
      try {
        // JTV 스타일 3단: 상단 노랑 인용 훅 / 하단 흰색 맥락(제목) / 하단 노랑 펀치(근거).
        const hookText = source.hook ? `"${source.hook.replace(/^["']+|["']+$/gu, "")}"` : source.title;
        await writeTextGuideMarkers(created.sequence, [
          { label: "상단(훅·노랑)", text: hookText, seconds: source.start },
          { label: "하단1(맥락·흰색)", text: source.title, seconds: source.start + 0.5 },
          { label: "하단2(펀치·노랑)", text: source.reason || source.title, seconds: source.start + 1 },
        ]);
      } catch (error) {
        activity.add("warning", `텍스트 마커 실패 · ${created.sequenceName.slice(0, 24)}: ${errorMessage(error)}`);
      }
    }
  }
  // 측정 피드백 보정: 카메라 감독처럼 결과 프레임을 재측정해 얼굴이 정중앙에 오도록 초점을 교정한다.
  if (sourceDims && !newsStyle) {
    try {
      const correctedCount = await busy.during("프레이밍을 재측정해 보정하고 있습니다…", () =>
        correctGeneratedShortFraming(result.created, segments, sourceDims!, shortOptions.width, shortOptions.height));
      if (correctedCount > 0) activity.add("info", `프레이밍 자동 보정 · ${correctedCount}개 샷 교정`);
    } catch (error) {
      activity.add("warning", `프레이밍 보정을 건너뛰었습니다: ${errorMessage(error)}`);
    }
  }
  activity.add(
    result.failures.length ? "warning" : "success",
    `AI 자동 컷 일괄 생성 · 성공 ${result.created.length} · 실패 ${result.failures.length}`,
  );
  result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
  toast(`${result.created.length}개 숏폼 시퀀스를 생성했습니다.`, result.failures.length ? "warning" : "success");
  await refreshStatus(true);
}

// 학습된 스타일 예시 수 + 원본 지정 상태를 표시하고, '숏폼으로 학습' 버튼 활성화를 갱신한다.
function renderLearnStatus(): void {
  const count = loadStyleCorpus().length;
  const pending = pendingLearnOriginal ? " · 원본 지정됨" : "";
  setText("learn-status", `학습 예시 ${count}개${pending}`);
  const fromShortBtn = optionalElement<HTMLButtonElement>("learn-from-short-btn");
  if (fromShortBtn) fromShortBtn.disabled = !pendingLearnOriginal;
}

// 현재 편집 중인 자막을 학습 '원본'으로 스냅샷한다(이후 숏폼 자막과 정렬).
function handleLearnCaptureOriginal(): void {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  const doc = controller.document;
  if (doc.cues.length === 0) throw new Error("먼저 원본 자막을 불러오세요(STT 또는 SRT).");
  pendingLearnOriginal = doc;
  renderLearnStatus();
  activity.add("info", `학습 원본 지정 · 큐 ${doc.cues.length}개`);
  toast("원본으로 지정했습니다. 이제 숏폼 자막을 불러온 뒤 '숏폼으로 학습'을 누르세요.", "success");
}

// 현재 자막(숏폼)을 지정해 둔 원본과 정렬해 스타일 예시를 코퍼스에 추가한다.
async function handleLearnFromShort(): Promise<void> {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  if (!pendingLearnOriginal) throw new Error("먼저 '현재 자막을 원본으로 지정'을 누르세요.");
  const short = controller.document;
  if (short.cues.length === 0) throw new Error("숏폼 자막을 먼저 불러오세요.");
  const alignment = alignShortToOriginal(pendingLearnOriginal, short);
  if (alignment.spans.length === 0) {
    toast(
      `숏폼이 원본과 충분히 매칭되지 않았습니다(일치도 ${Math.round(alignment.coverage * 100)}%). 원본 오디오를 잘라 만든 숏폼인지 확인해 주세요.`,
      "warning",
    );
    return;
  }
  const example = buildStyleExample(pendingLearnOriginal, alignment.spans);
  if (!example) {
    toast("학습 예시를 만들지 못했습니다.", "warning");
    return;
  }
  const corpus = addStyleExample(example);
  pendingLearnOriginal = null;
  renderLearnStatus();
  activity.add("success", `AI 자동 컷 학습 · 예시 ${corpus.length}개 (일치도 ${Math.round(alignment.coverage * 100)}%)`);
  toast(`학습했습니다. 스타일 예시 ${corpus.length}개가 다음 자동 컷에 반영됩니다.`, "success");
}

function handleLearnClear(): void {
  clearStyleCorpus();
  pendingLearnOriginal = null;
  renderLearnStatus();
  toast("학습 예시를 초기화했습니다.", "info");
}

// 자막(발화) 구간을 근거로 BGM 볼륨 레벨 키프레임을 실제 적용한다(runbook 39 인코딩 실측).
// 지정 트랙에 적용할 클립이 없으면 기존 마커 폴백(수동 안내)으로 대체한다.
async function handleDuckPlan(): Promise<void> {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  const spans = speechSpansFromCues(controller.document.cues);
  if (spans.length === 0) {
    throw new Error("발화 구간(자막)이 없습니다. 먼저 자막을 불러오세요.");
  }
  const rangeEnd = Math.max(...spans.map((span) => span.end));
  const envelope = computeDuckingEnvelope(spans, { start: 0, end: rangeEnd });
  if (envelope.length === 0) throw new Error("덕킹할 발화 구간을 찾지 못했습니다.");
  const trackNumber = Math.max(1, Math.min(99, Math.round(numberOf("duck-track-input", 2))));
  try {
    const applied = await busy.during("BGM 자동 덕킹을 적용하고 있습니다…", () =>
      applyDuckingLevelKeyframes(trackNumber, envelope.map((kf) => ({ time: kf.time, gainDb: kf.gainDb })), duckLevelValueFromDb));
    const warn = applied.warnings.length > 0 ? ` · ${applied.warnings.join(" ")}` : "";
    activity.add(applied.warnings.length > 0 ? "warning" : "success",
      `BGM 자동 덕킹 · A${trackNumber} 클립 ${applied.clipCount}개 · 키프레임 ${applied.keyframeCount}개${warn}`);
    toast(`A${trackNumber} 트랙에 자동 덕킹을 적용했습니다 (클립 ${applied.clipCount} · 키프레임 ${applied.keyframeCount}).`, "success");
    return;
  } catch (error) {
    activity.add("warning", `자동 덕킹 적용 불가(${errorMessage(error)}) — 마커 안내로 대체합니다.`);
  }
  const ranges = duckRangesFromEnvelope(envelope);
  if (ranges.length === 0) {
    throw new Error("덕킹할 발화 구간을 찾지 못했습니다.");
  }
  const count = await busy.during("BGM 덕킹 계획을 마커로 표시하고 있습니다…", () =>
    writeDuckMarkers(ranges.map((range) => ({ start: range.start, end: range.end }))));
  activity.add("success", `BGM 덕킹 마커 ${count}개를 타임라인에 표시했습니다.`);
  toast(`발화 구간 ${count}곳에 'BGM 덕킹' 마커를 표시했습니다. 해당 구간에서 BGM 볼륨을 낮추세요.`, "success");
}

async function handleExportVideo(): Promise<void> {
  syncSettingsFromUI();
  if (!finalQCController) throw new Error("최종 QC 게이트가 초기화되지 않았습니다. 플러그인 패널을 다시 열어 주세요.");
  await finalQCController.ensureExportAllowed();
  const [presetFile, outputFolder] = await Promise.all([
    requireStoredEntry(settings.presetToken, "내보내기 프리셋"),
    requireStoredEntry(settings.outputFolderToken, "출력 폴더"),
  ]);
  const outputPath = await busy.during("영상을 내보내고 있습니다…", () => exportVideo({
    presetFile,
    outputFolder,
    mode: settings.exportMode,
    range: settings.exportRange,
  }));
  activity.add("success", `영상 내보내기 요청 완료: ${outputPath}`);
  toast(settings.exportMode === "queue" ? "Media Encoder 대기열에 추가했습니다." : "영상 내보내기를 완료했습니다.", "success");
}

async function handleExportCover(): Promise<void> {
  syncSettingsFromUI();
  const outputFolder = await requireStoredEntry(settings.outputFolderToken, "출력 폴더");
  const outputPath = await busy.during("현재 프레임을 PNG로 저장하고 있습니다…", () => exportCover(outputFolder));
  activity.add("success", `커버 이미지 저장: ${outputPath}`);
  toast("현재 프레임 커버를 저장했습니다.", "success");
}

async function handleSaveAssetRights(): Promise<void> {
  const asset = assetBrowserPanel.getSelectedAsset();
  if (!asset) throw new Error("권리 정보를 저장할 에셋을 먼저 선택해 주세요.");
  const record = await ensureAssetRightsRegistry().upsert(rightsInputFor(asset));
  renderAssetRights(asset);
  activity.add("success", `권리 정보 저장: ${record.assetName}`);
  toast("에셋 권리 정보를 저장했습니다.", "success");
}

function createImageAIClient(): OpenAIImageClient {
  const current = syncSettingsFromUI();
  imageAIClient = new OpenAIImageClient(createDefaultOpenAIImageAdapter(), {
    endpoint: current.aiEndpoint,
  });
  return imageAIClient;
}

const aiSettingsPanel = createAiSettingsPanel({
  createClient: createImageAIClient,
  ensureConsent: () => ensureAiConsent("AI 연결 테스트"),
  onActivity: (level, message) => activity.add(level, message),
  onError: reportError,
});

function imagePreset(value: string): ImageEditPreset {
  if (["basic", "vivid", "upscale", "remove-bg", "chat"].includes(value)) {
    return value as ImageEditPreset;
  }
  throw new Error("지원하지 않는 AI 이미지 프리셋입니다.");
}

function selectedReferencePromptItems(selectedIds: readonly string[]): ReferenceItem[] {
  if (!referenceController || selectedIds.length === 0) return [];
  const idSet = new Set(selectedIds);
  return referenceController.items
    .filter((item) => !item.unavailable && idSet.has(item.id))
    .slice(0, 8)
    .map((item) => ({ ...item }));
}

async function handleThumbnailAI(
  input: ThumbnailAIInput,
  preset: string,
  prompt: string,
): Promise<{ bytes: Uint8Array; name: string }> {
  ensureAiConsent("썸네일 AI");
  const client = imageAIClient ?? createImageAIClient();
  const images = [{ bytes: input.bytes, filename: input.filename, mimeType: input.mimeType }];
  const selectedReferences = referenceController
    ? await referenceController.getSelectedImageInputs()
    : [];
  if (selectedReferences.length > 3) {
    activity.add("warning", "현재 썸네일을 포함해 AI 입력은 최대 4개이므로 레퍼런스 3개만 사용합니다.");
  }
  const attachedReferences = selectedReferences.slice(0, 3);
  const promptReferences = selectedReferencePromptItems(referenceController?.selectedIds ?? []);
  const requestPrompt = promptReferences.length > 0
    ? buildReferencePrompt(promptReferences, prompt)
    : prompt;
  images.push(...attachedReferences.map((reference) => ({
    bytes: reference.bytes,
    filename: reference.name,
    mimeType: reference.mimeType,
  })));
  const request = { images, preset: imagePreset(preset), prompt: requestPrompt };
  const descriptor = {
    model: settings.aiModel,
    preset,
    promptHash: deterministicHash(requestPrompt),
    images: images.map((item) => ({
      name: item.filename,
      mimeType: item.mimeType,
      size: item.bytes.byteLength,
      digest: deterministicHash(item.bytes),
    })),
  };
  const bytes = aiQueueController
    ? await aiQueueController.run("image", descriptor, () => client.editImage(request), {
      estimateUnits: preset === "upscale" ? 6 : 4,
      cacheTtlMs: 0,
    })
    : await client.editImage(request);
  return { bytes, name: `GPT Image 2 · ${preset}` };
}

function imageGenerateSize(value: string): ImageGenerateSize | undefined {
  return value === "1024x1024" || value === "1536x1024" || value === "1024x1536"
    ? value
    : undefined;
}

// 생성 바이트를 플러그인 데이터 폴더에 PNG로 쓰고, 레퍼런스 라이브러리가 토큰화할 수 있는 파일 엔트리를 돌려준다.
async function writeGeneratedReferenceFile(
  bytes: Uint8Array,
  extension: "png" | "mp4" = "png",
): Promise<ReferenceFileEntry> {
  let uxp: any;
  try {
    uxp = require("uxp");
  } catch {
    throw new Error("Premiere Pro UXP 환경에서 실행해 주세요.");
  }
  const storage = uxp?.storage;
  const fileSystem = storage?.localFileSystem;
  if (!fileSystem || typeof fileSystem.getDataFolder !== "function") {
    throw new Error("UXP 데이터 폴더 API를 사용할 수 없어 생성 결과를 저장하지 못했습니다.");
  }
  const folder = await fileSystem.getDataFolder();
  const file = await folder.createFile(`ai-gen-${Date.now()}.${extension}`, { overwrite: true });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  await file.write(buffer, { format: storage?.formats?.binary });
  return file as ReferenceFileEntry;
}

function videoGenerateSeconds(value: string): "8" | "16" | "20" | undefined {
  return value === "8" || value === "16" || value === "20" ? value : undefined;
}

async function runReferenceVideoGen(prompt: string, seconds: string): Promise<ReferenceFileEntry> {
  ensureAiConsent("AI 영상 생성");
  const client = imageAIClient ?? createImageAIClient();
  const genSeconds = videoGenerateSeconds(seconds);
  // 짧은 세로 숏폼 기본. Sora 생성은 수 분이 걸릴 수 있어 폴링 마감을 넉넉히 준다.
  const request = {
    prompt,
    size: "720x1280" as const,
    ...(genSeconds ? { seconds: genSeconds } : {}),
    timeoutMs: 120_000,
    pollTimeoutMs: 900_000,
  };
  const descriptor = {
    model: settings.aiModel,
    kind: "video-generate",
    seconds: genSeconds ?? "8",
    promptHash: deterministicHash(prompt),
  };
  const bytes = aiQueueController
    ? await aiQueueController.run("video", descriptor, () => client.generateVideo(request), {
      estimateUnits: 20,
      cacheTtlMs: 0,
      maxRetries: 0,
    })
    : await client.generateVideo(request);
  return writeGeneratedReferenceFile(bytes, "mp4");
}

// 활성 시퀀스 오디오를 번들 EPR로 데이터 폴더에 내보내고 그 바이트를 돌려준다(시퀀스 STT 전제).
async function exportActiveSequenceAudio(): Promise<{ bytes: Uint8Array; name: string }> {
  let uxp: any;
  try {
    uxp = require("uxp");
  } catch {
    throw new Error("Premiere Pro UXP 환경에서 실행해 주세요.");
  }
  const fileSystem = uxp?.storage?.localFileSystem;
  const formats = uxp?.storage?.formats;
  if (typeof fileSystem?.getPluginFolder !== "function" || typeof fileSystem?.getDataFolder !== "function") {
    throw new Error("UXP 파일 시스템 API를 사용할 수 없습니다.");
  }
  const pluginFolder = await fileSystem.getPluginFolder();
  let presetEntry: any;
  try {
    presetEntry = await pluginFolder.getEntry("presets/shortflow_audio_16k_mono.epr");
  } catch {
    throw new Error("번들된 오디오 내보내기 프리셋을 찾지 못했습니다.");
  }
  const dataFolder = await fileSystem.getDataFolder();
  const outputPath = await exportVideo({
    presetFile: presetEntry,
    outputFolder: dataFolder,
    mode: "immediate",
    range: "entire",
  });
  const name = String(outputPath).split(/[\\/]/u).pop() || "sequence-audio";
  const fileEntry = await dataFolder.getEntry(name);
  const data = await fileEntry.read({ format: formats?.binary });
  const bytes = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : null;
  if (!bytes || bytes.byteLength === 0) {
    throw new Error("내보낸 시퀀스 오디오를 읽지 못했습니다.");
  }
  return { bytes: bytes.slice(), name };
}

async function transcribeActiveSequence(): Promise<void> {
  if (!speechController) throw new Error("TTS·STT 컨트롤러가 준비되지 않았습니다.");
  const media = await busy.during(
    "시퀀스 오디오를 추출하고 있습니다…",
    () => exportActiveSequenceAudio(),
  );
  activity.add("info", `시퀀스 오디오(${media.name}) 추출 완료 — 자막 생성을 시작합니다.`);
  await speechController.transcribeMediaBytes(media);
}

async function runReferenceImageGen(prompt: string, size: string): Promise<ReferenceFileEntry> {
  ensureAiConsent("AI 이미지 생성");
  const client = imageAIClient ?? createImageAIClient();
  const genSize = imageGenerateSize(size);
  // gpt-image-2 생성은 수십 초가 걸릴 수 있어 기본 60초 타임아웃으로는 부족하다 — 넉넉히 준다.
  const request = genSize
    ? { prompt, size: genSize, timeoutMs: 120_000 }
    : { prompt, timeoutMs: 120_000 };
  const descriptor = {
    model: settings.aiModel,
    kind: "generate",
    size: genSize ?? "1024x1024",
    promptHash: deterministicHash(prompt),
  };
  const bytes = aiQueueController
    ? await aiQueueController.run("image", descriptor, () => client.generateImage(request), {
      estimateUnits: 5,
      cacheTtlMs: 0,
      maxRetries: 1,
    })
    : await client.generateImage(request);
  return writeGeneratedReferenceFile(bytes);
}

async function createPremiereSafeZoneOverlay(
  platform: SocialPlatform,
  role: "content" | "caption",
): Promise<void> {
  const expectedContextKey = await readActiveContextKey();
  const guideLabel = safeZoneGuideLabel(platform, role);
  const guide = renderSafeZoneGuideBmp({
    width: 1080,
    height: 1920,
    platform,
    role,
    includeRemovalWarning: true,
  });
  const uxpRoot = require("uxp") as any;
  const fileSystem = uxpRoot?.storage?.localFileSystem;
  const dataFolder = await fileSystem?.getDataFolder?.();
  if (!dataFolder?.createFile) throw new Error("Safe Zone 가이드를 저장할 UXP 데이터 폴더를 사용할 수 없습니다.");
  const filename = `__SHORTFLOW_SAFE_GUIDE_DO_NOT_EXPORT__${guide.suggestedFileName}`;
  const file = await dataFolder.createFile(filename, { overwrite: true });
  const binary = uxpRoot?.storage?.formats?.binary;
  const bytes = guide.bytes;
  await file.write(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { format: binary });
  const status = await readSequenceStatus(undefined, { expectedContextKey });
  if (status.videoTrackCount >= 99) throw new Error("가이드용 비디오 트랙을 추가할 수 없습니다. 비디오 트랙 수를 줄여 주세요.");
  const duration = Math.max(0.1, status.sequenceEnd - status.playerPosition);
  await importAndInsertAsset(String(file.nativePath ?? ""), {
    videoTrackIndex: status.videoTrackCount,
    audioTrackIndex: 0,
    displayName: filename,
    durationSeconds: duration,
    expectedContextKey,
  });
  activity.add("warning", `${guideLabel} 오버레이를 최상단 트랙에 삽입했습니다. 내보내기 전 반드시 삭제하세요: ${filename}`);
  toast(`${guideLabel} 오버레이를 삽입했습니다. 내보내기 전 삭제해 주세요.`, "warning", 7000);
}

function guarded(handler: () => Promise<void>, context: string): () => Promise<void> {
  return async () => {
    try {
      await handler();
    } catch (error) {
      reportError(error, context);
    }
  };
}

function bindCoreEvents(): void {
  bind("refresh-btn", "click", guarded(() => refreshStatus().then(() => undefined), "상태 새로고침 실패"));
  bind("qc-btn", "click", guarded(() => markersQcPanel.runQC(), "QC 실패"));
  bind("create-short-btn", "click", guarded(() => markersQcPanel.createShort(), "숏폼 생성 실패"));
  bind("auto-cut-scan-btn", "click", guarded(handleAutoCutScan, "AI 자동 컷 분석 실패"));
  bind("auto-cut-generate-btn", "click", guarded(handleAutoCutGenerate, "자동 컷 생성 실패"));
  bind("auto-cut-markers-btn", "click", guarded(handleAutoCutMarkers, "자동 컷 마커 표시 실패"));
  bind("auto-cut-reel-btn", "click", guarded(handleAutoCutReel, "하이라이트 릴 생성 실패"));
  bind("learn-capture-original-btn", "click", guarded(async () => handleLearnCaptureOriginal(), "학습 원본 지정 실패"));
  bind("learn-from-short-btn", "click", guarded(handleLearnFromShort, "숏폼으로 학습 실패"));
  bind("learn-clear-btn", "click", guarded(async () => handleLearnClear(), "학습 초기화 실패"));
  bind("scan-markers-btn", "click", guarded(() => markersQcPanel.scanMarkers(), "마커 검색 실패"));
  bind("batch-create-btn", "click", guarded(() => markersQcPanel.batchCreate(), "일괄 생성 실패"));
  bind("add-story-markers-btn", "click", guarded(() => markersQcPanel.addStoryMarkers(), "스토리 마커 추가 실패"));
  bind("duck-plan-btn", "click", guarded(handleDuckPlan, "BGM 덕킹 계획 실패"));
  bind("choose-preset-btn", "click", guarded(handleChoosePreset, "프리셋 선택 실패"));
  bind("choose-output-btn", "click", guarded(handleChooseOutput, "출력 폴더 선택 실패"));
  bind("choose-mogrt-btn", "click", guarded(handleChooseMogrt, "MOGRT 선택 실패"));
  bind("insert-mogrt-btn", "click", guarded(handleInsertMogrt, "MOGRT 삽입 실패"));
  bind("export-video-btn", "click", guarded(handleExportVideo, "영상 내보내기 실패"));
  bind("export-cover-btn", "click", guarded(handleExportCover, "커버 저장 실패"));
  bind("stt-from-sequence-btn", "click", guarded(transcribeActiveSequence, "시퀀스 자막 생성 실패"));
  bind("motion-apply-btn", "click", guarded(handleApplyClipMotion, "클립 모션 적용 실패"));
  bind("choose-asset-root-btn", "click", guarded(() => assetBrowserPanel.chooseRoot(), "자산 폴더 선택 실패"));
  bind("open-asset-root-btn", "click", guarded(() => assetBrowserPanel.openRoot(), "자산 폴더 열기 실패"));
  bind("sync-assets-btn", "click", guarded(() => assetBrowserPanel.sync(), "자산 동기화 실패"));
  bind("asset-search-input", "input", () => assetBrowserPanel.render());
  bind("asset-type-select", "change", () => assetBrowserPanel.render());
  bind("asset-category-select", "change", () => assetBrowserPanel.render());
  bind("open-asset-category-btn", "click", guarded(() => assetBrowserPanel.openCategory(), "선택 폴더 열기 실패"));
  bind("asset-rights-save-btn", "click", guarded(handleSaveAssetRights, "에셋 권리 정보 저장 실패"));
  bind("ai-save-btn", "click", guarded(() => aiSettingsPanel.save(), "AI 설정 저장 실패"));
  bind("ai-test-btn", "click", guarded(() => aiSettingsPanel.test(), "AI 연결 테스트 실패"));
  bind("clear-log-btn", "click", () => activity.clear());
  bind("run-diagnostics-btn", "click", guarded(() => diagnosticsPanel.run(), "시스템 진단 실패"));
  bind("export-diagnostics-btn", "click", guarded(() => diagnosticsPanel.exportJson(), "진단 JSON 저장 실패"));

  bind("preset-select", "change", () => {
    const id = valueOf("preset-select");
    if (id !== "custom") {
      const profile = profileById(id);
      setValue("width-input", profile.width);
      setValue("height-input", profile.height);
      setValue("max-duration-input", Math.min(profile.maxDuration, 600));
      setValue("name-input", `ShortFlow_${profile.width}x${profile.height}`);
    }
    syncSettingsFromUI();
  });

  for (const id of [
    "width-input", "height-input", "name-input", "range-select", "max-duration-input",
    "reframe-select", "scope-select", "center-checkbox", "focal-x-input", "focal-y-input",
    "hook-seconds-input", "cta-seconds-input",
    "mogrt-track-input", "export-mode-select", "export-range-select",
    "tts-model-select", "tts-voice-select", "tts-format-select", "tts-speed-input",
    "tts-audio-track-input", "stt-model-select", "stt-language-input", "stt-output-format-select",
    "ai-provider-select", "ai-endpoint-input", "ai-model-input",
  ]) {
    bind(id, "change", () => {
      syncSettingsFromUI();
    });
  }
  // 슬라이더를 드래그하는 동안 실시간으로 초점 위치 라벨을 갱신한다.
  for (const id of ["focal-x-input", "focal-y-input"]) {
    bind(id, "input", updateFocalReadouts);
  }
  assetBrowserPanel.setupDropZone();
}

async function bootstrap(): Promise<void> {
  if (initialized) return;
  initialized = true;
  applySettingsToUI();
  bindCoreEvents();
  renderLearnStatus();
  diagnosticsPanel.render(null);
  await assetBrowserPanel.initialize();
  renderAssetRights(null);
  try {
    referenceController = new ReferenceController({
      onActivity: (message) => activity.add("success", message),
      onError: (error, context) => reportError(error, context),
      onSelectionChange: (ids) => activity.add("info", `AI 참고 레퍼런스 ${ids.length}개 선택`),
      enrichPromptProvider: runPromptEnrich,
      generatedImageProvider: runReferenceImageGen,
      generatedVideoProvider: runReferenceVideoGen,
    });
    await referenceController.initialize();
  } catch (error) {
    referenceController = null;
    reportError(error, "레퍼런스 보드 초기화 실패");
  }
  await aiSettingsPanel.initialize();
  try {
    aiQueueController = new AIQueueController({
      onActivity: (message) => activity.add("success", message),
      onError: (error, context) => reportError(error, context),
    });
    await aiQueueController.initialize();
  } catch (error) {
    aiQueueController = null;
    reportError(error, "AI 작업 큐 초기화 실패");
  }
  try {
    thumbnailController = await initializeThumbnailController({
      onActivity: (message) => activity.add("success", message),
      onError: (error, context) => reportError(error, context),
      onAIRequest: handleThumbnailAI,
    });
  } catch (error) {
    thumbnailController = null;
    reportError(error, "썸네일 편집기 초기화 실패");
  }
  try {
    brandKitController = new BrandKitController({
      onActivity: (message) => activity.add("success", message),
      onError: (error, context) => reportError(error, context),
      getMogrtPreset: () => ({
        token: settings.mogrtToken,
        name: settings.mogrtName,
        track: settings.mogrtTrack,
      }),
      onApply: async (kit) => {
        updateSettings({
          ttsModel: kit.tts.model,
          ttsVoice: kit.tts.voice,
          ttsSpeed: kit.tts.speed,
          mogrtToken: kit.mogrt.token,
          mogrtName: kit.mogrt.name,
          mogrtTrack: kit.mogrt.track,
        });
        applySettingsToUI();
        await thumbnailController?.applyBrandDefaults(kit.thumbnail);
        setValue("subtitle-max-chars-input", kit.caption.maxChars);
        optionalElement<HTMLInputElement>("subtitle-max-chars-input")?.dispatchEvent(new Event("change"));
        document.dispatchEvent(new CustomEvent("shortflow:brand-kit-applied", { detail: kit }));
        toast(`브랜드 키트를 적용했습니다: ${kit.name}`, "success");
      },
    });
    await brandKitController.initialize();
  } catch (error) {
    brandKitController = null;
    reportError(error, "브랜드 키트 초기화 실패");
  }
  try {
    const browserStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    recoveryManager = new RecoveryManager(browserStorage ? { storage: browserStorage } : {});
    recoveryManager.subscribe((event) => {
      recoveryPanel.render();
      if (event.type === "persistence-error") {
        activity.add("warning", event.message ?? "복구 기록을 저장하지 못했습니다.");
      }
    });
    const interrupted = await recoveryManager.restore();
    if (interrupted > 0) {
      activity.add("warning", `이전 세션에서 중단된 비파괴 작업 ${interrupted}개를 복구 목록에 표시했습니다.`);
      toast(`중단된 작업 ${interrupted}개를 확인해 주세요.`, "warning", 6200);
    }
    recoveryPanel.render();
  } catch (error) {
    recoveryManager = null;
    reportError(error, "복구 기록 초기화 실패");
  }
  try {
    automationController = new AutomationController({
      getTranscript: () => {
        return resolveAutomationTranscript(speechController?.transcript, subtitleController?.document);
      },
      onActivity: (message) => activity.add("success", message),
      onError: (error, context) => reportError(error, context),
      getSourceContextKey: readActiveContextKey,
      onAddMarkers: async (plan, cues, guard) => {
        const result = await addAutomationMarkers(plan, cues, guard);
        activity.add("success", `Premiere 추천 마커 추가 · CUT ${result.cutMarkers}개 · ZOOM ${result.punchMarkers}개`);
        toast("자동 편집 추천 마커를 추가했습니다.", "success");
      },
      onApply: async (plan, cues, guard) => {
        let operationId = "";
        try {
          const result = await applyAutomationPlan(plan, cues, {
            expectedContextKey: guard.sourceContextKey,
            onClonePrepared: async ({ sourceGuid, cloneGuid, sequenceName }) => {
              if (!recoveryManager) return;
              try {
                const entry = recoveryManager.begin({
                  kind: "automation-plan",
                  label: `비파괴 자동 편집 · ${sequenceName}`,
                  beforeSummary: {
                    sequenceGuid: sourceGuid,
                    duration: plan.sourceDuration,
                    cutMarkers: 0,
                    punchCues: 0,
                  },
                  afterSummary: {
                    sequenceGuid: cloneGuid,
                    duration: plan.outputDuration,
                    cutMarkers: plan.cuts.length,
                    punchCues: cues.length,
                  },
                  clonePolicy: {
                    sourceId: sourceGuid,
                    cloneId: cloneGuid,
                    createdBeforeMutation: true,
                    verified: true,
                  },
                });
                operationId = entry.operationId;
              } catch (error) {
                await removeVerifiedClonedSequence(sourceGuid, cloneGuid).catch(() => undefined);
                throw error;
              }
            },
          });
          if (operationId) {
            recoveryManager?.commit(
              operationId,
              {
                sequenceName: result.sequenceName,
                duration: plan.outputDuration,
                cutMarkers: result.cutMarkers,
                punchCues: result.punchMarkers,
              },
              result,
            );
          }
          activity.add("success", `비파괴 자동 편집 시퀀스 생성: ${result.sequenceName} · 펀치인 클립 ${result.punchedClips}개`);
          for (const warning of result.warnings) activity.add("warning", warning);
          toast(`복제 시퀀스에 펀치인을 적용했습니다: ${result.sequenceName}`, result.warnings.length ? "warning" : "success", 6200);
          await refreshStatus(true);
        } catch (error) {
          if (operationId) {
            try { recoveryManager?.fail(operationId, error); } catch { /* journal already reached a terminal state */ }
          }
          throw error;
        } finally {
          recoveryPanel.render();
        }
      },
      onCreateSafeOverlay: createPremiereSafeZoneOverlay,
      onAlignSafeZone: async (alignment, platform, role) => {
        if (!alignment.changed) return;
        const result = await alignSelectedVideoToSafeZone(alignment, platform, role);
        activity.add(
          result.skipped === 0 && result.changed === result.selected ? "success" : "warning",
          `${safeZoneGuideLabel(platform, role)} 정렬 · 선택 ${result.selected}개 · 변경 ${result.changed}개 · 보존/건너뜀 ${result.skipped}개`,
        );
        for (const warning of result.warnings) activity.add("warning", warning);
        return result;
      },
    });
    await automationController.initialize();
  } catch (error) {
    automationController = null;
    reportError(error, "자동 편집/Safe Zone 초기화 실패");
  }
  try {
    subtitleController = new SubtitleController({
      getProjectKey: subtitleProjectKey,
      onSeek: (seconds) => setSequencePlayerPosition(seconds),
      onImportSrt: readSrtFile,
      onExportSrt: writeSrtFile,
      aiProvider: runSubtitleAI,
      analysisProvider: runSubtitleAnalysis,
      onChange: (document) => {
        automationController?.setTranscript(subtitleDocumentToAutomationTranscript(document));
      },
      onActivity: (message) => activity.add("success", message),
      onError: (error, context) => reportError(error, context),
    });
    await subtitleController.initialize();
  } catch (error) {
    subtitleController = null;
    reportError(error, "자막 편집기 초기화 실패");
  }
  try {
    speechController = new SpeechController({
      getSettings: () => settings,
      updateSettings,
      onActivity: (message) => activity.add("success", message),
      onWarning: (message) => activity.add("warning", message),
      onError: (error, context) => reportError(error, context),
      onSourceChange: () => {
        automationController?.setTranscript(null);
      },
      onTtsOutput: async (output, request, result) => {
        try {
          const record = createTtsAssetRightsRecord({
            nativePath: output.nativePath,
            name: output.name,
            model: result.model || request.model,
            voice: result.voice || request.voice,
            format: result.extension || request.format,
          });
          const saved = await ensureAssetRightsRegistry().upsert(record);
          const projectKey = await subtitleProjectKey().catch(() => SESSION_FALLBACK_PROJECT_KEY);
          rememberSessionGeneratedAssetRights(saved.assetId, projectKey);
          activity.add("info", `AI 음성 권리 정보 자동 기록: ${saved.assetName}`);
        } catch (error) {
          activity.add("warning", `AI 음성 권리 정보 자동 기록 실패: ${errorMessage(error)}`);
        }
      },
      onTranscript: (transcript) => {
        if (!subtitleController) {
          automationController?.setTranscript(resolveAutomationTranscript(transcript, null));
        }
        if (subtitleController && transcript.result.segments.length > 0) {
          subtitleController.setDocument(createSubtitleDocument(
            subtitleController.projectKey,
            transcript.result.segments.map((segment, index) => ({
              cueId: `stt_${String(index + 1).padStart(5, "0")}_${deterministicHash({
                start: segment.start,
                end: segment.end,
                text: segment.text,
              })}`,
              start: segment.start,
              end: segment.end,
              text: segment.speaker ? `[${segment.speaker}] ${segment.text}` : segment.text,
              enabled: true,
              hidden: false,
            })),
          ), true);
        }
      },
      ensureAiConsent: () => ensureAiConsent("TTS/STT"),
      runTts: (request) => {
        const client = new SpeechApiClient({ endpoint: settings.aiEndpoint });
        if (!aiQueueController) return client.synthesize(request);
        return aiQueueController.run("tts", {
          model: request.model,
          voice: request.voice,
          format: request.format,
          speed: request.speed,
          textHash: deterministicHash(request.text),
          instructionsHash: deterministicHash(request.instructions ?? ""),
        }, () => client.synthesize(request), { estimateUnits: 1, cacheTtlMs: 0 });
      },
      runStt: (request) => {
        const client = new SpeechApiClient({ endpoint: settings.aiEndpoint });
        // diarize 계열 타임아웃은 큐 재시도(120s×3≈6분) 대신 즉시 실패시켜 컨트롤러의
        // whisper-1 폴백이 이어받게 한다. whisper-1 자신의 타임아웃은 폴백이 없으므로 재시도 유지.
        const transcribe = async () => {
          try {
            return await client.transcribe(request);
          } catch (error) {
            if (isSttTimeoutError(error) && request.model !== "whisper-1" && error && typeof error === "object") {
              (error as { retryable?: boolean }).retryable = false;
            }
            throw error;
          }
        };
        if (!aiQueueController) return transcribe();
        return aiQueueController.run("stt", {
          model: request.model,
          language: request.language ?? "",
          filenameHash: deterministicHash(request.filename),
          mediaSize: request.bytes.byteLength,
          mediaDigest: deterministicHash(request.bytes),
          promptHash: deterministicHash(request.prompt ?? ""),
        }, transcribe, { estimateUnits: 2, cacheTtlMs: 0 });
      },
    });
    await speechController.initialize();
  } catch (error) {
    speechController = null;
    reportError(error, "TTS/STT 초기화 실패");
  }
  try {
    finalQCController = new FinalQCController({
      getSnapshot: buildFinalQCSnapshot,
      onActivity: (message) => activity.add("info", message),
      onError: (error, context) => reportError(error, context),
      onReport: (report) => {
        toast(
          report.blocking ? "최종 QC 오류로 내보내기가 차단됩니다." : report.status === "warning" ? "최종 QC를 조건부 통과했습니다." : "최종 QC를 통과했습니다.",
          report.blocking ? "error" : report.status === "warning" ? "warning" : "success",
          5600,
        );
      },
    });
    finalQCController.initialize();
  } catch (error) {
    finalQCController = null;
    reportError(error, "최종 QC 게이트 초기화 실패");
  }
  await refreshStatus(true);
  activity.add("info", "ShortFlow Studio가 준비되었습니다.");
}

function whenDocumentReady(task: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", task, { once: true });
    return;
  }
  task();
}

function startPanel(): void {
  whenDocumentReady(() => {
    setupTabs();
    void bootstrap()
      .then(() => startSubtitlePlayheadTracking())
      .catch((error) => reportError(error, "플러그인 초기화 실패"));
  });
}

function destroyPanel(): void {
  stopSubtitlePlayheadTracking();
  assetBrowserPanel.clearPreview();
  const controller = thumbnailController;
  thumbnailController = null;
  if (controller) {
    void controller.dispose().catch((error) => reportError(error, "썸네일 편집기 종료 저장 실패"));
  }
}

entrypoints.setup({
  panels: {
    shortflowPanel: {
      show() {
        startPanel();
      },
      hide() {
        stopSubtitlePlayheadTracking();
        assetBrowserPanel.clearPreview();
      },
      destroy() {
        destroyPanel();
      },
    },
  },
});

startPanel();
