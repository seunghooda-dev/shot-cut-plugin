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
  activateSequenceByContextKey,
  ameInstalled,
  applyShotFocalAdjustment,
  attachTranscriptToActiveSequence,
  createNewsItemSequences,
  deleteNewsItemSequences,
  exportSequenceFrameByName,
  listSequenceNames,
  queueSequenceExportsByName,
  renderSequenceExportsByName,
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
  assetRightsReportToJSON,
  assetRightsReportToMarkdown,
  createAssetRightsReport,
  createMissingAssetRightsRecord,
  createReferenceAssetRightsRecord,
  createTtsAssetRightsRecord,
  normalizeAssetRightsRecord,
  type AssetRightsInput,
  type AssetRightsRecord,
} from "./src/asset-rights";
import { SubtitleController, type SubtitleAiRequest, type SubtitleAnalysisRequest } from "./src/subtitle-controller";
import {
  MULTILANG_TARGETS,
  buildMultilangManifest,
  multilangManifestFileName,
  multilangSrtFileName,
  translatedCuesToSrt,
  validateTranslatedCuesForExport,
} from "./src/multilang";
import { resolveAutomationTranscript, subtitleDocumentToAutomationTranscript } from "./src/automation-transcript";
import { buildSrt, createSubtitleDocument, parseSrt, type SubtitleDocument } from "./src/subtitles";
import { buildPremiereTranscript } from "./src/transcript-export";
import { planUploadPackage } from "./src/upload-package";
import { loadSubtitleSnapshots, removeSubtitleSnapshot, saveSubtitleSnapshot } from "./src/subtitle-snapshots";
import {
  NEWS_CUT_INTERIOR_SPLIT_MIN_SECONDS,
  describeNewsItem,
  findShotSegments,
  mergeShortItemsForward,
  newsItemName,
  nextNewsItemIndex,
  normalizeNewsItems,
  snapItemsToAnchorStarts,
  splitItemsAtInteriorAnchors,
  type NewsItem,
} from "./src/news-cut";
import {
  buildAnchorMatcher,
  buildItemsFromStarts,
  collectAnchorCandidates,
  selectAnchorMatcher,
  detectModelStarts,
  detectStaticTailStart,
  hybridAnchorTimes,
  refineBoundaryToTransition,
  scoreAnchorSamples,
  type GridSample,
} from "./src/news-visual-cut";
import {
  NEWS_ANCHOR_REFERENCE_GRIDS,
  NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW,
} from "./src/news-anchor-reference-grids";
import { NEWS_ANCHOR_MODEL_BIAS, NEWS_ANCHOR_MODEL_WEIGHTS } from "./src/news-anchor-model";
import { base64ToBytes, loadAnchorExemplars, saveAnchorExemplar } from "./src/anchor-corpus";
import { LICENSE_CLOCK_KEY, LICENSE_STORAGE_KEY, licenseFailureMessage, verifyLicenseKey } from "./src/license";
import { LICENSE_PUBLIC_KEY } from "./src/license-public-key";
import { cloneSamplesForReusedTimes, looksCompleteImage, lumaGrid, parseBmp24, planFrameSampling } from "./src/frame-diff";
import { loadCachedSpans, saveCachedSpans } from "./src/vision-cache";
import { addStyleExample, clearStyleCorpus, loadStyleCorpus, removeStyleExample } from "./src/style-corpus";
import { computeDuckingEnvelope, duckLevelValueFromDb, duckRangesFromEnvelope, speechSpansFromCues } from "./src/audio-ducking";
import { resolveSubjectFocal, type SubjectPoint } from "./src/subject-focus";
import { annotateSpanTransitions, correctedFocalX, planSampleTimes, planShotFocalSpans, type FocalSpan, type TimedSubjectSample } from "./src/shot-focus";
import { createAdjustPanel } from "./src/adjust-panel";
import { updateShotPlanSpans, upsertShotPlan } from "./src/shot-plan-store";
import {
  alignShortToOriginal,
  buildStyleExample,
  classifyStylePair,
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
  clearChildren,
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
  // 부팅 직후에는 Host가 아직 준비 전이라 상태 읽기가 잠시 실패할 수 있다 — 짧게 재시도한 뒤에만
  // 세션 폴백으로 넘어간다(리로드 직후 엉뚱한 세션 문서가 로드되던 쿼크의 근본 원인, runbook 33-c).
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return subtitleProjectKeyFromStatus(await readSequenceStatus());
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return SESSION_FALLBACK_PROJECT_KEY;
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

// 스타일 쌍 등록용 SRT 2개 선택. 다중 선택을 지원하면 한 번에, 아니면 순차 2회로 받는다.
async function readSrtFilePair(): Promise<Array<{ name: string; text: string }> | null> {
  const uxpRoot = require("uxp") as any;
  const lfs = uxpRoot?.storage?.localFileSystem;
  const utf8 = uxpRoot?.storage?.formats?.utf8;
  if (!lfs?.getFileForOpening) throw new Error("파일 선택기를 사용할 수 없습니다.");
  const readEntry = async (file: any): Promise<{ name: string; text: string }> => {
    const value = await file.read({ format: utf8 });
    const text = typeof value === "string"
      ? value
      : value instanceof ArrayBuffer
        ? new TextDecoder().decode(value)
        : ArrayBuffer.isView(value)
          ? new TextDecoder().decode(value as ArrayBufferView)
          : null;
    if (text === null) throw new Error(`SRT 파일을 UTF-8 텍스트로 읽지 못했습니다: ${String(file.name)}`);
    return { name: String(file.name), text };
  };
  const selected = await lfs.getFileForOpening({ types: ["srt"], allowMultiple: true });
  const files = Array.isArray(selected) ? selected.filter(Boolean) : selected ? [selected] : [];
  if (files.length === 0) return null;
  if (files.length > 2) throw new Error("SRT는 정확히 2개(원본·숏폼)만 선택해 주세요.");
  if (files.length === 1) {
    toast("나머지 한 파일(숏폼 또는 원본 SRT)을 이어서 선택해 주세요.", "info");
    const second = await lfs.getFileForOpening({ types: ["srt"], allowMultiple: false });
    const secondFile = Array.isArray(second) ? second[0] : second;
    if (!secondFile) return null;
    files.push(secondFile);
  }
  return [await readEntry(files[0]), await readEntry(files[1])];
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

const adjustPanel = createAdjustPanel({
  applyAdjustment: (record, spans) => applyShotFocalAdjustment(
    record.sequenceName,
    spans,
    record.target.width,
    record.target.height,
    record.source.width,
    record.source.height,
  ),
  listSequenceNames,
  // 첫 샷 중앙 프레임 미리보기 — 내보낸 임시 PNG를 읽고 바로 지운다.
  exportPreviewFrame: async (record, seconds) => {
    const api = frameDataFolderApi();
    if (!api) return null;
    const dataFolder = await api.fileSystem.getDataFolder();
    const { filename } = await exportSequenceFrameByName(record.sequenceName, seconds, String(dataFolder.nativePath), 180);
    const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
    try {
      const entry = await dataFolder.getEntry(filename);
      await entry.delete();
    } catch {
      // 임시 파일 삭제 실패는 무시(다음 부팅 정리 대상)
    }
    return bytes;
  },
  runBusy: (message, task) => busy.during(message, task),
  onActivity: (level, message) => activity.add(level, message),
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
  renderNewsCutFolderLabel();
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
  readContextKey: readActiveContextKey,
  activateContextKey: activateSequenceByContextKey,
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
    renderNewsCutFolderLabel();
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
// 후보를 스캔한 시점의 원본 시퀀스 컨텍스트 — 생성이 끝나면 활성 시퀀스가 숏폼으로 바뀌므로 복원 근거로 쓴다.
let autoCutSourceKey = "";
// 학습 흐름: 현재 자막을 원본으로 지정해 두었다가, 숏폼 자막과 정렬해 스타일 예시를 뽑는다.
let pendingLearnOriginal: SubtitleDocument | null = null;

// 자동 컷 후보는 스캔 시점의 원본 시퀀스를 전제한다 — 활성이 바뀌어 있으면 원본을 자동 재활성화한다.
async function ensureAutoCutSourceActive(): Promise<void> {
  if (!autoCutSourceKey) return;
  const current = await readActiveContextKey().catch(() => "");
  if (current === autoCutSourceKey) return;
  const restored = await activateSequenceByContextKey(autoCutSourceKey);
  if (!restored) {
    throw new Error("자동 컷 후보를 만든 원본 시퀀스를 찾지 못했습니다. 원본 시퀀스를 활성화하고 후보를 다시 스캔해 주세요.");
  }
  activity.add("info", "자동 컷 원본 시퀀스를 다시 활성화했습니다.");
}

// AI가 자막 타임코드를 근거로 숏폼 컷 후보를 랭킹해 제안한다(shorts-plan 우선, 스타일 코퍼스 few-shot 주입).
async function handleAutoCutScan(): Promise<void> {
  ensureAiConsent("AI 자동 컷");
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다. 패널을 다시 열어 주세요.");
  autoCutSourceKey = await readActiveContextKey().catch(() => "");
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
  clearChildren(container); // UXP replaceChildren 스테일 버그 회피(§25-b)
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

// 자막이 없는 시퀀스용 원버튼: 시퀀스 오디오 STT로 자막을 만든 뒤 곧바로 자동 컷 스캔까지.
async function handleAutoCutSttScan(): Promise<void> {
  ensureAiConsent("AI 자동 컷");
  await transcribeActiveSequence();
  await handleAutoCutScan();
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
  await ensureAutoCutSourceActive();
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

// exportSequenceFrame은 성공을 반환해도 파일이 디스크에 늦게·부분적으로 나타난다(Host 실측)
// — 완결성(PNG IEND/BMP 선언 크기)까지 확인될 때까지 재시도 읽기. 잘린 프레임은 null.
async function readExportedFrameBytes(dataFolder: any, formats: any, filename: string): Promise<Uint8Array | null> {
  const kind = filename.toLowerCase().endsWith(".bmp") ? ("bmp" as const) : ("png" as const);
  let bytes: Uint8Array | null = null;
  for (let attempt = 0; attempt < 12 && (!bytes || !looksCompleteImage(bytes, kind)); attempt += 1) {
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
  return bytes && looksCompleteImage(bytes, kind) ? bytes.slice() : null;
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
  // 같은 (컨텍스트, 구간) 재생성이면 캐시된 스팬으로 비전 호출을 통째로 건너뛴다(§44).
  let cacheKey = "";
  try {
    cacheKey = `${await readActiveContextKey()}|shot-spans|${segment.start.toFixed(2)}~${segment.end.toFixed(2)}`;
    const cached = loadCachedSpans(cacheKey);
    if (cached) {
      activity.add("info", `샷 초점 캐시 재사용 · ${segment.title.slice(0, 24)} (${cached.length}개 샷, 비전 0회)`);
      return cached;
    }
  } catch {
    cacheKey = "";
  }
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
  // 비전 프리필터: 초소형 BMP 휘도 비교로 "직전과 같은 그림" 샘플을 걸러낸다(§44).
  // BMP 해석이 안 되는 프레임은 무조건 채택돼 필터가 실패해도 감지 범위는 줄지 않는다.
  const gridEntries: Array<{ time: number; grid: Float64Array | null }> = [];
  for (const time of times) {
    let grid: Float64Array | null = null;
    try {
      const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 64, undefined, "bmp");
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      const bmp = bytes ? parseBmp24(bytes) : null;
      if (bmp) grid = lumaGrid(bmp);
    } catch {
      grid = null;
    }
    gridEntries.push({ time, grid });
  }
  const sampling = planFrameSampling(gridEntries);
  if (sampling.reused.length > 0) {
    activity.add("info", `프레임 프리필터 · ${segment.title.slice(0, 24)} → 비전 ${times.length}장 중 ${sampling.keptIndices.length}장만 전송`);
  }
  let frames: Array<{ bytes: Uint8Array; time: number }> = [];
  for (const index of sampling.keptIndices) {
    const time = gridEntries[index]!.time;
    try {
      const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 320);
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      if (bytes) frames.push({ bytes, time });
    } catch {
      // 샘플 하나 실패는 무시
    }
  }
  if (frames.length === 0 || frames.length + sampling.reused.length < 2) return null;
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
  // 스킵된 시각에는 직전 채택 프레임의 감지값을 복제해 시간축 연속성을 유지한다.
  let samples = cloneSamplesForReusedTimes(await detectChunked(frames), sampling.reused);
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
  if (spans.length > 0 && cacheKey) saveCachedSpans(cacheKey, spans);
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
      // 조정 패널의 기준이 실제 화면 상태(보정 후)와 일치하도록 저장된 계획도 갱신한다.
      updateShotPlanSpans(shortResult.sequenceName, correctedSpans);
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
  await ensureAutoCutSourceActive();
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
  await ensureAutoCutSourceActive();
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
  // 프레이밍 계획 저장: 추적 모드로 만든 숏폼은 컷별 수동 조정(프레이밍 조정 패널)의 근거로 남긴다.
  if (sourceDims && !newsStyle) {
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      const marker = `_${String(index + 1).padStart(2, "0")}_`;
      const created = result.created.find((item) => item.sequenceName.includes(marker));
      if (!created) continue;
      const spans = segment.focalSpans
        ?? (typeof segment.focalX === "number"
          ? [{ start: segment.start, end: segment.end, x: segment.focalX, y: segment.focalY ?? 0.5 }]
          : []);
      if (spans.length === 0) continue;
      upsertShotPlan({
        sequenceName: created.sequenceName,
        createdAt: new Date().toISOString(),
        segment: { start: segment.start, end: segment.end, title: segment.name },
        spans,
        originalSpans: spans,
        target: { width: shortOptions.width, height: shortOptions.height },
        source: sourceDims,
      });
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
  adjustPanel.refresh();
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
  renderLearnCorpusList();
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

// SRT 파일 쌍(원본+숏폼) 한 번 선택으로 스타일 예시를 등록한다. 원본/숏폼은 길이로 자동 판별.
async function handleLearnPair(): Promise<void> {
  const pair = await readSrtFilePair();
  if (!pair) return;
  const docs = pair.map((entry) => {
    try {
      return parseSrt(entry.text, { projectKey: `style-pair:${entry.name}` });
    } catch (error) {
      throw new Error(`${entry.name}: SRT를 해석하지 못했습니다 — ${errorMessage(error)}`);
    }
  });
  const classified = classifyStylePair(docs[0]!, docs[1]!);
  if (!classified) {
    toast(
      "두 SRT의 길이가 비슷해 원본/숏폼을 판별하지 못했습니다. 기존 버튼(원본 지정→숏폼 학습)으로 순서를 지정해 주세요.",
      "warning",
    );
    return;
  }
  const alignment = alignShortToOriginal(classified.original, classified.short);
  if (alignment.spans.length === 0) {
    toast(
      `숏폼이 원본과 충분히 매칭되지 않았습니다(일치도 ${Math.round(alignment.coverage * 100)}%). 원본 오디오를 잘라 만든 숏폼인지 확인해 주세요.`,
      "warning",
    );
    return;
  }
  const example = buildStyleExample(classified.original, alignment.spans);
  if (!example) {
    toast("학습 예시를 만들지 못했습니다.", "warning");
    return;
  }
  const corpus = addStyleExample(example);
  renderLearnStatus();
  const originalName = pair[docs.indexOf(classified.original)]!.name;
  activity.add("success", `스타일 쌍 등록 · 원본=${originalName} · 예시 ${corpus.length}개 (일치도 ${Math.round(alignment.coverage * 100)}%)`);
  toast(`쌍을 학습했습니다. 스타일 예시 ${corpus.length}개가 다음 자동 컷에 반영됩니다.`, "success");
}

// 현재 자막 문서를 Premiere 트랜스크립트로 변환해 활성 시퀀스의 텍스트 패널에 첨부한다(§42).
async function handleAttachTranscript(): Promise<void> {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  const doc = controller.document;
  if (doc.cues.length === 0) throw new Error("먼저 자막을 불러오세요(STT 또는 SRT).");
  const built = buildPremiereTranscript(doc);
  if (built.segmentCount === 0) throw new Error("보낼 수 있는 자막이 없습니다(모두 비활성 또는 숨김).");
  const result = await busy.during("트랜스크립트를 텍스트 패널로 보내는 중…", () =>
    attachTranscriptToActiveSequence(built.json));
  const replaced = result.replaced ? " · 기존 트랜스크립트 교체" : "";
  activity.add("success", `트랜스크립트 첨부 · ${result.sequenceName} · 단어 ${result.words}개${replaced}`);
  toast("텍스트 패널에 첨부했습니다. 캡션이 필요하면 텍스트 패널의 '캡션 만들기'를 사용하세요.", "success", 7000);
}

// 자막 스냅샷 목록 렌더 — 라벨·시각·큐 수와 복원/삭제 버튼(문구는 전부 textContent — 주입 방지 하우스 룰).
function renderSubtitleSnapshotList(): void {
  const container = optionalElement<HTMLElement>("subtitle-snapshot-list");
  if (!container) return;
  clearChildren(container); // UXP replaceChildren 스테일 버그 회피(§25-b)
  const projectKey = subtitleController?.document.projectKey ?? "";
  const snapshots = projectKey ? loadSubtitleSnapshots(projectKey) : [];
  if (snapshots.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  snapshots.forEach((snapshot) => {
    const row = document.createElement("div");
    row.className = "learn-corpus-row";
    const label = document.createElement("span");
    const at = new Date(snapshot.createdAt);
    const stamp = Number.isNaN(at.getTime())
      ? ""
      : ` · ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    label.textContent = `${snapshot.label}${stamp}`;
    const actions = document.createElement("span");
    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "text-button";
    restoreBtn.textContent = "복원";
    restoreBtn.addEventListener("click", () => {
      const active = subtitleController;
      if (!active) return;
      active.setDocument(snapshot.document, true);
      activity.add("success", `자막 스냅샷 복원 · ${snapshot.label}`);
      toast("스냅샷을 복원했습니다. 되돌리려면 ↶ 되돌리기를 누르세요.", "success");
    });
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "text-button";
    removeBtn.textContent = "삭제";
    removeBtn.addEventListener("click", () => {
      removeSubtitleSnapshot(snapshot.projectKey, snapshot.id);
      renderSubtitleSnapshotList();
      activity.add("info", `자막 스냅샷 삭제 · ${snapshot.label}`);
    });
    actions.append(restoreBtn, removeBtn);
    row.append(label, actions);
    container.append(row);
  });
}

// 현재 자막 문서를 버전 스냅샷으로 저장한다(프로젝트 키당 최대 10개 — 로드맵 17).
function handleSaveSubtitleSnapshot(): void {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  const doc = controller.document;
  if (doc.cues.length === 0) throw new Error("저장할 자막이 없습니다. STT 또는 SRT를 먼저 불러오세요.");
  saveSubtitleSnapshot(doc, "");
  renderSubtitleSnapshotList();
  activity.add("success", `자막 스냅샷 저장 · 큐 ${doc.cues.length}개`);
  toast("현재 자막을 스냅샷으로 저장했습니다.", "success");
}

// 파일·폴더 이름용 로컬 타임스탬프(YYYYMMDDTHHMMSS) — ISO(UTC)를 쓰면 자정 부근 날짜가 어긋난다.
function localTimestamp(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// 다국어 패키지 v1 — 선택 언어마다 원본 불변 번역을 돌려 언어별 SRT + 매니페스트를 폴더에 저장한다(로드맵 15).
async function handleMultilangExport(): Promise<void> {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  const doc = controller.document;
  if (doc.cues.length === 0) throw new Error("먼저 자막을 불러오세요(STT 또는 SRT).");
  const selectedCodes = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-multilang]"))
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.multilang ?? "");
  const targets = MULTILANG_TARGETS.filter((target) => selectedCodes.includes(target.code));
  if (targets.length === 0) {
    toast("내보낼 언어를 하나 이상 선택해 주세요.", "warning");
    return;
  }
  ensureAiConsent("다국어 자막 번역");
  const uxpRoot = require("uxp") as any;
  const lfs = uxpRoot?.storage?.localFileSystem;
  const formats = uxpRoot?.storage?.formats;
  if (typeof lfs?.getFolder !== "function") throw new Error("폴더 선택 기능을 사용할 수 없습니다.");
  const parent = await lfs.getFolder();
  if (!parent) return; // 사용자 취소
  const baseName = valueOf("name-input") || "ShortFlow";
  const maxChars = Number(valueOf("subtitle-max-chars-input")) || 19;
  const results: Array<{ code: string; koreanName: string; file: string; cueCount: number }> = [];
  const failures: Array<{ code: string; koreanName: string; error: string }> = [];
  await busy.during(`다국어 번역 중… (${targets.length}개 언어)`, async () => {
    for (const [index, target] of targets.entries()) {
      setText("busy-message", `${index + 1}/${targets.length} · ${target.koreanName} 번역 중…`);
      try {
        const request: SubtitleAiRequest = { action: "translate", document: doc, maxChars, targetLanguage: target.label };
        const payload = await runSubtitleAI(request);
        // 내보내기 전용 관대 검증 — 무공백 언어(ja/zh)는 단어 수 보존이 깨져도 큐 텍스트만 있으면 된다.
        const cues = validateTranslatedCuesForExport(payload, doc);
        const name = multilangSrtFileName(baseName, target.code);
        const entry = await parent.createFile(name, { overwrite: true });
        await entry.write(translatedCuesToSrt(cues), { format: formats?.utf8 });
        results.push({ code: target.code, koreanName: target.koreanName, file: name, cueCount: cues.length });
      } catch (error) {
        failures.push({ code: target.code, koreanName: target.koreanName, error: errorMessage(error) });
      }
    }
    const manifest = await parent.createFile(multilangManifestFileName(baseName), { overwrite: true });
    await manifest.write(buildMultilangManifest(baseName, localTimestamp(), results, failures), { format: formats?.utf8 });
  });
  const summary = `다국어 SRT · 성공 ${results.length} · 실패 ${failures.length}`;
  activity.add(failures.length > 0 ? "warning" : "success", summary);
  failures.forEach((failure) => activity.add("error", `${failure.koreanName}: ${failure.error}`));
  toast(`${summary}. 매니페스트를 확인해 주세요.`, failures.length > 0 ? "warning" : "success", 6000);
}

// News Cut — 뉴스 전체 방송을 보도 아이템 단위로 분할한다(분석→시퀀스 생성→AME 일괄 내보내기).
let newsCutItems: NewsItem[] = [];
let newsCutSourceKey = "";
let newsCutCreatedNames: string[] = [];
// 플러그인 설치 폴더 경로(부팅 시 1회 조회) — 출력 폴더 오염 경고(speech-controller)에 쓴다.
let pluginFolderPathValue: string | null = null;

function selectedNewsItems(): Array<{ item: NewsItem; index: number }> {
  const container = optionalElement<HTMLElement>("news-cut-list");
  if (!container) return [];
  const selected: Array<{ item: NewsItem; index: number }> = [];
  for (const row of container.children) {
    for (const child of row.children) {
      const input = child as HTMLInputElement;
      if (String(input.tagName).toLowerCase() !== "input") continue;
      const index = Number(input.dataset.newsIndex);
      const item = newsCutItems[index];
      if (input.checked && item) selected.push({ item, index });
    }
  }
  return selected;
}

// 아이템 목록 렌더 — 체크박스 + 구간·제목(문구는 전부 textContent, §25-b clearChildren).
function renderNewsCutList(): void {
  const container = optionalElement<HTMLElement>("news-cut-list");
  if (!container) return;
  clearChildren(container);
  container.hidden = newsCutItems.length === 0;
  const actionable = newsCutItems.length > 0;
  for (const id of ["news-cut-create-btn", "news-cut-export-btn"]) {
    const button = optionalElement<HTMLButtonElement>(id);
    if (button) button.disabled = !actionable;
  }
  newsCutItems.forEach((item, index) => {
    const row = document.createElement("label");
    row.className = "learn-corpus-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.newsIndex = String(index);
    const label = document.createElement("span");
    label.textContent = describeNewsItem(item, index);
    row.append(checkbox, label);
    container.append(row);
  });
}

// 아이템 경계는 분석 시점의 원본 시퀀스를 전제한다 — 활성이 바뀌어 있으면 원본을 자동 재활성화한다(§46-b 패턴).
async function ensureNewsCutSourceActive(): Promise<void> {
  if (!newsCutSourceKey) return;
  const current = await readActiveContextKey().catch(() => "");
  if (current === newsCutSourceKey) return;
  const restored = await activateSequenceByContextKey(newsCutSourceKey);
  if (!restored) {
    throw new Error("아이템을 분석한 원본 시퀀스를 찾지 못했습니다. 원본을 활성화하고 다시 분석해 주세요.");
  }
  activity.add("info", "뉴스 분할 원본 시퀀스를 다시 활성화했습니다.");
}

// 앵커 샷 경계 스냅 — 경계 주변을 프레임 diff로 샷 분해(로컬)하고, 샷 대표 프레임만 비전으로
// "스튜디오 앵커 샷" 분류해 아이템 시작을 앵커 샷 시작 컷에 맞춘다. 끝은 다음 아이템 시작으로 잇는다.
// 스냅 후 3분 초과 아이템은 내부 앵커 컷을 추가 스캔해 병합 기사를 쪼갠다(§53-i).
async function snapNewsItemsToAnchors(items: NewsItem[], titleAt: (time: number) => string): Promise<NewsItem[]> {
  const api = frameDataFolderApi();
  if (!api || items.length === 0) return items;
  const dataFolder = await api.fileSystem.getDataFolder();
  const grabGrid = async (time: number): Promise<Float64Array | null> => {
    try {
      const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 96, undefined, "bmp");
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      try {
        const entry = await dataFolder.getEntry(filename);
        await entry.delete();
      } catch {
        // 임시 파일 삭제 실패는 무시
      }
      const bmp = bytes ? parseBmp24(bytes) : null;
      return bmp ? lumaGrid(bmp) : null;
    } catch {
      return null;
    }
  };
  // 1) 경계별 컷 스캔(로컬, 비전 0회) — 샷 구간 분해
  const boundaryShots: Array<Array<{ start: number; midTime: number }>> = [];
  for (const [index, item] of items.entries()) {
    setText("busy-message", `경계 스캔 ${index + 1}/${items.length}…`);
    busy.progress(10 + (50 * index) / items.length);
    const samples: Array<{ time: number; grid: Float64Array | null }> = [];
    // 텍스트 분석이 앵커 리드 문장을 앞 아이템 꼬리에 붙이면 실제 앵커 컷이 텍스트 경계보다
    // 10초 이상 앞설 수 있다(§53-i 실사용 보고: 아이템 하나에 앵커 샷 2개) — 뒤쪽을 넓게 스캔.
    const from = Math.max(0, item.start - 12);
    for (let time = from; time <= item.start + 4 + 0.001; time += 0.5) {
      samples.push({ time: Math.round(time * 10) / 10, grid: await grabGrid(time) });
    }
    boundaryShots.push(findShotSegments(samples));
  }
  // 2) 샷 대표 프레임 수집 → 12장 배치로 앵커 샷 분류(비전)
  const shotFrames: Array<{ boundary: number; shotStart: number; bytes: Uint8Array }> = [];
  for (const [boundary, shots] of boundaryShots.entries()) {
    for (const shot of shots) {
      try {
        const { filename } = await exportFrameToFolder(shot.midTime, String(dataFolder.nativePath), 272);
        const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
        try {
          const entry = await dataFolder.getEntry(filename);
          await entry.delete();
        } catch {
          // 임시 파일 삭제 실패는 무시
        }
        if (bytes) shotFrames.push({ boundary, shotStart: shot.start, bytes });
      } catch {
        // 대표 프레임 하나 실패는 무시
      }
    }
  }
  if (shotFrames.length === 0) return items;
  // 학습된 앵커 샷 예시(다른 세트 포함)를 참조 이미지로 함께 보내 분류를 안정화한다.
  // 잘린 예시 하나가 요청 전체를 거부시키므로 완결 PNG만 통과시킨다.
  const references = loadAnchorExemplars()
    .map((exemplar) => ({ bytes: base64ToBytes(exemplar.pngBase64), mimeType: "image/png" as const }))
    .filter((reference) => looksCompleteImage(reference.bytes, "png"))
    .slice(0, 5);
  const client = new OpenAITextClient({ endpoint: settings.aiEndpoint });
  const anchorFlags: boolean[] = new Array(shotFrames.length).fill(false);
  const anchorConfidences: number[] = new Array(shotFrames.length).fill(0);
  const batchSize = Math.max(4, 12 - references.length);
  for (let offset = 0; offset < shotFrames.length; offset += batchSize) {
    setText("busy-message", `앵커 샷 분류 ${Math.min(offset + batchSize, shotFrames.length)}/${shotFrames.length}…`);
    busy.progress(60 + (30 * offset) / shotFrames.length);
    const chunk = shotFrames.slice(offset, offset + batchSize);
    const results = await client.classifyAnchorShots(
      chunk.map((frame) => ({ bytes: frame.bytes, mimeType: "image/png" })),
      references,
    );
    for (const result of results) {
      if (result.isAnchor && result.confidence >= 0.5) {
        anchorFlags[offset + result.index] = true;
        anchorConfidences[offset + result.index] = result.confidence;
      }
    }
  }
  // 자동 학습 — 이번 방송에서 가장 확신 높은 앵커 프레임 1장을 예시 코퍼스에 저장(같은 라벨은 1회만).
  let bestIndex = -1;
  for (let index = 0; index < shotFrames.length; index += 1) {
    if (anchorFlags[index] && (bestIndex < 0 || anchorConfidences[index]! > anchorConfidences[bestIndex]!)) bestIndex = index;
  }
  if (bestIndex >= 0 && anchorConfidences[bestIndex]! >= 0.75) {
    try {
      const sourceName = (await readSequenceStatus()).sequenceName ?? "unknown";
      const corpus = saveAnchorExemplar({ label: `anchor:${sourceName}`, bytes: shotFrames[bestIndex]!.bytes });
      activity.add("info", `앵커 샷 학습 · 예시 ${corpus.length}개 보유`);
    } catch {
      // 학습 실패는 분류 결과에 영향 없음
    }
  }
  // 3) 경계별로 텍스트 시작에 가장 가까운 앵커 샷의 시작 컷으로 스냅
  const anchorStarts: Array<number | null> = items.map((item, boundary) => {
    let best: number | null = null;
    for (const [frameIndex, frame] of shotFrames.entries()) {
      if (frame.boundary !== boundary || !anchorFlags[frameIndex]) continue;
      if (best === null || Math.abs(frame.shotStart - item.start) < Math.abs(best - item.start)) {
        best = frame.shotStart;
      }
    }
    return best;
  });
  const snappedCount = anchorStarts.filter((value) => value !== null).length;
  activity.add("info", `앵커 샷 스냅 · ${snappedCount}/${items.length}개 경계 정렬(비전 ${Math.ceil(shotFrames.length / 12)}회)`);
  const snapped = snapItemsToAnchorStarts(items, anchorStarts);
  // 4) 병합 의심(3분 초과) 아이템 내부를 스캔해 숨은 앵커 컷에서 분할 — 텍스트 분석이
  //    경계를 아예 만들지 못한 병합 기사(파일 하나에 앵커 샷 2개 유형)를 잡는다.
  const interiorStarts: number[][] = [];
  let interiorVisionCalls = 0;
  for (const [index, item] of snapped.entries()) {
    if (item.end - item.start <= NEWS_CUT_INTERIOR_SPLIT_MIN_SECONDS) {
      interiorStarts.push([]);
      continue;
    }
    setText("busy-message", `내부 앵커 스캔 ${index + 1}/${snapped.length}…`);
    busy.progress(92);
    const samples: Array<{ time: number; grid: Float64Array | null }> = [];
    for (let time = item.start + 20; time <= item.end - 15 + 0.001; time += 1) {
      samples.push({ time: Math.round(time * 10) / 10, grid: await grabGrid(time) });
    }
    // 앵커 리드 샷은 보통 10초 이상 이어진다 — 8초 미만 샷은 비전 없이 걸러 비용을 줄인다.
    const longShots = findShotSegments(samples).filter((shot) => shot.end - shot.start >= 8);
    const candidates: Array<{ shotStart: number; bytes: Uint8Array }> = [];
    for (const shot of longShots) {
      try {
        const { filename } = await exportFrameToFolder(shot.midTime, String(dataFolder.nativePath), 272);
        const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
        try {
          const entry = await dataFolder.getEntry(filename);
          await entry.delete();
        } catch {
          // 임시 파일 삭제 실패는 무시
        }
        if (bytes) candidates.push({ shotStart: shot.start, bytes });
      } catch {
        // 대표 프레임 하나 실패는 무시
      }
    }
    const starts: number[] = [];
    for (let offset = 0; offset < candidates.length; offset += batchSize) {
      const chunk = candidates.slice(offset, offset + batchSize);
      const results = await client.classifyAnchorShots(
        chunk.map((frame) => ({ bytes: frame.bytes, mimeType: "image/png" })),
        references,
      );
      interiorVisionCalls += 1;
      for (const result of results) {
        if (result.isAnchor && result.confidence >= 0.6) starts.push(chunk[result.index]!.shotStart);
      }
    }
    interiorStarts.push(starts);
  }
  const split = splitItemsAtInteriorAnchors(snapped, interiorStarts, titleAt);
  if (split.length > snapped.length) {
    activity.add("info", `내부 앵커 분할 · 병합 기사 ${split.length - snapped.length}건 추가 분리(비전 ${interiorVisionCalls}회)`);
  }
  busy.progress(100);
  return split;
}

// 1단계 — 자막에서 보도 아이템 경계를 AI로 분석한다(읽기 전용, cueId 참조 검증).
async function handleNewsCutAnalyze(): Promise<void> {
  const controller = subtitleController;
  if (!controller) throw new Error("자막 편집기가 초기화되지 않았습니다.");
  const doc = controller.document;
  if (doc.cues.length === 0) throw new Error("먼저 자막을 만들어 주세요(TTS·STT 탭에서 시퀀스 STT 또는 SRT 불러오기).");
  ensureAiConsent("뉴스 분할 보도 아이템 분석");
  newsCutSourceKey = await readActiveContextKey().catch(() => "");
  const payload = await busy.during("보도 아이템 경계를 분석하고 있습니다…", () => {
    busy.progress(5);
    return runSubtitleAnalysis({ action: "news-items", document: doc });
  });
  let items = normalizeNewsItems(payload, doc);
  if (items.length > 0) {
    // 내부 분할 조각의 제목은 그 시각에 재생 중인 자막 문장으로 채운다.
    const titleAt = (time: number): string => {
      const cue = doc.cues.find((candidate) => !candidate.hidden && candidate.end > time + 0.5);
      return cue ? cue.text.trim().slice(0, 48) : "";
    };
    try {
      items = await busy.during("앵커 샷 기준으로 경계를 스냅하고 있습니다…", () => snapNewsItemsToAnchors(items, titleAt));
    } catch (error) {
      activity.add("warning", `앵커 샷 스냅 생략(텍스트 경계 사용): ${errorMessage(error)}`);
    }
    // 앵커 리드 한 문장이 별도 아이템으로 쪼개진 짧은 조각은 다음 리포트와 병합한다.
    const beforeMerge = items.length;
    items = mergeShortItemsForward(items);
    if (items.length < beforeMerge) {
      activity.add("info", `짧은 리드 조각 ${beforeMerge - items.length}건을 다음 아이템과 병합`);
    }
  }
  newsCutItems = items;
  newsCutCreatedNames = [];
  renderNewsCutList();
  if (newsCutItems.length === 0) {
    activity.add("warning", "뉴스 분할: 아이템 0개 — 자막이 뉴스 형식이 아닐 수 있습니다.");
    toast("보도 아이템을 찾지 못했습니다.", "warning");
    return;
  }
  activity.add("success", `뉴스 분할 분석 · 아이템 ${newsCutItems.length}개`);
  toast(`보도 아이템 ${newsCutItems.length}개를 찾았습니다. 목록에서 확인 후 생성하세요.`, "success");
}

// 2단계 — 선택 아이템을 원본 복제·트림으로 개별 시퀀스화(YYYYMMDD_news_NN).
async function handleNewsCutCreate(): Promise<void> {
  const selected = selectedNewsItems();
  if (selected.length === 0) {
    toast("생성할 아이템을 하나 이상 선택해 주세요.", "warning");
    return;
  }
  await ensureNewsCutSourceActive();
  const today = new Date();
  const startIndex = nextNewsItemIndex(await listSequenceNames().catch(() => []), today);
  const inputs = selected.map(({ item }, order) => ({
    start: item.start,
    end: item.end,
    name: newsItemName(today, startIndex + order),
  }));
  const result = await busy.during(`아이템 시퀀스 ${inputs.length}개를 만들고 있습니다…`, () =>
    createNewsItemSequences(inputs, (completed, total, name) => {
      setText("busy-message", `${completed}/${total} · ${name}`);
      busy.progress((completed / Math.max(1, total)) * 100);
    }));
  newsCutCreatedNames = result.created;
  activity.add(
    result.failures.length ? "warning" : "success",
    `뉴스 분할 시퀀스 생성 · 성공 ${result.created.length} · 실패 ${result.failures.length}`,
  );
  result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
  toast(`${result.created.length}개 아이템 시퀀스를 만들었습니다.`, result.failures.length ? "warning" : "success");
  await refreshStatus(true);
}

// 내보내기 기본값(내부 베타, 사용자 지시 2026-07-20) — 내보내기 탭 설정이 없어도 원클릭이
// 렌더까지 끝나도록 시스템 프리셋과 기존 산출물 폴더를 그대로 쓴다.
const DEFAULT_EXPORT_PRESET_PATH =
  "C:\\Program Files\\Adobe\\Adobe Premiere Pro 2026\\MediaIO\\systempresets\\4E49434B_48323634\\YouTube 1080p HD.epr";
const DEFAULT_EXPORT_OUTPUT_DIR = "C:\\Users\\seung\\Videos\\premiere_내보내기";

// 뉴스 분할 탭 화질 선택 — 시스템 프리셋(.epr) 매핑(내부 베타: Premiere 2026 설치 경로 고정,
// 파일 존재는 내보내기 시점에 Host가 검증). H.264=YouTube 계열, H.265=HEVC 계열 프리셋을 쓴다.
const NEWS_CUT_H264_PRESET_DIR =
  "C:\\Program Files\\Adobe\\Adobe Premiere Pro 2026\\MediaIO\\systempresets\\4E49434B_48323634";
const NEWS_CUT_HEVC_PRESET_DIR =
  "C:\\Program Files\\Adobe\\Adobe Premiere Pro 2026\\MediaIO\\systempresets\\4A454646_48455643";
const NEWS_CUT_PRESET_CHOICES: Record<string, string> = {
  "h264-2160": `${NEWS_CUT_H264_PRESET_DIR}\\YouTube 2160p 4K.epr`,
  "h264-1080": `${NEWS_CUT_H264_PRESET_DIR}\\YouTube 1080p HD.epr`,
  "h264-720": `${NEWS_CUT_H264_PRESET_DIR}\\YouTube 720p HD.epr`,
  "h264-480": `${NEWS_CUT_H264_PRESET_DIR}\\YouTube 480p SD Wide.epr`,
  "h264-src": `${NEWS_CUT_H264_PRESET_DIR}\\00 - Match Source - High bitrate.epr`,
  "hevc-2160": `${NEWS_CUT_HEVC_PRESET_DIR}\\4K UHD.epr`,
  "hevc-1080": `${NEWS_CUT_HEVC_PRESET_DIR}\\HD 1080p.epr`,
  "hevc-720": `${NEWS_CUT_HEVC_PRESET_DIR}\\HD 720p.epr`,
};

// 뉴스 분할 탭에서 고른 화질(코덱·해상도) 프리셋 경로 — "auto"면 null(내보내기 탭 설정을 따름).
function selectedNewsCutPresetPath(): string | null {
  const select = optionalElement<HTMLSelectElement>("news-cut-preset-select");
  const choice = select?.value ?? "auto";
  return NEWS_CUT_PRESET_CHOICES[choice] ?? null;
}

// 내보내기 대상 해석 — 프리셋·폴더를 각각 독립적으로 결정한다(선택된 토큰 우선, 없으면 기본값).
// 기본 폴더는 getEntryWithUrl로 실제 엔트리 취득을 시도해(성공 시 크기 안정화 폴링 가능) 실패하면
// 경로 셸만 넘긴다 — 이때 완료 판정은 렌더 promise 해소가 맡는다(§40 경합 유지).
async function resolveNewsCutExportTargets(): Promise<{ presetFile: any; outputFolder: any }> {
  syncSettingsFromUI();
  // 뉴스 분할 탭 화질 선택이 있으면 최우선 — 없으면(auto) 내보내기 탭 프리셋 → 기본값 순.
  const chosenPresetPath = selectedNewsCutPresetPath();
  const presetFile = chosenPresetPath
    ? { nativePath: chosenPresetPath }
    : settings.presetToken
      ? await requireStoredEntry(settings.presetToken, "내보내기 프리셋")
      : { nativePath: DEFAULT_EXPORT_PRESET_PATH };
  if (settings.outputFolderToken) {
    const outputFolder = await requireStoredEntry(settings.outputFolderToken, "출력 폴더");
    return { presetFile, outputFolder };
  }
  activity.add("info", `내보내기 폴더 미지정 — 기본 폴더 사용: ${DEFAULT_EXPORT_OUTPUT_DIR}`);
  let outputFolder: any = { nativePath: DEFAULT_EXPORT_OUTPUT_DIR };
  try {
    const lfs = (require("uxp") as any)?.storage?.localFileSystem;
    const url = `file:${DEFAULT_EXPORT_OUTPUT_DIR.replace(/\\/gu, "/")}`;
    const entry = await lfs?.getEntryWithUrl?.(url);
    if (entry?.isFolder) outputFolder = entry;
  } catch {
    // 접근이 막히면 경로 셸로 진행 — 렌더 자체는 Host가 경로 문자열로 수행한다.
  }
  return { presetFile, outputFolder };
}

// 뉴스 분할 탭의 내보내기 폴더 표시 — 선택된 폴더가 없으면 기본 폴더를 안내한다.
function renderNewsCutFolderLabel(): void {
  const label = settings.outputFolderName || "기본: premiere_내보내기";
  setText("news-cut-folder-name", label, settings.outputFolderName ? "" : DEFAULT_EXPORT_OUTPUT_DIR);
}

// 3단계 — 생성된 아이템 시퀀스를 내보내기 탭 프리셋·폴더(없으면 기본값)로 일괄 내보낸다.
// AME가 설치돼 있으면 대기열 추가, 없으면 Premiere 직접 렌더로 폴백한다.
async function handleNewsCutExport(): Promise<void> {
  if (newsCutCreatedNames.length === 0) throw new Error("먼저 '아이템 시퀀스 생성'을 실행해 주세요.");
  const targets = await resolveNewsCutExportTargets();
  await exportNewsSequencesWith(targets.presetFile, targets.outputFolder);
}

async function exportNewsSequencesWith(presetFile: any, outputFolder: any): Promise<void> {
  if (!ameInstalled()) {
    activity.add("info", "AME 미설치 — Premiere 직접 렌더로 내보냅니다.");
    const result = await busy.during(`${newsCutCreatedNames.length}개 렌더 중…`, () =>
      renderSequenceExportsByName(newsCutCreatedNames, presetFile, outputFolder, (completed, total, name) => {
        setText("busy-message", `${completed + 1}/${total} · ${name} 렌더 중…`);
        busy.progress((completed / Math.max(1, total)) * 100);
      }));
    activity.add(
      result.failures.length ? "warning" : "success",
      `뉴스 분할 직접 렌더 · 성공 ${result.queued.length} · 실패 ${result.failures.length}`,
    );
    result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
    toast(`${result.queued.length}개를 내보냈습니다. 출력 폴더를 확인하세요.`, result.failures.length ? "warning" : "success", 6000);
    return;
  }
  const result = await busy.during(`AME 대기열에 ${newsCutCreatedNames.length}개 추가 중…`, () =>
    queueSequenceExportsByName(newsCutCreatedNames, presetFile, outputFolder));
  activity.add(
    result.failures.length ? "warning" : "success",
    `뉴스 분할 대기열 추가 · 성공 ${result.queued.length} · 실패 ${result.failures.length}`,
  );
  result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
  toast(`${result.queued.length}개를 Media Encoder 대기열에 추가했습니다. AME에서 렌더를 시작하세요.`, result.failures.length ? "warning" : "success", 6000);
}

// 이전 아이템 정리 — 프로젝트의 YYYYMMDD_news_NN 시퀀스를 일괄 삭제한다(2단계 확인).
let newsCutCleanupArmTimer: ReturnType<typeof setTimeout> | null = null;

function disarmNewsCutCleanup(): void {
  if (newsCutCleanupArmTimer !== null) clearTimeout(newsCutCleanupArmTimer);
  newsCutCleanupArmTimer = null;
  const button = optionalElement<HTMLButtonElement>("news-cut-cleanup-btn");
  if (button) {
    button.textContent = "이전 아이템 정리";
    button.classList.remove("danger-button");
  }
}

async function handleNewsCutCleanup(): Promise<void> {
  const button = optionalElement<HTMLButtonElement>("news-cut-cleanup-btn");
  const count = (await listSequenceNames().catch(() => []))
    .filter((name) => /^\d{8}_news_\d{2,}$/u.test(name)).length;
  if (count === 0) {
    disarmNewsCutCleanup();
    toast("정리할 아이템 시퀀스가 없습니다.", "info");
    return;
  }
  if (newsCutCleanupArmTimer === null) {
    // 1차 클릭 — 삭제 대상 개수를 보여주고 4초간 확인을 기다린다(파괴적 동작 오클릭 방지).
    if (button) {
      button.textContent = `정말 삭제? (${count}개)`;
      button.classList.add("danger-button");
    }
    newsCutCleanupArmTimer = setTimeout(disarmNewsCutCleanup, 4000);
    return;
  }
  disarmNewsCutCleanup();
  const result = await busy.during(`아이템 시퀀스 ${count}개를 정리하고 있습니다…`, () => deleteNewsItemSequences());
  newsCutCreatedNames = [];
  renderNewsCutList();
  activity.add(
    result.failures ? "warning" : "success",
    `뉴스 분할 아이템 정리 · 삭제 ${result.deleted} · 실패 ${result.failures}`,
  );
  toast(`아이템 시퀀스 ${result.deleted}개를 정리했습니다.`, result.failures ? "warning" : "success");
  await refreshStatus(true);
}

// 원클릭 분할 — STT·자막 없이 화면(앵커 샷) 분석만으로 분할하고, 내보내기 설정이 없으면
// 기본 프리셋·폴더로 렌더까지 한 번에 끝낸다(설계: newscut-visual-oneclick.design.md).
// exportAfter=false 면 시퀀스 생성까지만 하고 내보내기는 생략한다(검토 후 '일괄 내보내기' 사용).
async function runNewsCutAutoFlow(exportAfter: boolean): Promise<void> {
  const api = frameDataFolderApi();
  if (!api) throw new Error("프레임 내보내기 API를 사용할 수 없습니다.");
  const status = await readSequenceStatus();
  const duration = Number(status.sequenceEnd) || 0;
  if (!(duration > 60)) throw new Error("활성 시퀀스가 없거나 너무 짧습니다 — 1분 이상 뉴스 방송 시퀀스를 활성화해 주세요.");
  newsCutSourceKey = await readActiveContextKey().catch(() => "");
  const dataFolder = await api.fileSystem.getDataFolder();
  // 같은 시각 재요청(경계 재스냅)이 잦아 시각별 그리드를 메모한다.
  const gridCache = new Map<number, Float64Array | null>();
  const grabGrid = async (time: number): Promise<Float64Array | null> => {
    const key = Math.round(time * 100);
    if (gridCache.has(key)) return gridCache.get(key)!;
    let grid: Float64Array | null = null;
    try {
      const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 96, undefined, "bmp");
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      try {
        const entry = await dataFolder.getEntry(filename);
        await entry.delete();
      } catch {
        // 임시 파일 삭제 실패는 무시
      }
      const bmp = bytes ? parseBmp24(bytes) : null;
      grid = bmp ? lumaGrid(bmp) : null;
    } catch {
      grid = null;
    }
    gridCache.set(key, grid);
    return grid;
  };

  const items = await busy.during("원클릭 분할 · 화면 스캔 준비 중…", async () => {
    // 1/4 코스 스캔(2s 그리드)
    const samples: GridSample[] = [];
    const total = Math.floor((duration - 1) / 2) + 1;
    for (let time = 0; time <= duration - 1; time += 2) {
      samples.push({ time, grid: await grabGrid(time) });
      if (samples.length % 10 === 0) {
        const percent = Math.round((samples.length / Math.max(1, total)) * 100);
        setText("busy-message", `1/4 화면 스캔 ${samples.length}/${total} · ${percent}%`);
        busy.progress(percent);
      }
    }
    // 2/4 후보 도출(무료 화면 매칭) + 아웃트로(구독 범퍼) 검출 — 포맷 라우팅(평일·레터박스·신형 중 최근접 뱅크)
    const matcher = selectAnchorMatcher(samples, [
      buildAnchorMatcher(NEWS_ANCHOR_REFERENCE_GRIDS),
      buildAnchorMatcher(NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW),
    ]);
    const candidates = collectAnchorCandidates(samples, matcher);
    if (candidates.length === 0) throw new Error("앵커 샷 후보를 찾지 못했습니다 — 뉴스 방송 시퀀스인지 확인해 주세요.");
    const tailStart = detectStaticTailStart(samples);
    // 앵커 확정 — 완전 무료(외부 API 0회): 자동 임계 주 앵커 + 강한 런 + 학습 모델 고신뢰 검출
    const probabilities = scoreAnchorSamples(samples, matcher, NEWS_ANCHOR_MODEL_WEIGHTS, NEWS_ANCHOR_MODEL_BIAS);
    const modelStarts = detectModelStarts(samples, probabilities);
    const accepted = hybridAnchorTimes(candidates, modelStarts);
    if (accepted.length === 0) throw new Error("앵커 샷을 찾지 못했습니다 — 뉴스 방송 시퀀스인지 확인해 주세요.");
    activity.add("info", `원클릭 분할 · 앵커 ${accepted.length}개(화면 매칭 후보 ${candidates.length} · 학습 모델 ${modelStarts.length})`);
    // 2/4 경계 정밀 재스냅(인점 = 전환 컷 정확히, §61)
    const rawItems = buildItemsFromStarts(accepted, tailStart ?? duration);
    if (rawItems.length === 0) throw new Error("보도 아이템을 구성하지 못했습니다.");
    const bounds = [...rawItems.map((item) => item.start), rawItems.at(-1)!.end];
    const refined: number[] = [];
    for (const [index, bound] of bounds.entries()) {
      const percent = Math.round((index / Math.max(1, bounds.length)) * 100);
      setText("busy-message", `2/4 경계 재스냅 ${index + 1}/${bounds.length} · ${percent}%`);
      busy.progress(percent);
      refined.push(await refineBoundaryToTransition(grabGrid, bound));
    }
    if (tailStart !== null) {
      activity.add("info", `원클릭 분할 · 아웃트로(구독 범퍼) ${Math.round(refined.at(-1)! * 10) / 10}s부터 제외`);
    }
    return refined.slice(0, -1)
      .map((start, index) => ({
        start,
        end: refined[index + 1]!,
        title: `아이템 ${index + 1}`,
      }))
      .filter((item) => item.end - item.start > 1);
  });

  newsCutItems = items;
  newsCutCreatedNames = [];
  renderNewsCutList();
  if (items.length === 0) throw new Error("보도 아이템을 만들지 못했습니다.");
  activity.add("success", `원클릭 분할 · 화면 분석 아이템 ${items.length}개`);
  await handleNewsCutCreate();
  if (newsCutCreatedNames.length === 0) {
    throw new Error("아이템 시퀀스가 만들어지지 않았습니다.");
  }
  if (!exportAfter) {
    activity.add("success", `분할 완료 — 시퀀스 ${newsCutCreatedNames.length}개 생성(내보내기 생략). 검토 후 '일괄 내보내기'를 누르세요.`);
    toast("분할이 끝났습니다. '일괄 내보내기'로 내보낼 수 있습니다.", "success", 6000);
    return;
  }
  const targets = await resolveNewsCutExportTargets();
  await exportNewsSequencesWith(targets.presetFile, targets.outputFolder);
  activity.add("success", "원클릭 분할 완료 — 출력 폴더를 확인하세요.");
}

async function handleNewsCutAuto(): Promise<void> {
  await runNewsCutAutoFlow(true);
}

async function handleNewsCutSplitOnly(): Promise<void> {
  await runNewsCutAutoFlow(false);
}

// 업로드 패키지 내보내기 — 자막 SRT·유튜브 메타·썸네일 SVG·권리 리포트를 폴더 하나로 묶는다(로드맵 18).
async function handleExportUploadPackage(): Promise<void> {
  const uxpRoot = require("uxp") as any;
  const lfs = uxpRoot?.storage?.localFileSystem;
  const formats = uxpRoot?.storage?.formats;
  if (typeof lfs?.getFolder !== "function") throw new Error("폴더 선택 기능을 사용할 수 없습니다.");
  const doc = subtitleController?.document ?? null;
  const srt = doc && doc.cues.length > 0 ? buildSrt(doc) : null;
  const analysis = subtitleController?.analysis ?? null;
  const metadata = analysis && analysis.action === "youtube-metadata"
    ? { title: analysis.title, description: analysis.description, tags: analysis.tags }
    : null;
  const thumbnails = thumbnailController?.listVariantExports() ?? [];
  let rightsMarkdown: string | null = null;
  let rightsJson: string | null = null;
  try {
    const report = createAssetRightsReport(currentAssetRightsRecords(await subtitleProjectKey()));
    rightsMarkdown = assetRightsReportToMarkdown(report);
    rightsJson = assetRightsReportToJSON(report);
  } catch {
    // 권리 리포트를 만들 수 없어도 패키지는 계속 만든다(README에 빠짐 안내).
  }
  const plan = planUploadPackage({
    baseName: valueOf("name-input") || "ShortFlow",
    timestamp: localTimestamp(),
    srt,
    metadata,
    thumbnails,
    rightsMarkdown,
    rightsJson,
  });
  const parent = await lfs.getFolder();
  if (!parent) return; // 사용자 취소
  await busy.during("업로드 패키지를 저장하고 있습니다…", async () => {
    const folder = await parent.createFolder(plan.folderName);
    for (const file of plan.files) {
      const entry = await folder.createFile(file.name, { overwrite: true });
      await entry.write(file.content, { format: formats?.utf8 });
    }
  });
  const missingNote = plan.missing.length > 0 ? ` · 빠짐 ${plan.missing.length}건(README 참고)` : "";
  activity.add("success", `업로드 패키지 저장 · ${plan.folderName} · 파일 ${plan.files.length}개${missingNote}`);
  toast(`업로드 패키지를 저장했습니다 (파일 ${plan.files.length}개${missingNote}).`, "success", 6000);
}

// 학습된 예시 목록을 그린다. 문구는 전부 textContent로만 넣는다(주입 방지 하우스 룰).
function renderLearnCorpusList(): void {
  const container = optionalElement<HTMLElement>("learn-corpus-list");
  if (!container) return;
  const corpus = loadStyleCorpus();
  clearChildren(container); // UXP replaceChildren 스테일 버그 회피(§25-b)
  if (corpus.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  corpus.forEach((example, index) => {
    const row = document.createElement("div");
    row.className = "learn-corpus-row";
    const label = document.createElement("span");
    const cuts = example.chosen.length;
    const seconds = Math.round(example.chosen.reduce((sum, choice) => sum + choice.durationSeconds, 0));
    label.textContent = `예시 ${index + 1} · 선택 ${cuts}컷 · ${seconds}초 · 원고 ${example.transcript.length.toLocaleString()}자`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary-button";
    remove.textContent = "삭제";
    remove.addEventListener("click", () => {
      removeStyleExample(index);
      renderLearnStatus();
      activity.add("info", `스타일 예시 ${index + 1} 삭제`);
    });
    row.append(label, remove);
    container.appendChild(row);
  });
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
  bind("auto-cut-stt-scan-btn", "click", guarded(handleAutoCutSttScan, "STT→자동 컷 실패"));
  bind("auto-cut-generate-btn", "click", guarded(handleAutoCutGenerate, "자동 컷 생성 실패"));
  bind("auto-cut-markers-btn", "click", guarded(handleAutoCutMarkers, "자동 컷 마커 표시 실패"));
  bind("auto-cut-reel-btn", "click", guarded(handleAutoCutReel, "하이라이트 릴 생성 실패"));
  bind("learn-capture-original-btn", "click", guarded(async () => handleLearnCaptureOriginal(), "학습 원본 지정 실패"));
  bind("learn-from-short-btn", "click", guarded(handleLearnFromShort, "숏폼으로 학습 실패"));
  bind("learn-pair-btn", "click", guarded(handleLearnPair, "스타일 쌍 등록 실패"));
  bind("subtitle-attach-transcript-btn", "click", guarded(handleAttachTranscript, "트랜스크립트 첨부 실패"));
  bind("upload-package-btn", "click", guarded(handleExportUploadPackage, "업로드 패키지 내보내기 실패"));
  bind("subtitle-snapshot-save-btn", "click", guarded(async () => handleSaveSubtitleSnapshot(), "자막 스냅샷 저장 실패"));
  bind("multilang-export-btn", "click", guarded(handleMultilangExport, "다국어 SRT 내보내기 실패"));
  bind("news-cut-auto-btn", "click", guarded(handleNewsCutAuto, "원클릭 분할 실패"));
  bind("news-cut-split-btn", "click", guarded(handleNewsCutSplitOnly, "분할 실패"));
  bind("news-cut-analyze-btn", "click", guarded(handleNewsCutAnalyze, "뉴스 분할 분석 실패"));
  bind("news-cut-create-btn", "click", guarded(handleNewsCutCreate, "뉴스 분할 시퀀스 생성 실패"));
  bind("news-cut-export-btn", "click", guarded(handleNewsCutExport, "뉴스 분할 내보내기 실패"));
  bind("news-cut-cleanup-btn", "click", guarded(handleNewsCutCleanup, "뉴스 분할 아이템 정리 실패"));
  bind("news-cut-folder-btn", "click", guarded(handleChooseOutput, "내보내기 폴더 선택 실패"));
  bind("license-apply-btn", "click", handleLicenseApply);
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
  renderSubtitleSnapshotList();
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
    // 컨트롤러가 프로젝트 키·자동 저장을 복원한 뒤라야 기존 스냅샷이 보인다(부팅 초기 렌더는 키가 비어 숨김).
    renderSubtitleSnapshotList();
  } catch (error) {
    subtitleController = null;
    reportError(error, "자막 편집기 초기화 실패");
  }
  try {
    // 출력 폴더가 플러그인 소스/설치 트리 안이면 경고하기 위한 설치 경로(비동기 1회 조회).
    void (async () => {
      try {
        const lfs = (require("uxp") as any)?.storage?.localFileSystem;
        const pluginFolder = await lfs?.getPluginFolder?.();
        pluginFolderPathValue = pluginFolder?.nativePath ? String(pluginFolder.nativePath) : null;
      } catch {
        pluginFolderPathValue = null;
      }
    })();
    speechController = new SpeechController({
      getSettings: () => settings,
      updateSettings,
      onActivity: (message) => activity.add("success", message),
      onWarning: (message) => activity.add("warning", message),
      onError: (error, context) => reportError(error, context),
      pluginFolderPath: () => pluginFolderPathValue,
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
  // 부팅 시점 상태 읽기가 실패해 세션 폴백 문서가 남았을 수 있어 잠시 뒤 한 번 더 동기화한다.
  // 키가 이미 맞으면 no-op이라 무해하다(runbook 33-c 자기치유).
  setTimeout(() => {
    void refreshStatus(true);
  }, 2500);
  updateLicenseOverlay();
  activity.add("info", "ShortFlow Studio가 준비되었습니다.");
}

// 라이선스 게이트 — 배포(release) 빌드에서만 잠금 오버레이를 강제한다. dev 빌드는 상태 로그만.
declare const __SHORTFLOW_RELEASE__: boolean;

function licenseEnforced(): boolean {
  return typeof __SHORTFLOW_RELEASE__ !== "undefined" && __SHORTFLOW_RELEASE__ === true;
}

function readLicenseLastSeenMs(): number {
  const value = Number(localStorage.getItem(LICENSE_CLOCK_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function stampLicenseLastSeen(nowMs: number): void {
  try {
    localStorage.setItem(LICENSE_CLOCK_KEY, String(Math.max(readLicenseLastSeenMs(), nowMs)));
  } catch {
    // 저장 실패는 다음 실행에서 다시 시도
  }
}

function updateLicenseOverlay(): void {
  const overlay = optionalElement<HTMLElement>("license-overlay");
  if (!overlay) return;
  const storedKey = localStorage.getItem(LICENSE_STORAGE_KEY) ?? "";
  const now = Date.now();
  const check = verifyLicenseKey(storedKey, LICENSE_PUBLIC_KEY, now, readLicenseLastSeenMs());
  if (check.ok) {
    stampLicenseLastSeen(now);
    overlay.hidden = true;
    if (check.daysLeft <= 7) {
      activity.add("warning", `시리얼 키 만료까지 ${check.daysLeft}일 남았습니다 — 연장 키를 준비하세요.`);
    } else {
      activity.add("info", `시리얼 키 확인 · ${check.info.id} · 만료까지 ${check.daysLeft}일`);
    }
    return;
  }
  if (!licenseEnforced()) {
    overlay.hidden = true;
    return;
  }
  setText("license-status", check.reason === "EMPTY"
    ? "발급받은 시리얼 키를 붙여넣어 주세요."
    : licenseFailureMessage(check.reason));
  overlay.hidden = false;
}

function handleLicenseApply(): void {
  const input = optionalElement<HTMLTextAreaElement>("license-key-input");
  const key = input?.value?.trim() ?? "";
  const check = verifyLicenseKey(key, LICENSE_PUBLIC_KEY, Date.now(), readLicenseLastSeenMs());
  if (!check.ok) {
    setText("license-status", licenseFailureMessage(check.reason));
    return;
  }
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, key);
  } catch {
    setText("license-status", "키를 저장하지 못했습니다. 다시 시도해 주세요.");
    return;
  }
  stampLicenseLastSeen(Date.now());
  if (input) input.value = "";
  updateLicenseOverlay();
  toast(`시리얼 키 적용 완료 · 만료까지 ${check.daysLeft}일`, "success");
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
