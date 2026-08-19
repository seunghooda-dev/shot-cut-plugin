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
import { AutomationController, type AutomationTimeBaseMismatch } from "./src/automation-controller";
import { BrandKitController } from "./src/brand-kit-controller";
import { AIQueueController } from "./src/ai-queue-controller";
import { deterministicHash } from "./src/job-queue";
import { SpeechApiClient, isSttTimeoutError, type TranscriptSegment } from "./src/speech";
import {
  findSignoffs,
  planSignoffWindows,
  signoffProbeTimes,
  createWavWindowSlicer,
  SIGNOFF_PATTERN,
  MORNING_WIDE_SIGNOFF_PATTERN,
  type SignoffHit,
} from "./src/audio-signoff";
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
import { resolveAutomationTranscript } from "./src/automation-transcript";
import { buildSrt, createSubtitleDocument, parseSrt, type SubtitleDocument } from "./src/subtitles";
import { buildPremiereTranscript } from "./src/transcript-export";
import { planUploadPackage } from "./src/upload-package";
import { loadSubtitleSnapshots, removeSubtitleSnapshot, saveSubtitleSnapshot } from "./src/subtitle-snapshots";
import {
  NEWS_CUT_INTERIOR_SPLIT_MIN_SECONDS,
  NEWS_ITEM_SEQUENCE_PATTERN,
  describeNewsItem,
  findShotSegments,
  mergeShortItemsForward,
  newsItemName,
  nextNewsItemIndex,
  normalizeNewsItems,
  sanitizeNewsItemTitle,
  snapItemsToAnchorStarts,
  splitItemsAtInteriorAnchors,
  type NewsItem,
} from "./src/news-cut";
import {
  buildAnchorMatcher,
  buildItemsFromStarts,
  bankFitDistance,
  BANK_FIT_WARN_DISTANCE,
  detectBandEvents,
  planRescueProbes,
  VISUAL_LONG_SHOT_MAX_DIST,
  collectAnchorCandidates,
  detectMismatchBorder,
  selectAnchorMatcher,
  detectModelStarts,
  detectStaticTailStart,
  hybridAnchorTimes,
  chunkVisionProbes,
  columnMidRescueDrops,
  isQuoteBandStats,
  isSameShotGrid,
  lowerThirdRowStats,
  refineBoundaryToTransition,
  scoreAnchorSamples,
  type GridSample,
} from "./src/news-visual-cut";
import {
  NEWS_ANCHOR_REFERENCE_GRIDS,
  NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW,
} from "./src/news-anchor-reference-grids";
import {
  MORNING_WIDE_REFERENCE_GRIDS,
  MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT,
  MORNING_WIDE_REFERENCE_GRIDS_LIGHT,
  MORNING_WIDE_REFERENCE_GRIDS_0730,
  MORNING_WIDE_REFERENCE_GRIDS_0731,
  MORNING_WIDE_REFERENCE_GRIDS_0803,
  MORNING_WIDE_REFERENCE_GRIDS_0805,
} from "./src/morning-wide-reference-grids";
import { NEWS_ANCHOR_MODEL_BIAS, NEWS_ANCHOR_MODEL_WEIGHTS } from "./src/news-anchor-model";
import { MORNING_WIDE_ANCHOR_MODEL_BIAS, MORNING_WIDE_ANCHOR_MODEL_WEIGHTS } from "./src/morning-wide-anchor-model";
import { base64ToBytes, bytesToBase64, loadAnchorExemplars, saveAnchorExemplar } from "./src/anchor-corpus";
import { LICENSE_CLOCK_KEY, LICENSE_STORAGE_KEY, licenseFailureMessage, verifyLicenseKey } from "./src/license";
import { LICENSE_PUBLIC_KEY } from "./src/license-public-key";
import { bandRow, cloneSamplesForReusedTimes, looksCompleteImage, lumaGrid, parseBmp24, planFrameSampling } from "./src/frame-diff";
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
import { OpenAITextClient, chunkSubtitleCues, hasStoredOpenAIApiKey } from "./src/openai-text";
import {
  CUE_SHEET_MAX_ROWS,
  cueSheetChecksum,
  cueSheetItemStarts,
  detectCueSheetProgram,
  parseCueSheetResponse,
  parseStoredCueSheet,
  serializeCueSheet,
  type CueSheet,
  type CueSheetChecksum,
} from "./src/cue-sheet";
import { recoverFromCueSheet, titleItemsFromCueSheet } from "./src/cue-sheet-align";
import {
  buildReferencePrompt,
  type ReferenceFileEntry,
  type ReferenceItem,
} from "./src/references";
import { RECOVERY_STORAGE_KEY, RecoveryManager } from "./src/recovery";
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
  redactUiError,
  setChecked,
  setText,
  setValue,
  setupTabs,
  toast,
  valueOf,
} from "./src/ui";
import { PersistentLog } from "./src/persistent-log";

const { entrypoints } = require("uxp") as any;
const ASSET_RIGHTS_EMPTY_STATUS = "선택한 음악·효과음·이미지·영상·AI 에셋의 권리 정보를 기록하면 최종 QC에 반영됩니다.";
const SESSION_FALLBACK_PROJECT_KEY = "session";

installTextEncodingPolyfill();

// 지속 로그(운영 감사·사용자 요청 2026-08-12) — 활동 로그는 DOM 인메모리라 패널을 다시 열면
// 사라져, 다른 PC에서 분할 오류의 사후 진단이 불가능했다. 모든 활동 로그와 잡히지 않은 플러그인
// 오류를 플러그인 데이터 폴더의 일자별 파일(shortflow-log-YYYYMMDD.log)에 남긴다.
const persistentLog = new PersistentLog();
const activity = new ActivityLog("log-list", (level, message) => persistentLog.log(level, message));
const busy = new BusyState();
// 잡히지 않은 오류도 파일에 남긴다 — "플러그인이 왜 죽었는지"의 마지막 단서.
try {
  window.addEventListener("error", (event) => {
    persistentLog.log("error", `잡히지 않은 오류: ${redactUiError(String((event as ErrorEvent)?.message ?? event))}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent)?.reason as { message?: unknown } | undefined;
    persistentLog.log("error", `처리되지 않은 거부: ${redactUiError(String(reason?.message ?? reason ?? ""))}`);
  });
} catch { /* 리스너 설치 실패는 무시 */ }
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

// §189 #2: 원고·시퀀스 길이 불일치 확인 모달 — 복구 패널과 같은 fail-closed 규약이라
// 다이얼로그를 열 수 없으면 승인 없이 진행하지 않는다(false = 취소).
interface UxpTimeBaseDialogElement extends HTMLDialogElement {
  uxpShowModal?: (options: {
    title: string;
    resize: "none";
    size: { width: number; height: number };
  }) => Promise<unknown>;
}

function automationMinutesLabel(value: number): string {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  return `${Math.floor(safe / 60)}분 ${Math.round(safe % 60)}초`;
}

async function requestAutomationTimeBaseConfirmation(details: AutomationTimeBaseMismatch): Promise<boolean> {
  const dialog = optionalElement<UxpTimeBaseDialogElement>("automation-timebase-dialog");
  const label = optionalElement<HTMLElement>("automation-timebase-label");
  const approve = optionalElement<HTMLButtonElement>("automation-timebase-approve-btn");
  const cancel = optionalElement<HTMLButtonElement>("automation-timebase-cancel-btn");
  if (!dialog || !label || !approve || !cancel || typeof dialog.uxpShowModal !== "function") return false;
  label.textContent =
    `${details.transcriptName || "자동 편집 원고"} · 원고 ${automationMinutesLabel(details.transcriptDuration)}` +
    ` vs 활성 시퀀스 ${automationMinutesLabel(details.sequenceDuration)}`;
  const approveHandler = (): void => dialog.close("confirm");
  const cancelHandler = (): void => dialog.close("cancel");
  approve.addEventListener("click", approveHandler);
  cancel.addEventListener("click", cancelHandler);
  try {
    const result = await dialog.uxpShowModal({
      title: "ShortFlow Studio · 원고·시퀀스 길이 불일치",
      resize: "none",
      size: { width: 420, height: 300 },
    });
    return result === "confirm";
  } catch {
    return false;
  } finally {
    approve.removeEventListener("click", approveHandler);
    cancel.removeEventListener("click", cancelHandler);
  }
}

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
  setChecked("news-cut-vision-check", settings.newsCutVision);
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
    newsCutVision: checkedOf("news-cut-vision-check"),
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
    throw new Error(`${context} 실행 전 AI 전송·개인정보·권리·AI 음성 고지 동의가 필요합니다 — 'AI 설정' 탭의 동의 체크박스를 켜 주세요.`);
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
  // 먼저 읽고, 불완전할 때만 잔다(성능 감사 F1) — 종전 "무조건 400ms 선수면"은 모든 경로의 모든
  // 프레임(스캔·비전·재스냅·회수, 실행당 1,000장+)에 400ms 바닥을 깔아 순수 대기만 수 분이었다.
  // 완결성 게이트(looksCompleteImage)는 그대로라 잘린/미도착 프레임은 종전처럼 재시도로 걸러진다.
  // 재시도 대기는 100ms부터 800ms 상한 백오프(최대 총 ~6.6s — 종전 4.8s보다 느린 플러시에도 여유).
  for (let attempt = 0; attempt < 12 && (!bytes || !looksCompleteImage(bytes, kind)); attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(800, 100 * attempt)));
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
  // 읽고 나면 파일은 쓸모가 없다 — 여기서 지운다(§167-b). 호출자 5곳(1160·1205·1222·1278·1329)이
  // 정리를 빠뜨리고 있었는데, 개별 호출부마다 붙이는 대신 헬퍼 한 곳에서 끝낸다. 이미 호출부에서
  // 지우는 경로들은 없는 파일을 지우려다 catch로 흡수되므로 무해하다.
  try {
    const entry = await dataFolder.getEntry(filename);
    await entry.delete();
  } catch { /* 임시 파일 삭제 실패는 무시 — 다음 실행이 같은 이름으로 덮어쓴다 */ }
  return bytes && looksCompleteImage(bytes, kind) ? bytes.slice() : null;
}

// 부팅 임시파일 스윕(운영 감사) — 크래시로 남은 프레임 이미지(sf_frame_*)와 오디오 WAV가
// 플러그인 데이터 폴더에 영구 누적되는 것을 회수한다(§167 계열: 회차당 ~30MB·하루 2.8GB 실측).
// 부팅 시점엔 실행 중인 분할이 없어 sf_frame_*은 전부 잔재다. WAV는 정상 경로가 즉시 지우므로
// 남은 것도 잔재지만, 만일을 위해 1시간 넘게 묵은 것만 지운다.
async function sweepDataFolderTemps(): Promise<void> {
  try {
    const api = frameDataFolderApi();
    if (!api) return;
    const dataFolder = await api.fileSystem.getDataFolder();
    const entries = await dataFolder.getEntries?.();
    if (!Array.isArray(entries)) return;
    let removed = 0;
    const now = Date.now();
    for (const entry of entries) {
      const name = String(entry?.name ?? "");
      const isFrame = /^sf_frame_.*\.(?:bmp|png)$/iu.test(name);
      const isWav = /\.wav$/iu.test(name);
      if (!isFrame && !isWav) continue;
      if (isWav) {
        try {
          const meta = await entry.getMetadata?.();
          const modified = meta?.dateModified instanceof Date
            ? meta.dateModified.getTime()
            : Number(meta?.dateModified ?? Number.NaN);
          if (!Number.isFinite(modified) || now - modified < 3_600_000) continue;
        } catch {
          continue;
        }
      }
      try {
        await entry.delete();
        removed += 1;
      } catch { /* 잠금 등 삭제 실패는 다음 부팅에 재시도 */ }
    }
    if (removed > 0) activity.add("info", `임시 파일 정리 — 이전 실행이 남긴 ${removed}개(프레임/WAV)를 지웠습니다.`);
  } catch { /* 스윕 실패는 기능에 영향 없음 */ }
}

// 뉴스 분할 탭 첫 실행 배너(UX 감사 A-1·A-2) — API 키·전송 동의가 없으면 비전 없이 무료로
// 동작한다는 사실을 핵심 탭에서 바로 보여주고, AI 설정 탭으로 안내한다.
async function refreshNewsCutSetupBanner(): Promise<void> {
  const banner = optionalElement<HTMLElement>("newscut-setup-banner");
  if (!banner) return;
  try {
    syncSettingsFromUI();
    const hasKey = await hasStoredOpenAIApiKey();
    banner.hidden = Boolean(settings.aiConsentAccepted && hasKey);
  } catch {
    banner.hidden = true;
  }
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
  // 전량 숨김·비활성 문서 가드(§186-b) — 번역 SRT는 보이는 큐만 담으므로(§185), 이대로
  // 진행하면 언어별 0바이트 SRT가 만들어지고 성공으로 집계된다. 번역 비용을 쓰기 전에 막는다.
  if (!doc.cues.some((cue) => cue.enabled && !cue.hidden)) {
    throw new Error("내보낼 수 있는 표시 자막이 없습니다 — 전부 숨김·비활성 상태입니다.");
  }
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
let newsCutSourceName = "";
// 미리보기 경합 가드 — 목록이 다시 그려지면 이전 로드는 버린다(adjust-panel 패턴).
let newsCutThumbToken = 0;
let newsCutCreatedNames: string[] = [];
// 생성 시점 GUID(§184 #14) — 이름과 인덱스 1:1, 내보내기 해석의 1차 키.
let newsCutCreatedGuids: Array<string | null> = [];
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

// 이번 실행에서 읽어 둔 큐시트(사진 판독분).
let loadedCueSheet: CueSheet | null = null;

// 검산 실패 사유를 수치까지 적는다 — "불일치"만으로는 총합이 틀린 것인지 중간 행이
// 틀린 것인지 가릴 수 없고, 둘은 처방이 다르다(전자는 재촬영, 후자는 그 행만 재판독).
function cueChecksumDetail(checksum: CueSheetChecksum): string {
  const parts: string[] = [];
  if (checksum.durationSum !== checksum.lastCumulative) {
    parts.push(`소요 합 ${checksum.durationSum}s vs 누적 끝 ${checksum.lastCumulative}s`);
  }
  if (checksum.brokenRows.length > 0) parts.push(`누적 어긋난 행 ${checksum.brokenRows.join("·")}`);
  return parts.length > 0 ? parts.join(" · ") : "행 없음";
}

/**
 * 이번 회차에 쓸 큐시트를 정한다. 방금 올린 것이 있으면 그것을 쓰고, 없으면 **시퀀스 이름의
 * 날짜로 저장분을 찾는다** — 세션 값만 두면 패널을 다시 열 때마다 다시 올려야 해서 실무에서
 * 쓰이지 않는다. 이름에 날짜가 없거나 저장분이 없으면 큐시트 없이 진행한다(동작 불변).
 */
/**
 * 회차별 큐시트 저장 파일명. **프로그램을 이름에 넣는다** — 같은 날 8뉴스와 모닝와이드가
 * 둘 다 방송되므로 날짜만 쓰면 서로 덮어쓰고, 한쪽 큐시트가 다른 프로그램 분할에 물린다
 * (2026-08-10 실사고: 주말 8뉴스 7/11·7/12 큐시트가 모닝와이드 저장분으로 배치돼 있었다).
 * 모닝와이드만 접미사를 붙여 **8뉴스 기존 파일명을 그대로 둔다** — 이미 배치된 저장분을
 * 이름 변경으로 잃지 않기 위함이다.
 */
function cueSheetFileName(date: string, program: NewsCutProgram): string {
  return program === "morningwide" ? `cue-sheet_${date}_mw.json` : `cue-sheet_${date}.json`;
}

async function resolveCueSheetForSource(sequenceName: string, program: NewsCutProgram): Promise<void> {
  // 이 경로는 **조용히 실패하면 안 된다.** 첫 실기에서 큐시트가 전혀 관여하지 않았는데
  // 로그가 한 줄도 없어 원인을 가릴 수 없었다(파일·정규식·호출 모두 정상인데도). 어느
  // 단계에서 멈췄는지 항상 남긴다 — 침묵하는 가드는 없느니만 못하다는 게 이 프로젝트의 교훈이다.
  const name = String(sequenceName ?? "");
  const match = /(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/u.exec(name);
  const date = match ? `${match[1]}-${match[2]}-${match[3]}` : "";
  // **세션 값을 회차 대조 없이 재사용하면 안 된다(§7-bb 실기 실증).** 패널을 한 번 열고 여러
  // 회차를 도는 배치에서는 2회차부터 전부 1회차 큐시트로 돌았다(7/17이 7/15의 19꼭지로 회수).
  // 날짜가 다르면 폐기하고 그 회차 저장분을 다시 찾는다.
  if (loadedCueSheet) {
    if (date === "") {
      // 대조할 날짜가 없다는 사실을 반드시 남긴다 — 정상 재사용과 문구가 같으면 배치에서
      // 잘못된 회차의 큐시트를 쓰고도 사후에 구별할 수 없다.
      activity.add("warning", `큐시트: 이번 세션 값(${loadedCueSheet.broadcastDate || "날짜미상"})을 씁니다 — 시퀀스 이름(${name || "이름 없음"})에 날짜가 없어 **회차 대조를 못 했습니다.**`);
      return;
    }
    if (loadedCueSheet.broadcastDate === date) {
      activity.add("info", `큐시트: 이번 세션에 올린 것을 씁니다(${date} 대조 일치).`);
      return;
    }
    activity.add("info", `큐시트: 세션 값(${loadedCueSheet.broadcastDate || "날짜미상"})이 이 회차(${date})와 달라 폐기하고 저장분을 찾습니다.`);
    loadedCueSheet = null;
  }
  if (!match) { activity.add("info", `큐시트: 시퀀스 이름에 날짜가 없어 건너뜁니다(${name || "이름 없음"}).`); return; }
  const api = frameDataFolderApi();
  if (!api) { activity.add("info", "큐시트: 파일 저장소를 쓸 수 없어 건너뜁니다."); return; }
  try {
    const dataFolder = await api.fileSystem.getDataFolder();
    const entry = await dataFolder.getEntry(cueSheetFileName(date, program));
    // 저장분은 초로 정규화돼 있으므로 **저장분 전용 파서**를 쓴다 — AI 응답용 파서를 태우면
    // 시계 문자열이 아니라 전 행이 버려진다(§7-ay 실사고).
    const parsed = parseStoredCueSheet(JSON.parse(String(await entry.read({ format: api.formats.utf8 }))));
    const checksum = cueSheetChecksum(parsed);
    // 저장분도 검산을 다시 통과해야 쓴다 — 파일이 손상됐거나 옛 형식일 수 있다.
    if (!checksum.ok) {
      activity.add("warning", `큐시트 ${date} 저장분 검산 불일치(${cueChecksumDetail(checksum)}) — 큐시트 없이 진행합니다.`);
      return;
    }
    loadedCueSheet = parsed;
    activity.add("info", `큐시트 ${date} 저장분을 불러왔습니다 — 본 꼭지 ${cueSheetItemStarts(parsed).length}개.`);
  } catch (error) {
    // 저장분 없음은 정상이다(큐시트를 안 올린 회차). 그래도 사유는 남긴다.
    activity.add("info", `큐시트 ${date} 저장분 없음 또는 읽기 실패(${errorMessage(error)}) — 큐시트 없이 진행합니다.`);
  }
}

/**
 * 큐시트로 놓친 경계를 회수한다. 큐시트가 없으면 **입력을 그대로 돌려주므로 동작이 불변**이다.
 * 예측은 이웃 간격만 쓴다 — 큐시트 절대 시각은 8회차 실측에서 평균 19.5초·최대 122초 어긋났고
 * 전역 드리프트 보정도 통하지 않았다. 간격 기반 정렬 + 국소 보간은 같은 표본에서 평균 5.4초,
 * 각자의 창 안 적중 128/129였다. 회수 후보가 창 안에 없으면 아무것도 하지 않는다.
 */
function applyCueSheetRecovery(
  accepted: readonly number[],
  candidates: ReadonlyArray<{ time: number; refDist: number }>,
): number[] {
  if (!loadedCueSheet || accepted.length === 0) return [...accepted];
  const items = cueSheetItemStarts(loadedCueSheet);
  // **회수 상한은 채택 상한과 같으면 안 된다(§7-ax).** 모닝와이드 채택은 합집합이 거리
  // 0.08 미만 후보를 전부 삼키므로, 회수 상한을 0.08로 두면 고를 수 있는 후보가 이미
  // 채택된 것뿐이라 8초 중복 규칙에 다시 걸려 **원리적으로 0건**이다(실측: 7회차 회수 0).
  // 실제 결손 4건은 전부 ±8초 안에 후보가 있었고 거리는 0.092~0.148로 상한 바로 위였다.
  // 값은 두 프로그램 공통으로 기존 상수를 쓴다 — 홀드아웃을 보고 새로 고른 수가 아니어야
  // 그 6회차가 검증 자산으로 남는다. 국소 창(±20초)은 회차 전체의 1/30이라 전역보다 관대해도
  // 되고, 회수분은 어차피 아래 비전 검증을 그대로 통과한다(§92 오배제 0 경로).
  const { merged, pairs, gaps, picks } = recoverFromCueSheet(items, accepted, candidates, VISUAL_LONG_SHOT_MAX_DIST);
  // 회수 경로는 무엇을 골랐는지(그리고 왜 못 골랐는지) 반드시 남긴다 — 로그 없이 배선했다가
  // 세 번 틀린 이력이 있다(feedback_rescue_path_validation). **아무것도 회수하지 못한
  // 실행도 로그를 남긴다**(§7-aw) — 침묵하면 "배선 안 됨"과 구별할 수 없다.
  const picked = picks.map(({ gap, recovery }) => (recovery
    ? `${gap.predicted.toFixed(1)}±${gap.window}→${recovery.time.toFixed(1)}(d ${recovery.refDist.toFixed(3)})`
    : `${gap.predicted.toFixed(1)}±${gap.window}✗(${gap.title.slice(0, 12)})`));
  activity.add(
    "info",
    `큐시트 회수 — 큐 꼭지 ${items.length} · 확정 ${accepted.length} · 정렬 ${pairs.length} · 빈자리 ${gaps.length} · 회수 ${merged.length - accepted.length}${picked.length > 0 ? `: ${picked.join(" ")}` : ""}`,
  );
  return merged;
}

// 촬영한 큐시트 사진을 읽어 표로 옮기고 검산한 뒤 데이터 폴더에 회차별로 저장한다.
// AI 응답은 신뢰하지 않는다 — 검증·행 분류·검산은 전부 src/cue-sheet.ts가 다시 한다(신뢰 경계).
async function handleNewsCutCueSheet(): Promise<void> {
  ensureAiConsent("큐시트 읽기");
  if (!(await hasStoredOpenAIApiKey())) throw new Error("AI 설정 탭에서 OpenAI API 키를 먼저 저장해 주세요.");
  const api = frameDataFolderApi();
  if (!api) throw new Error("이 환경에서는 파일 저장소를 사용할 수 없습니다.");
  const picked = await api.fileSystem.getFileForOpening({ types: ["png", "jpg", "jpeg"], allowMultiple: false });
  const file = Array.isArray(picked) ? picked[0] : picked;
  if (!file) return;
  const data = await file.read({ format: api.formats.binary });
  const bytes = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : ArrayBuffer.isView(data)
      ? new Uint8Array((data as ArrayBufferView).buffer, (data as ArrayBufferView).byteOffset, (data as ArrayBufferView).byteLength)
      : null;
  if (!bytes || bytes.byteLength === 0) throw new Error("큐시트 이미지를 읽지 못했습니다.");
  // 휴대폰 사진은 수 MB라 요청 캡을 넘긴다 — 축소는 UXP에서 불가하므로 촬영 단계에서 줄이도록 안내한다.
  if (bytes.byteLength > 1_400_000) {
    throw new Error(`큐시트 사진이 큽니다(${Math.round(bytes.byteLength / 1024)}KB). 1.4MB 이하로 줄여서 다시 올려 주세요.`);
  }
  const mimeType = /\.jpe?g$/i.test(String(file.name)) ? "image/jpeg" : "image/png";
  activity.add("info", `큐시트 읽기 시작 — ${String(file.name)} (${Math.round(bytes.byteLength / 1024)}KB, 유료)`);
  const client = new OpenAITextClient({ endpoint: settings.aiEndpoint });
  const sheet = parseCueSheetResponse(await client.readCueSheet({ bytes, mimeType }));
  const checksum = cueSheetChecksum(sheet);
  const starts = cueSheetItemStarts(sheet);
  if (sheet.rows.length === 0) throw new Error("큐시트에서 읽어낸 행이 없습니다. 표 전체가 보이도록 다시 촬영해 주세요.");

  const label = sheet.broadcastDate || "날짜미상";
  // **프로그램은 사진 머리글에서 가린다.** 업로드 버튼은 어느 프로그램 작업 중인지 모르고,
  // 같은 날 8뉴스와 모닝와이드가 다 방송되므로 날짜만으로 저장하면 서로를 덮어쓴다.
  // 못 가리면 저장하지 않는다 — 잘못 가려 다른 프로그램에 물리는 것이 더 나쁘다(실사고).
  const detected = detectCueSheetProgram(sheet.programTitle);
  // **검산이 맞을 때만 파일을 쓴다.** 종전에는 저장이 채택 게이트보다 앞이라, 같은 회차를
  // 흐리게 재촬영하면 채택은 안 되면서 **이미 있던 정상 저장분을 덮어써 잃었다**(감사 실측).
  let saved = "";
  if (checksum.ok && detected !== "") {
    const dataFolder = await api.fileSystem.getDataFolder();
    saved = cueSheetFileName(label, detected);
    const entry = await dataFolder.createFile(saved, { overwrite: true });
    // 직렬화는 src/cue-sheet.ts가 한다 — 읽기와 **같은 모듈에서 짝을 이뤄야** 왕복 테스트가
    // 제품의 양쪽 끝을 다 잡는다(§7-ay가 정확히 그 틈에서 났다).
    await entry.write(serializeCueSheet(sheet), { format: api.formats.utf8 });
  }

  // 검산이 맞을 때만 분할에 물린다 — 판독이 틀린 큐시트로 회수하면 없는 경계를 만든다.
  loadedCueSheet = checksum.ok ? sheet : null;
  renderNewsCutCueSheet(sheet, checksum, starts, saved || (checksum.ok ? "저장 안 함(프로그램 미확인)" : "저장 안 함(검산 불일치)"));
  activity.add(
    checksum.ok ? "info" : "warning",
    `큐시트 ${label} — 행 ${sheet.rows.length}/${sheet.rowsSeen} · 본 꼭지 ${starts.length} · 검산 ${checksum.ok ? "일치" : `불일치(${cueChecksumDetail(checksum)}) — 저장하지 않았습니다(기존 저장분 보존)`}`,
  );
  // 응답 행이 조용히 사라지면 검산이 못 잡는다(꼬리가 잘려도 합은 보존된다) — 수치로 남긴다.
  if (sheet.rowsSeen > sheet.rows.length) {
    activity.add("warning", `큐시트 판독 행 손실 ${sheet.rowsSeen - sheet.rows.length}건 — 형식 불량이거나 상한(${CUE_SHEET_MAX_ROWS}행) 절단입니다. 표가 잘리지 않았는지 확인해 주세요.`);
  }
  // 날짜를 못 읽으면 파일명이 회차와 묶이지 않아 **다음 실행에서 자동 인식되지 않는다.**
  // 조용히 넘어가면 유료로 읽은 큐시트가 사라진 것처럼 보인다(조회 키는 시퀀스 이름의 날짜다).
  if (checksum.ok && detected === "") {
    activity.add("warning", `큐시트 프로그램을 머리글에서 가리지 못했습니다(${sheet.programTitle || "머리글 미판독"}) — 어느 프로그램 저장분인지 정할 수 없어 저장하지 않았습니다. 표 상단의 프로그램명이 보이게 다시 촬영해 주세요. 이번 세션에는 그대로 적용됩니다.`);
  }
  if (checksum.ok && sheet.broadcastDate === "") {
    activity.add("warning", "큐시트 방송일자를 읽지 못했습니다 — 이번 세션에만 적용되고 다음 실행에서 자동 인식되지 않습니다. 날짜가 보이게 다시 촬영하면 회차별로 저장됩니다.");
  }
  toast(checksum.ok ? `큐시트를 읽었습니다 — 본 꼭지 ${starts.length}개` : "큐시트를 읽었지만 검산이 맞지 않습니다. 판독 결과를 확인해 주세요.", checksum.ok ? "success" : "info");
}

// 큐시트 판독 결과 렌더 — 문구는 전부 textContent(§25-b clearChildren).
function renderNewsCutCueSheet(
  sheet: CueSheet,
  checksum: CueSheetChecksum,
  starts: Array<{ order: number; start: number; title: string }>,
  savedAs: string,
): void {
  const container = optionalElement<HTMLElement>("news-cut-cuesheet-result");
  if (!container) return;
  clearChildren(container);
  container.hidden = false;
  const summary = document.createElement("div");
  summary.className = "learn-corpus-row";
  summary.textContent = `${sheet.broadcastDate || "날짜미상"} · 행 ${sheet.rows.length} · 본 꼭지 ${starts.length} · 검산 ${checksum.ok ? "일치" : `불일치(${cueChecksumDetail(checksum)})`} · 저장 ${savedAs}`;
  container.appendChild(summary);
  for (const item of starts) {
    const row = document.createElement("div");
    row.className = "learn-corpus-row";
    row.textContent = `${item.order}. ${formatDuration(item.start)} — ${item.title}`;
    container.appendChild(row);
  }
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
    row.className = "learn-corpus-row news-item-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.newsIndex = String(index);
    const thumb = document.createElement("img");
    thumb.className = "news-item-thumb";
    thumb.alt = `아이템 ${index + 1} 시작 프레임`;
    thumb.title = "클릭하면 크게 보기";
    thumb.dataset.newsThumb = String(index);
    thumb.hidden = true;
    thumb.addEventListener("click", (event) => {
      // label 안의 이미지라 기본 동작이 체크박스 토글 — 큰 미리보기로 대체한다.
      event.preventDefault();
      event.stopPropagation();
      void openNewsThumbLightbox(index);
    });
    const label = document.createElement("span");
    label.textContent = describeNewsItem(item, index);
    row.append(checkbox, thumb, label);
    container.append(row);
  });
  void loadNewsCutThumbnails();
}

// 썸네일 클릭 시 큰 미리보기 — 소형(192px) 이미지를 즉시 띄우고 640px 프레임으로 교체한다.
async function openNewsThumbLightbox(index: number): Promise<void> {
  const item = newsCutItems[index];
  const overlay = optionalElement<HTMLElement>("news-thumb-lightbox");
  const image = optionalElement<HTMLImageElement>("news-thumb-lightbox-img");
  if (!item || !overlay || !image) return;
  const small = document.querySelector<HTMLImageElement>(`img[data-news-thumb="${index}"]`);
  image.src = small?.src ?? "";
  setText("news-thumb-lightbox-caption", `${describeNewsItem(item, index)} — 클릭하면 닫힙니다`);
  overlay.hidden = false;
  const api = frameDataFolderApi();
  if (!api || !newsCutSourceName) return;
  try {
    const dataFolder = await api.fileSystem.getDataFolder();
    const { filename } = await exportSequenceFrameByName(
      newsCutSourceName,
      item.start + 0.5,
      String(dataFolder.nativePath),
      640,
    );
    const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
    if (!overlay.hidden && bytes && bytes.byteLength > 0) {
      image.src = `data:image/png;base64,${bytesToBase64(bytes)}`;
    }
  } catch {
    // 고해상 교체 실패 시 소형 썸네일을 그대로 보여준다
  }
}

// 아이템 시작 프레임 미리보기 — 내보내기 전에 잘못 쪼개진 아이템을 목록에서 바로 검수한다.
// 원본 시퀀스 이름으로 내보내므로 생성/내보내기 중 활성 시퀀스가 바뀌어도 프레임이 어긋나지 않는다.
async function loadNewsCutThumbnails(): Promise<void> {
  const api = frameDataFolderApi();
  if (!api || !newsCutSourceName || newsCutItems.length === 0) return;
  newsCutThumbToken += 1;
  const token = newsCutThumbToken;
  const dataFolder = await api.fileSystem.getDataFolder();
  for (const [index, item] of newsCutItems.entries()) {
    if (token !== newsCutThumbToken) return;
    const image = document.querySelector<HTMLImageElement>(`img[data-news-thumb="${index}"]`);
    if (!image) continue;
    try {
      const { filename } = await exportSequenceFrameByName(
        newsCutSourceName,
        item.start + 0.5,
        String(dataFolder.nativePath),
        192,
      );
      const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
      if (token !== newsCutThumbToken || !bytes || bytes.byteLength === 0) continue;
      image.src = `data:image/png;base64,${bytesToBase64(bytes)}`;
      image.hidden = false;
    } catch {
      // 미리보기는 보조 기능 — 실패한 아이템은 자리만 유지하고 넘어간다
    }
  }
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
  newsCutSourceName = await readSequenceStatus().then((status) => String(status.sequenceName ?? "")).catch(() => "");
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
  newsCutCreatedGuids = [];
  renderNewsCutList();
  if (newsCutItems.length === 0) {
    activity.add("warning", "뉴스 분할: 아이템 0개 — 자막이 뉴스 형식이 아닐 수 있습니다.");
    toast("보도 아이템을 찾지 못했습니다.", "warning");
    return;
  }
  activity.add("success", `뉴스 분할 분석 · 아이템 ${newsCutItems.length}개`);
  toast(`보도 아이템 ${newsCutItems.length}개를 찾았습니다. 목록에서 확인 후 생성하세요.`, "success");
}

/**
 * 이번 배치 아이템에 붙일 큐시트 기사제목(§CUE-4). 큐시트가 없거나 회차가 다르면 전부 빈
 * 문자열이고, 그때는 종전 `YYYYMMDD_news_NN` 이름 그대로다.
 *
 * **회차 대조를 여기서 한 번 더 한다.** 큐시트는 1단계(분석)에서 실렸고 2단계(생성)는 따로
 * 눌리므로 그 사이에 다른 회차를 열 수 있다 — `resolveCueSheetForSource`의 대조는 그 시점의
 * 것이라 여기까지 보증하지 않는다. 회수와 달리 이름은 편집자가 눈으로 믿는 정보라, 한 칸
 * 밀린 제목이 조용히 남으면 오검출보다 발견이 늦다.
 *
 * 어느 경로로 갔든 로그를 남긴다 — 침묵하는 가드는 없느니만 못하다(§7-aw).
 */
function newsCutItemTitles(starts: readonly number[]): string[] {
  const blank = starts.map(() => "");
  if (!loadedCueSheet) return blank;
  const match = /(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/u.exec(newsCutSourceName);
  const date = match ? `${match[1]}-${match[2]}-${match[3]}` : "";
  if (date === "" || loadedCueSheet.broadcastDate !== date) {
    activity.add(
      "info",
      `아이템 이름: 큐시트(${loadedCueSheet.broadcastDate || "날짜미상"})가 이 회차(${date || "날짜미상"})와 달라 제목을 붙이지 않습니다.`,
    );
    return blank;
  }
  const titles = titleItemsFromCueSheet(starts, cueSheetItemStarts(loadedCueSheet));
  const filled = titles.filter((title) => sanitizeNewsItemTitle(title) !== "").length;
  activity.add(
    "info",
    `아이템 이름: 큐시트 제목 ${filled}/${starts.length}개를 붙입니다 — 참고용이라 경계는 바꾸지 않습니다.`,
  );
  return titles;
}

// 2단계 — 선택 아이템을 원본 복제·트림으로 개별 시퀀스화(YYYYMMDD_news_NN[_제목]).
async function handleNewsCutCreate(): Promise<void> {
  const selected = selectedNewsItems();
  if (selected.length === 0) {
    toast("생성할 아이템을 하나 이상 선택해 주세요.", "warning");
    return;
  }
  await ensureNewsCutSourceActive();
  // 시작 시 이전 배치 목록을 비운다(§184 감사 #13) — 생성 도중 예외가 나면 UI가 이전 배치
  // 이름을 유지해 '일괄 내보내기'가 직전 배치를 내보냈다.
  newsCutCreatedNames = [];
  newsCutCreatedGuids = [];
  const today = new Date();
  // 조회 실패를 무음으로 삼키면 번호가 01부터 다시 시작해 규약이 어긋난다(§183) — 고지하고 진행.
  const existingNames = await listSequenceNames().catch(() => {
    activity.add("warning", "기존 시퀀스 목록을 읽지 못해 아이템 번호를 01부터 다시 셉니다 — 중복 이름에는 자동 접미가 붙습니다.");
    return [] as string[];
  });
  const startIndex = nextNewsItemIndex(existingNames, today);
  // 제목 정렬은 **전체 아이템**으로 돌린 뒤 선택 인덱스로 집는다 — 선택 부분집합의 start만
  // 정렬에 넘기면 비연속 선택에서 큐 간격이 어긋나 헤드라인이 한 칸 밀린다(2420줄 우려의 실제
  // 재현). 전량 선택이면 결과는 동일(무변).
  const allTitles = newsCutItemTitles(newsCutItems.map((item) => item.start));
  const titles = selected.map(({ index }) => allTitles[index] ?? "");
  const inputs = selected.map(({ item }, order) => ({
    start: item.start,
    end: item.end,
    name: newsItemName(today, startIndex + order, titles[order] ?? ""),
  }));
  const result = await busy.during(`아이템 시퀀스 ${inputs.length}개를 만들고 있습니다…`, () =>
    createNewsItemSequences(inputs, (completed, total, name) => {
      setText("busy-message", `${completed}/${total} · ${name}`);
      busy.progress((completed / Math.max(1, total)) * 100);
    }));
  newsCutCreatedNames = result.created;
  newsCutCreatedGuids = result.createdGuids;
  activity.add(
    result.failures.length ? "warning" : "success",
    `뉴스 분할 시퀀스 생성 · 성공 ${result.created.length} · 실패 ${result.failures.length}`,
  );
  result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
  // 실패 개수를 토스트에도 싣는다(§184 감사 #15 — §183 감사 #5와 동일 결함의 생성 단계판).
  toast(
    result.failures.length
      ? `시퀀스 생성 — 성공 ${result.created.length}개 · 실패 ${result.failures.length}개. 활동 로그를 확인하세요.`
      : `${result.created.length}개 아이템 시퀀스를 만들었습니다.`,
    result.failures.length ? "warning" : "success",
  );
  await refreshStatus(true);
}

// 기본 렌더 프리셋(내부 베타) — 화질 선택/내보내기 탭 프리셋이 없을 때의 폴백. 존재 여부는
// resolveNewsCutExportTargets에서 검증한다(다른 Premiere 버전/설치 경로 PC 대비, 2026-08-12).
// 내보내기 폴더는 더 이상 기본값이 없다 — 사용자가 반드시 지정한다(하드코딩 계정 경로 제거,
// 다른 PC에서 존재하지 않아 엉뚱한 곳에 쓰거나 조용히 실패하던 문제 시정).
const DEFAULT_EXPORT_PRESET_PATH =
  "C:\\Program Files\\Adobe\\Adobe Premiere Pro 2026\\MediaIO\\systempresets\\4E49434B_48323634\\YouTube 1080p HD.epr";

/**
 * 회수·되짚기가 새 경계를 **추가**하는 최소 신뢰도(§137).
 *
 * 회수는 검증과 방향이 반대다 — 검증은 배제(오배제가 위험)라 0.85로 느슨하지만, 회수는 추가라
 * 오검출이 곧 과분할이다. 전 실행 로그의 앵커 판정을 라벨과 대조한 실측(2026-07-29)에서
 * 0.95 미만은 2건뿐이었고 **둘 다 FP**였다(1/28 428 인터뷰이 0.91, 3/04 602 회견 발언자 0.92).
 * 참 회수는 0.95 이상에만 있었으므로, 0.9→0.95는 잃는 것 없이 FP만 줄인다.
 */
const RESCUE_ANCHOR_MIN_CONFIDENCE = 0.95;

// 칼럼 시작 회수(§170)가 한 시각에서 볼 프레임 오프셋 — 본 검증과 같은 3점이다(§191).
// 시각당 1장(+1.2)만 보던 종전 방식은 그 한 장이 타이트한 크롭일 때 착석 여부를 못 보고
// 대담 게스트를 되살렸다. 같은 샷의 +4·+7은 데스크·마이크·다른 출연자를 드러낸다.
const STANDING_PROBE_OFFSETS = [1.2, 4, 7] as const;

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
// HEVC는 Premiere 직접 렌더가 지원하지 않아(실기 실측: "Unsupported video codec: HEVC")
// AME 미설치 환경에서는 선택 시점에 명확히 막는다.
function selectedNewsCutPresetPath(): string | null {
  const select = optionalElement<HTMLSelectElement>("news-cut-preset-select");
  const choice = select?.value ?? "auto";
  const path = NEWS_CUT_PRESET_CHOICES[choice] ?? null;
  if (path && choice.startsWith("hevc-") && !ameInstalled()) {
    throw new Error("H.265(HEVC)는 Adobe Media Encoder 설치 시에만 내보낼 수 있습니다 — H.264 화질을 선택하거나 AME를 설치해 주세요.");
  }
  return path;
}

// 선택 프리셋 .epr 파일 존재 사전 확인 — 다른 Premiere 버전/설치 경로에서 렌더 단계의
// 불친절한 실패 대신 원인을 바로 알려준다.
async function assertPresetFileExists(presetPath: string): Promise<void> {
  try {
    const lfs = (require("uxp") as any)?.storage?.localFileSystem;
    const entry = await lfs?.getEntryWithUrl?.(`file:${presetPath.replace(/\\/gu, "/")}`);
    if (entry) return;
  } catch {
    // 조회 실패는 아래 공통 에러로 안내
  }
  throw new Error(`선택한 화질 프리셋 파일을 찾을 수 없습니다: ${presetPath} — Premiere 설치 경로가 다르면 '내보내기 탭 설정'을 사용해 주세요.`);
}

// 내보내기 대상 해석 — 프리셋·폴더를 각각 독립적으로 결정한다(선택된 토큰 우선, 없으면 기본값).
// 기본 폴더는 getEntryWithUrl로 실제 엔트리 취득을 시도해(성공 시 크기 안정화 폴링 가능) 실패하면
// 경로 셸만 넘긴다 — 이때 완료 판정은 렌더 promise 해소가 맡는다(§40 경합 유지).
async function resolveNewsCutExportTargets(): Promise<{ presetFile: any; outputFolder: any }> {
  syncSettingsFromUI();
  // 뉴스 분할 탭 화질 선택이 있으면 최우선 — 없으면(auto) 내보내기 탭 프리셋 → 기본값 순.
  const chosenPresetPath = selectedNewsCutPresetPath();
  if (chosenPresetPath) await assertPresetFileExists(chosenPresetPath);
  let presetFile: any;
  if (chosenPresetPath) {
    presetFile = { nativePath: chosenPresetPath };
  } else if (settings.presetToken) {
    presetFile = await requireStoredEntry(settings.presetToken, "내보내기 프리셋");
  } else {
    // 기본 프리셋(Premiere 2026 시스템 경로)도 존재를 검증한다 — 다른 버전/설치 경로 PC에서
    // 렌더 단계의 불친절한 실패 대신 원인을 바로 알린다(2026-08-12: 폴더와 함께 "검증 안 되면 막기").
    await assertPresetFileExists(DEFAULT_EXPORT_PRESET_PATH);
    presetFile = { nativePath: DEFAULT_EXPORT_PRESET_PATH };
  }
  // 내보내기 폴더는 반드시 사용자가 지정해야 한다(2026-08-12) — 하드코딩 계정 폴더 폴백을 제거해
  // 다른 PC에서 엉뚱한 곳에 쓰거나 조용히 실패하던 문제를 막는다. 미지정이면 렌더를 막고 안내한다.
  if (!settings.outputFolderToken) {
    throw new Error("내보내기 폴더를 먼저 지정해 주세요 — 뉴스 분할 탭 또는 '내보내기' 탭의 '폴더 선택'으로 저장 위치를 정하면 그 자리에 렌더됩니다(PC마다 한 번만 지정하면 유지됩니다).");
  }
  const outputFolder = await requireStoredEntry(settings.outputFolderToken, "출력 폴더");
  return { presetFile, outputFolder };
}

// 뉴스 분할 탭의 내보내기 폴더 표시 — 선택된 폴더가 없으면 기본 폴더를 안내한다.
function renderNewsCutFolderLabel(): void {
  const label = settings.outputFolderName || "미지정 — '폴더 선택'으로 저장 위치를 정하세요";
  setText("news-cut-folder-name", label, settings.outputFolderName ? "" : "내보내기 폴더를 지정해야 렌더됩니다");
}

// 3단계 — 생성된 아이템 시퀀스를 내보내기 탭 프리셋·폴더(없으면 기본값)로 일괄 내보낸다.
// AME가 설치돼 있으면 대기열 추가, 없으면 Premiere 직접 렌더로 폴백한다.
async function handleNewsCutExport(): Promise<void> {
  if (newsCutCreatedNames.length === 0) throw new Error("먼저 '아이템 시퀀스 생성'을 실행해 주세요.");
  const targets = await resolveNewsCutExportTargets();
  await exportNewsSequencesWith(targets.presetFile, targets.outputFolder);
}

async function exportNewsSequencesWith(presetFile: any, outputFolder: any): Promise<void> {
  // 출력 폴더 기록 가능 사전 점검 — 분리된 드라이브·권한 문제를 렌더 N개 실패 전에 잡는다
  // (UXP엔 여유 공간 조회 API가 없어 용량까지는 확인 불가 — 쓰기 가능 여부만 검사).
  if (typeof outputFolder?.createFile === "function") {
    // 프로브 파일은 finally에서 지운다(§183 감사 #3) — write 실패 시 .tmp가 출력 폴더에
    // 잔존했고, delete만 실패한 경우를 "쓰기 불가"로 오진했다(쓰기는 이미 성공했는데).
    let probe: any = null;
    try {
      probe = await outputFolder.createFile(`.sf_write_probe_${Date.now()}.tmp`, { overwrite: true });
      await probe.write("ok");
    } catch {
      throw new Error("출력 폴더에 쓸 수 없습니다 — 폴더가 존재하고 쓰기 가능한지(드라이브 연결·권한) 확인해 주세요.");
    } finally {
      try { await probe?.delete(); } catch { /* 프로브 정리 실패는 결과에 영향 없음 */ }
    }
  }
  if (!ameInstalled()) {
    activity.add("info", "AME 미설치 — Premiere 직접 렌더로 내보냅니다.");
    const result = await busy.during(`${newsCutCreatedNames.length}개 렌더 중…`, () =>
      renderSequenceExportsByName(newsCutCreatedNames, presetFile, outputFolder, newsCutCreatedGuids, (completed, total, name) => {
        setText("busy-message", `${completed + 1}/${total} · ${name} 렌더 중…`);
        busy.progress((completed / Math.max(1, total)) * 100);
      }));
    activity.add(
      result.failures.length ? "warning" : "success",
      `뉴스 분할 직접 렌더 · 성공 ${result.queued.length} · 실패 ${result.failures.length}`,
    );
    // GUID 미일치 이름 폴백(§184 #14) — AME 경로와 대칭. 동명 stale 시퀀스 오해석을 고지한다.
    if (result.usedNameFallback.length > 0) {
      activity.add("warning", `GUID가 일치하지 않아 이름으로 해석한 시퀀스 ${result.usedNameFallback.length}개 — 프로젝트를 전환했거나 시퀀스를 다시 만들었다면 산출물을 확인하세요: ${result.usedNameFallback.join(", ")}`);
    }
    result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
    // 실패 개수를 토스트에도 싣는다(§183 감사 #5) — 활동 로그를 안 여는 사용자가 전량
    // 실패를 "0개를 내보냈습니다"라는 완료 문구로 읽었다.
    toast(
      result.failures.length
        ? `내보내기 완료 — 성공 ${result.queued.length}개 · 실패 ${result.failures.length}개. 활동 로그를 확인하세요.`
        : `${result.queued.length}개를 내보냈습니다. 출력 폴더를 확인하세요.`,
      result.failures.length ? "warning" : "success",
      6000,
    );
    return;
  }
  const result = await busy.during(`AME 대기열에 ${newsCutCreatedNames.length}개 추가 중…`, () =>
    queueSequenceExportsByName(newsCutCreatedNames, presetFile, outputFolder, newsCutCreatedGuids));
  activity.add(
    result.failures.length ? "warning" : "success",
    `뉴스 분할 대기열 추가 · 성공 ${result.queued.length} · 실패 ${result.failures.length}`,
  );
  // GUID 미일치 이름 폴백(§184 #14) — 프로젝트 전환·재생성 뒤라면 동명의 다른 시퀀스일 수 있다.
  if (result.usedNameFallback.length > 0) {
    activity.add("warning", `GUID가 일치하지 않아 이름으로 해석한 시퀀스 ${result.usedNameFallback.length}개 — 프로젝트를 전환했거나 시퀀스를 다시 만들었다면 산출물을 확인하세요: ${result.usedNameFallback.join(", ")}`);
  }
  result.failures.forEach((failure) => activity.add("error", `${failure.name}: ${failure.error}`));
  toast(
    result.failures.length
      ? `대기열 추가 — 성공 ${result.queued.length}개 · 실패 ${result.failures.length}개. 활동 로그를 확인하세요.`
      : `${result.queued.length}개를 Media Encoder 대기열에 추가했습니다. AME에서 렌더를 시작하세요.`,
    result.failures.length ? "warning" : "success",
    6000,
  );
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
  // 개수 계산은 삭제와 같은 패턴 상수를 쓴다(§184 감사 #1·#2) — 다른 정규식을 쓰던 시절
  // " 2" 고아만 남으면 개수 0으로 조기 반환됐고, 확인 라벨의 개수도 실제 삭제 대상과 달랐다.
  // 조회 실패를 "정리 대상 없음"으로 위장하지 않는다(§183) — 파괴적 동작의 전제가 불확실하면 중단.
  let cleanupNames: string[];
  try {
    cleanupNames = await listSequenceNames();
  } catch {
    toast("시퀀스 목록을 읽지 못해 정리를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.", "warning");
    return;
  }
  const targets = cleanupNames.filter((name) => NEWS_ITEM_SEQUENCE_PATTERN.test(name));
  const count = targets.length;
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
    // 대상 **이름**을 활동 로그에 남긴다(§CUE-4 후속). 제목이 붙으면서(20260811_news_03_제목)
    // 삭제 이름 공간이 사용자가 채택할 수 있는 이름과 겹친다 — 편집 보관본을 `_확정`으로
    // 표시하면 여전히 이 패턴에 걸린다. 개수만 보여 주면 그 보관본이 섞였는지 확인할 수
    // 없으므로, 2차 클릭(확정) 전에 목록을 눈으로 검토할 수 있게 남긴다.
    const preview = targets.slice(0, 12).join(" · ");
    activity.add(
      "warning",
      `정리 대상 ${count}개 — 4초 안에 다시 누르면 삭제합니다. 보관할 편집본이 이 목록에 섞였는지 확인하세요: ${preview}${count > 12 ? ` 외 ${count - 12}개` : ""}`,
    );
    newsCutCleanupArmTimer = setTimeout(disarmNewsCutCleanup, 4000);
    return;
  }
  disarmNewsCutCleanup();
  const result = await busy.during(`아이템 시퀀스 ${count}개를 정리하고 있습니다…`, () => deleteNewsItemSequences());
  newsCutCreatedNames = [];
  newsCutCreatedGuids = [];
  renderNewsCutList();
  activity.add(
    result.failures ? "warning" : "success",
    `뉴스 분할 아이템 정리 · 삭제 ${result.deleted} · 실패 ${result.failures}${result.failureNames.length ? ` (실패: ${result.failureNames.slice(0, 8).join(" ")})` : ""}`,
  );
  toast(`아이템 시퀀스 ${result.deleted}개를 정리했습니다.`, result.failures ? "warning" : "success");
  await refreshStatus(true);
}

// 원클릭 분할 — STT·자막 없이 화면(앵커 샷) 분석만으로 분할하고, 내보내기 설정이 없으면
// 기본 프리셋·폴더로 렌더까지 한 번에 끝낸다(설계: newscut-visual-oneclick.design.md).
// exportAfter=false 면 시퀀스 생성까지만 하고 내보내기는 생략한다(검토 후 '일괄 내보내기' 사용).
/**
 * 비전 배치 한 번을 AI 큐를 거쳐 실행한다(§106) — 일일 요청·비용 한도와 "오늘 사용" 집계에
 * 비전 호출이 잡히게 하는 것이 목적이다(그 전에는 이 경로만 큐 밖이었다 — 릴리스 리뷰 H-1).
 *
 * `confirmRequired`는 넘기지 않는다. 승인 대기는 큐가 잡을 붙든 채 사용자의 승인 클릭을 기다리는데,
 * 분할은 이미 시작돼 스캔·프레임 내보내기를 마친 상태라 여기서 멈추면 사용자에겐 멎은 것처럼 보인다.
 * 이 경로의 사전 동의는 ①AI 전송 동의 게이트(§99) ②"(유료)" 라벨과 가시 비용 고지 ③실행 직전
 * 활동 로그의 전송량 안내가 담당한다. 배치 단위 승인은 별도 설계 과제로 남긴다(런북 §106).
 *
 * 큐가 없으면(초기화 실패) 그대로 실행한다 — 비용 보호는 못 하지만 분할을 막지는 않는다.
 */
/**
 * 침묵 실패 유형화(§111-c) — catch가 실패 원인을 삼키면 "판정 유실"이 만능 라벨이 되어
 * 한도 위장(§110-b)류 디버깅 폭탄이 된다. 유실 경고에 원인 내역을 붙이기 위한 분류.
 */
function aiFailureKind(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("한도")) return "한도";
  // 크레딧 소진(§191-e 실사고) — OpenAI가 "You have no credits remaining"을 반환하는데
  // "기타"로 뭉개져 즉시 중단 경로를 타지 못했다. 잔여 배치를 크레딧 없이 계속 시도하며
  // 실행당 수십 초를 낭비하고, 유실 원인도 안 보였다.
  if (isCreditExhausted(message)) return "크레딧 소진";
  if (/429|rate ?limit|과부하|overload/iu.test(message)) return "레이트리밋";
  if (/timeout|abort|시간|취소/iu.test(message)) return "타임아웃";
  if (/키|key|401|403/iu.test(message)) return "인증";
  return "기타";
}

// 크레딧 소진 패턴(§191-e) — 일일 한도("한도")와 별개로 OpenAI 계정 잔액이 0인 상태.
// 한도와 똑같이 "남은 배치를 즉시 접어야 하는" 종결 조건이다.
function isCreditExhausted(message: string): boolean {
  return /no credits remaining|insufficient_quota|exceeded your current quota/iu.test(message);
}

function formatLossCauses(causes: ReadonlyMap<string, number>): string {
  if (causes.size === 0) return "";
  return `(${[...causes.entries()].map(([kind, count]) => `${kind} ${count}`).join("·")})`;
}

async function runVisionBatch<T>(label: string, frameCount: number, task: () => Promise<T>): Promise<T> {
  if (!aiQueueController) return task();
  // 요청 수는 배치 하나당 1로 잡히고(큐 규약), 비용 단위는 프레임 수에 비례시킨다.
  // 큐 자체 재시도는 끈다 — 이 경로는 유실 재판정·배치 격리로 자체 복원한다(§92).
  return aiQueueController.run(
    "image",
    { source: "news-cut-vision", label, frameCount },
    task,
    { estimateUnits: frameCount, cacheTtlMs: 0, maxRetries: 0 },
  );
}

// 분할 대상 프로그램 — 프로필(뱅크·모델·프롬프트 단서·띠/사인오프 규칙)만 갈아 끼우고 엔진은 공유한다.
// 8뉴스 경로는 기본값이라 기존 호출·동작이 그대로다(morning-wide-split.plan.md §3).
type NewsCutProgram = "news8" | "morningwide";

/**
 * 모닝와이드 확정 합집합 상한 — **문턱은 뱅크 구성에 종속되므로 뱅크를 바꾸면 함께 다시 잰다.**
 * 0.09는 3계열 뱅크·8회차 시절의 최적이었고(그 전 2계열에서는 0.08), 7계열·19회차로 늘어난
 * 지금 재스윕에서 최적이 0.08로 되돌아왔다(§7-ao). 0.06~0.08이 동일 결과라 미지 회차 여유가
 * 가장 큰 0.08을 고른다 — 0.09 대비 **TP·FN 불변에 FP만 감소**(학습 20→12 · 홀드아웃 19→15)라
 * 순수 정밀도 이득이고, 0.08~0.09 밴드가 새로 채택하던 8건은 전부 라벨이 없었다.
 * 0.10 이상은 재현율 이득보다 오검출 증가가 커진다(0.10: FP 41 · 0.13: FP 104).
 */
const MORNING_WIDE_UNION_MAX_REF_DIST = 0.08;

async function runNewsCutAutoFlow(exportAfter: boolean, program: NewsCutProgram = "news8"): Promise<void> {
  const api = frameDataFolderApi();
  if (!api) throw new Error("프레임 내보내기 API를 사용할 수 없습니다.");
  // 클릭 시점 전체 선검증(§183·§189 후속) — 화질 선택 유효성(HEVC×AME)에 더해 프리셋 파일
  // 실재·폴더 토큰 복원까지 확인해, 수십 분 스캔과 AI 비용을 쓴 뒤 내보내기 단계에서 처음
  // 실패하는 일을 막는다. 결과는 버리고 내보내기 직전에 재해석한다(장시간 스캔 동안 폴더가
  // 사라지는 스테일 방지 — 검사와 사용 시점을 분리).
  if (exportAfter) await resolveNewsCutExportTargets();
  const status = await readSequenceStatus();
  const duration = Number(status.sequenceEnd) || 0;
  if (!(duration > 60)) throw new Error("활성 시퀀스가 없거나 너무 짧습니다 — 1분 이상 뉴스 방송 시퀀스를 활성화해 주세요.");
  newsCutSourceKey = await readActiveContextKey().catch(() => "");
  newsCutSourceName = String(status.sequenceName ?? "");
  await resolveCueSheetForSource(newsCutSourceName, program);
  // 과부하 넛지(운영 감사) — 시퀀스가 수백 개 쌓인 프로젝트는 Premiere가 눈에 띄게 느려진다
  // (4,400시퀀스 멈춤 실측). 자동 조치는 하지 않고 새 프로젝트 권장만 고지한다(분할은 계속).
  try {
    const existingSequenceCount = (await listSequenceNames()).length;
    if (existingSequenceCount > 200) {
      activity.add("warning", `프로젝트에 시퀀스가 ${existingSequenceCount}개 있습니다 — Premiere가 느려질 수 있으니 새 프로젝트에서 진행하는 것을 권장합니다.`);
      toast(`시퀀스 ${existingSequenceCount}개 누적 — 새 프로젝트 사용을 권장합니다.`, "warning", 6000);
    }
  } catch { /* 조회 실패는 넛지 생략 — 분할 자체를 막지 않는다 */ }
  // 다단계 스텝바 — busy 오버레이에 현재 단계를 칩으로 표시한다(hide 시 자동 소거라 각 단계 진입마다 다시 세팅).
  const newsCutSteps = exportAfter
    ? ["프레임 점검", "화면 스캔", "앵커 검증", "경계 재스냅", "시퀀스 생성", "내보내기"]
    : ["프레임 점검", "화면 스캔", "앵커 검증", "경계 재스냅", "시퀀스 생성"];
  const setNewsCutStep = (index: number): void => busy.steps(newsCutSteps, index);
  const dataFolder = await api.fileSystem.getDataFolder();
  // 같은 시각 재요청(경계 재스냅)이 잦아 시각별 그리드를 메모한다.
  const gridCache = new Map<number, Float64Array | null>();
  // 하단 띠 벡터(§110) — 같은 BMP에서 함께 뽑아 추가 내보내기 없이 띠 이벤트를 계산한다.
  const bandCache = new Map<number, Float64Array | null>();
  // 격자 확보에 끝내 실패한 시각 — 재스냅이 이를 "정착과 상이"로 읽어 경계를 못 되돌리므로,
  // 개수가 아니라 시각을 남겨 사후에 어느 경계가 오염됐는지 알 수 있게 한다(§136).
  const gridFailureTimes: number[] = [];
  const grabGrid = async (time: number): Promise<Float64Array | null> => {
    const key = Math.round(time * 100);
    if (gridCache.has(key)) return gridCache.get(key)!;
    let grid: Float64Array | null = null;
    let band: Float64Array | null = null;
    // 프레임 추출은 간헐적으로 실패한다(§121·§122·§132와 같은 계열) — 한 번 더 시도한다.
    for (let attempt = 0; attempt < 2 && grid === null; attempt += 1) {
      try {
        const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 96, undefined, "bmp");
        const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
        const bmp = bytes ? parseBmp24(bytes) : null;
        grid = bmp ? lumaGrid(bmp) : null;
        band = bmp ? bandRow(bmp) : null;
      } catch {
        grid = null;
      }
    }
    // 실패는 캐시하지 않는다 — 한 번의 간헐 실패를 캐시하면 그 시각이 영구히 오염돼,
    // 뒤이은 재스냅·띠 검사가 모두 같은 거짓 실패를 다시 본다(1/28 588→579.5 유실).
    if (grid === null) {
      gridFailureTimes.push(time);
      return null;
    }
    gridCache.set(key, grid);
    bandCache.set(key, band);
    return grid;
  };

  // 0/4 프레임 불일치 사전 점검(§73-d 사고의 제품화) — 소스 해상도≠시퀀스 프레임이면 렌더가
  // 사방 검은 테두리로 나와 화면 분석이 왜곡된다. 전 구간 6점 프로브로 본 스캔 전에 차단한다.
  await busy.during("원클릭 분할 · 프레임 점검 중…", async () => {
    setNewsCutStep(0);
    const probes: Array<Float64Array | null> = [];
    for (const ratio of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]) {
      probes.push(await grabGrid(Math.round(duration * ratio)));
    }
    if (detectMismatchBorder(probes)) {
      throw new Error(
        "화면 가장자리가 전 구간 검게 감지됐습니다 — 소스 영상 해상도와 시퀀스 프레임 크기가 다르면 분할이 왜곡됩니다. "
        + "시퀀스 설정에서 프레임 크기를 소스 영상과 같게 맞추거나, 소스 클립으로 새 시퀀스를 만들어 다시 실행해 주세요.",
      );
    }
  });

  const items = await busy.during("원클릭 분할 · 화면 스캔 준비 중…", async () => {
    setNewsCutStep(1);
    // 1/4 코스 스캔(2s 그리드)
    const samples: GridSample[] = [];
    const total = Math.floor((duration - 1) / 2) + 1;
    let scanLogMilestone = 25;
    for (let time = 0; time <= duration - 1; time += 2) {
      throwIfNewsCutCancelled();
      samples.push({ time, grid: await grabGrid(time) });
      if (samples.length % 10 === 0) {
        const percent = Math.round((samples.length / Math.max(1, total)) * 100);
        setText("busy-message", `1/4 화면 스캔 ${samples.length}/${total} · ${percent}%`);
        busy.progress(percent);
        // 지속 로그에도 성긴 이정표를 남긴다(원격 진단) — 스캔이 수 분 걸려 로그가 통째로 비어
        // "멈춤"과 구별이 안 됐다(2026-08-19 사용자 사고). 25%마다 한 줄만.
        if (percent >= scanLogMilestone) {
          activity.add("info", `화면 스캔 진행 ${percent}% · ${samples.length}/${total} 프레임`);
          scanLogMilestone += 25;
        }
      }
    }
    // 하단 띠 이벤트(§110) — 스캔 BMP에서 함께 뽑은 띠 벡터로 "변화 후 안정" 지점을 계산한다.
    // 새 헤드라인 등장 지점이라 놓친 아이템 경계의 강한 후보다(8회차 실측 재현 96% — §109).
    const bandEvents = detectBandEvents(samples.map((sample) => ({
      time: sample.time,
      band: bandCache.get(Math.round(sample.time * 100)) ?? null,
    })));
    // 2/4 후보 도출(무료 화면 매칭) + 아웃트로(구독 범퍼) 검출 — 포맷 라우팅(평일·레터박스·신형 중 최근접 뱅크)
    // 모닝와이드도 8뉴스와 같은 포맷 라우팅을 쓴다 — 회차마다 구도가 통째로 바뀌는데
    // (7/28 전량 분할·7/29 전량 풀샷) 한 매처에 섞으면 분산이 커져 변별력이 떨어진다
    // (A/B 실측: 합본 27장에서 7/24가 97.3 → 88.2).
    const matcher = program === "morningwide"
      // 두 구도는 동등한 지위라 단순 최소 거리로 고른다 — 8뉴스의 "기본 뱅크 우선" 문턱을
      // 쓰면 7/30처럼 풀샷이 더 가까운 회차에서도 분할 뱅크가 선택된다(오프라인 실측).
      ? selectAnchorMatcher(samples, [
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS),
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS_FULLSHOT),
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS_LIGHT),
        // §7-u — 7/30·7/31 구도. 두 회차의 라벨 근방 참조거리 중앙값이 0.10~0.11로 기존
        // 3계열 커버 밖이었고(타 회차 0.04~0.05), 이것이 오프라인 FN 33개 중 24개의 원인
        // 이었다. LOO 실측: 형제 회차 기증만으로 +20 TP·대조 6회차 변화 0(라우팅이 새
        // 뱅크를 선택하지 않음). 재킷 색·배경이 달라 두 계열로 분리했다(합본 악화 §7-o).
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS_0730),
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS_0731),
        // §7-af 잔여 결손 처방 — footage 전면 합성 구도(8/3 389·8/4 1085.7)의 실기 후보 소멸.
        // 편입 A/B: 학습 8회차 F1·라우팅 완전 동일(오염 0), 8/3 60→100 · 8/4 76.9→100(오프라인).
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS_0803),
        // §7-ak 처방 — 수요일 교대 진행자(8/5 기증 15장). 기존 10회차 라우팅 불변(A/B 오염 0).
        buildAnchorMatcher(MORNING_WIDE_REFERENCE_GRIDS_0805),
      ], { preferPrimary: false })
      : selectAnchorMatcher(samples, [
        buildAnchorMatcher(NEWS_ANCHOR_REFERENCE_GRIDS),
        buildAnchorMatcher(NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW),
      ]);
    // 학습 범위 밖 경고(§100) — 뱅크가 이 회차 앵커샷을 못 알아보면 후보와 학습 모델이 함께
    // 약해져 아이템이 조용히 적게 나온다(7/23 실측: 정답 12개 중 4개). 검출을 바꾸지는 않고,
    // 사용자가 결과를 그대로 믿지 않도록 미리 알린다.
    const bankFit = bankFitDistance(samples, matcher);
    if (bankFit > BANK_FIT_WARN_DISTANCE) {
      activity.add("warning", `이 회차는 학습 범위 밖일 수 있습니다(화면 일치도 ${bankFit.toFixed(3)} · 기준 ${BANK_FIT_WARN_DISTANCE}) — 아이템이 실제보다 적게 나올 수 있으니 결과를 확인해 주세요.`);
    }
    // §7-aa — 모닝와이드만 저거리 런의 양보 기준을 켠다: 원거리 b-roll shot(>cap)이 ±6s
    // 자리를 차지해 진짜 앵커 런(0.036)이 버려지는 FN 2건 실측(7/22 968·7/29 372).
    // 8뉴스는 옵션 미전달로 종전 동작 그대로다. 실기 판정 전까지 오프라인 근거(§7-aa
    // 반사실 TP +3·FP +2)만 있는 상태 — 재개 후 대조(과거 FP 이력 포함)로 판정한다.
    // §7-ao — 런 후보의 시각 귀속 시정(모닝와이드만). 런이 직전 b-roll 꼬리까지 삼키면
    // 시각은 b-roll을, 거리는 앵커를 가리켜 후보가 다른 샷을 지목했다. 19회차 오프라인에서
    // 상승 7 · 하락 0(학습 94.3→96.2 · 홀드아웃 88.3→90.6, TP +1 · FN −1 · FP −8).
    const candidates = collectAnchorCandidates(samples, matcher, program === "morningwide"
      ? { runYieldMaxDist: MORNING_WIDE_UNION_MAX_REF_DIST, runTimeAtOnset: true }
      : {});
    if (candidates.length === 0) throw new Error("앵커 샷 후보를 찾지 못했습니다 — 뉴스 방송 시퀀스인지 확인해 주세요.");
    const tailStart = detectStaticTailStart(samples);
    // 앵커 확정 — 완전 무료(외부 API 0회): 자동 임계 주 앵커 + 강한 런 + 학습 모델 고신뢰 검출
    // 모닝와이드 전용 P5 모델(§7-ae·§7-af) — 홀드아웃 8/4 +10.3, 뱅크가 원리적으로 못 잡는
    // 결손(런 삼킴·cap 초과)을 회수하는 상보 경로. 8뉴스 모델·경로는 문자 그대로 불변.
    const probabilities = scoreAnchorSamples(
      samples,
      matcher,
      program === "news8" ? NEWS_ANCHOR_MODEL_WEIGHTS : MORNING_WIDE_ANCHOR_MODEL_WEIGHTS,
      program === "news8" ? NEWS_ANCHOR_MODEL_BIAS : MORNING_WIDE_ANCHOR_MODEL_BIAS,
    );
    const modelStarts = detectModelStarts(samples, probabilities);
    // 모닝와이드는 아이템이 20개를 넘고 후보 거리가 촘촘해 자동 임계만으로는 대부분이 잘린다
    // (7/28 실측: 정답 23개 중 6개 확정). 거리 상한 합집합을 함께 쓴다 — 8뉴스는 미지정이라 불변.
    const accepted = hybridAnchorTimes(
      candidates,
      modelStarts,
      program === "morningwide" ? { unionMaxRefDist: MORNING_WIDE_UNION_MAX_REF_DIST } : {},
    );
    if (accepted.length === 0) throw new Error("앵커 샷을 찾지 못했습니다 — 뉴스 방송 시퀀스인지 확인해 주세요.");
    // 큐시트 국소 보간 회수 — 올려둔 큐시트가 있을 때만 돈다(없으면 아래 accepted가 그대로다).
    // **큐시트 절대 시각은 쓰지 않는다.** 확정된 앞뒤 경계에 큐시트 간격을 얹어 사이를 예측하고,
    // 그 창 안에 이미 있는 후보만 되살린다 — 없는 경계를 만들지 않으므로 전역 정밀도를 팔지 않는다.
    // 회수분은 아래 비전 검증을 그대로 통과한다(§92 오배제 0 경로).
    // **큐시트 가지치기는 실기에서 기각됐다(§7-bm) — 배선하지 않는다.** 오프라인에서 +3.0이었으나
    // 실기 7/16에서 깎은 3개 중 2개가 TP였고 97.4 → 91.9가 됐다. 오프라인에는 비전이 없어
    // 과분할이 남아 있지만 실기는 비전이 이미 걷으므로, 비전 앞에서 깎으면 정답을 집는다.
    const cueRecovered = applyCueSheetRecovery(accepted, candidates);
    if (cueRecovered.length > accepted.length) accepted.splice(0, accepted.length, ...cueRecovered);
    activity.add("info", `원클릭 분할 · 앵커 ${accepted.length}개(화면 매칭 후보 ${candidates.length} · 학습 모델 ${modelStarts.length})`);
    // 실행간 비결정성 진단용(§92) — 확정 후보 시각을 남겨 비전 배제와 후보 누락을 구분한다.
    activity.add("info", `확정 후보 시각: ${accepted.map((time) => time.toFixed(1)).join(" ")}`);
    // 비전 검증(기본 ON·유료) — 확정 후보를 시각 판정으로 재확인해 과분할 오검출을 제거한다
    // (vision-anchor-verify.plan.md). 실패 시 무료 결과 그대로 진행(우아한 강하).
    setNewsCutStep(2);
    let verified = accepted;
    // 검증이 배제한 시각 — 회수 재심(§101-c)이 블록 밖에서 참조하므로 여기 선언한다.
    let visionRejectedTimes: number[] = [];
    // 비전 검증 기본 ON(§96) — 오배제 0 확립(§92)·측정 전 회차 F1 100(§93) 근거. 단 키 미설정
    // 사용자는 프레임 내보내기 같은 선행 비용이 들기 전에 조용히 건너뛴다(매 실행 경고 노이즈 방지).
    let visionEnabled = optionalElement<HTMLInputElement>("news-cut-vision-check")?.checked === true;
    // AI 전송 동의 게이트(§99) — 이 경로는 사용자의 방송 프레임 수십 장을 OpenAI로 올린다.
    // 기본 OFF 시절에는 "체크하는 행위"가 동의를 대신했지만 기본 ON(§96)이 되며 그 방어선이
    // 사라졌다. 다른 AI 경로와 달리 예외를 던지지 않는 이유는 무료 분할까지 막으면 안 되기
    // 때문이다 — 비전만 건너뛰고 무료 결과로 완주시킨다.
    if (visionEnabled && optionalElement<HTMLInputElement>("ai-consent-checkbox")?.checked !== true) {
      // #2 가시화(2026-08-12): 비전을 켜둔 채(체크됨) 동의가 없으면 조용히 무료로 강등돼
      // 사용자가 비전이 도는 줄 안다. info 로그만으로는 안 보이므로 toast+warning으로 즉시 알린다.
      activity.add("warning", "⚠ 비전 검증을 건너뛰고 무료 결과로 진행합니다 — AI 전송 동의가 꺼져 있습니다. 정확도 높은 비전 분할을 쓰려면 'AI 설정' 탭에서 동의를 켜세요.");
      toast("비전 없이(무료) 진행합니다 — 'AI 설정' 탭에서 전송 동의를 켜야 비전 분할이 됩니다.", "warning", 7000);
      visionEnabled = false;
    }
    if (visionEnabled && !(await hasStoredOpenAIApiKey())) {
      activity.add("warning", "⚠ 비전 검증을 건너뛰고 무료 결과로 진행합니다 — OpenAI API 키가 없습니다. 'AI 설정' 탭에서 키를 저장하세요.");
      toast("비전 없이(무료) 진행합니다 — 'AI 설정' 탭에서 OpenAI API 키를 저장해야 비전 분할이 됩니다.", "warning", 7000);
      visionEnabled = false;
    }
    // 설정 OFF·DOM 결손도 로그를 남긴다(§182 감사 #5) — "비전 검증 시작"의 부재만으로는
    // 사용자가 껐는지·조용한 강등인지 사후 로그로 가를 수 없었다(§155 검문의 사각).
    if (!visionEnabled && optionalElement<HTMLInputElement>("news-cut-vision-check")?.checked !== true) {
      activity.add("info", "비전 검증 생략 — 설정에서 꺼져 있어 무료 결과로 진행합니다.");
    }
    // 검증 단계의 한도 도달을 회수 단계까지 전파한다(§182 감사 #3) — try 안 지역 변수로만
    // 두면 회수 블록이 그대로 진입해 같은 한도 실패를 프레임 내보내기 비용까지 치르며 반복한다.
    let verifyBudgetStopped = false;
    if (visionEnabled) {
      try {
        // 유료 호출의 시작 시점을 로그에 남긴다 — 진행 표시(busy-message)는 사라지므로,
        // 사후에 "언제 무엇이 몇 장 나갔는지"를 확인할 수 있는 기록이 활동 로그에만 남는다.
        activity.add("info", `비전 검증 시작 — 앵커 후보 ${accepted.length}개 × 4프레임을 OpenAI로 전송합니다(유료).`);
        // 후보가 실제 컷보다 이르거나(§91) 늦게(§92 788 실측) 잡히면 판정 프레임이 앵커 구간을
        // 비껴가고, 비정형 합성 구도(§92 414 실측)는 단일 프레임 판정이 흔들린다. -3s(늦은 후보)·
        // +1.2s·+4s(정상 위치 이중화)·+7s(이른 후보) 네 프레임이 모두 non-anchor일 때만 배제한다
        // — 후보가 컷 ±7s 안이면 구간 내 프레임이 확보되고, 정위치면 2장이라 오판 1회를 흡수한다.
        const frames: Array<{ time: number; offset: number; bytes: Uint8Array }> = [];
        // 내보내기 워밍업(§122 실측) — 시퀀스 활성화 직후의 첫 1~2장은 exportSequenceFrame이
        // true를 반환하고도 파일을 남기지 않는다(같은 시각 반복 측정에서 rep0의 2장만 실패,
        // 이후 전부 성공·바이트 동일). 첫 후보의 표가 그 자리에서 통째로 날아가면 FP가 살아남으므로
        // 버릴 프레임 한 장으로 파이프라인을 깨운 뒤 본 루프를 돈다.
        if (accepted.length > 0) {
          try {
            const warm = await exportFrameToFolder(Math.max(0, accepted[0]!), String(dataFolder.nativePath), 480);
            await readExportedFrameBytes(dataFolder, api.formats, warm.filename);
          } catch {
            // 워밍업 실패는 무시 — 본 루프가 재시도한다
          }
        }
        // 후보별 필요 표수(§120) — -3s 프로브가 직전 후보의 앵커 블록으로 새면 그 표는 "앞 아이템의
        // 앵커"를 보고 찍힌 것이라 뒤 후보의 FP를 살린다(5/08 382 실측: 379s 프로브가 360~380 앵커
        // 블록 안). 그런 후보는 -3s를 빼고 남은 3표 전원 합의로 배제한다.
        // 창 25s: 앵커 블록은 10~30s이고(§112 시맨틱) 실측 최장 20s(5/08 360~380)였다. 8s로는
        // 그 블록 끝을 못 덮어 1차 수정이 무효였다. 진짜 앵커는 -3s를 빼도 남은 3표가 앵커라
        // 오배제로 이어지지 않는다(5/07 회귀 12/12 확인).
        const requiredVotes = new Map<number, number>();
        for (const [frameIndex, time] of accepted.entries()) {
          throwIfNewsCutCancelled();
          setText("busy-message", `비전 검증 프레임 ${frameIndex + 1}/${accepted.length}…`);
          const leaks = accepted.some((other) => other < time && time - 3 >= other && time - 3 <= other + 25);
          const offsets = leaks ? [1.2, 4, 7] : [-3, 1.2, 4, 7];
          requiredVotes.set(time, offsets.length);
          // 480px 채택(§89 A/B 실측): 320px는 진짜 앵커 오배제 ~9%, 480px는 오판 0 — 비용 차이는 무시 수준.
          for (const offset of offsets) {
            // 프레임 유실 = 표 유실 = votes>=4 불충족으로 FP 자동 생존(§92 실측: 실행당 68장 중 1~4장
            // 내보내기 유실, 1차 E2E에서 622.75 footage가 이 경로로 생존) — 내보내기 실패는 1회 재시도한다.
            let frameBytes: Uint8Array | null = null;
            for (let attempt = 0; attempt < 2 && !frameBytes; attempt += 1) {
              const { filename } = await exportFrameToFolder(Math.max(0, time + offset), String(dataFolder.nativePath), 480);
              frameBytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
            }
            if (frameBytes) frames.push({ time, offset, bytes: frameBytes });
          }
        }
        // 부족분 재수집(§132) — 확보 프레임이 필요 표수보다 적으면 그 후보는 **원리적으로 배제 불가**다
        // (표 상한이 문턱보다 낮으므로). 1/21 실측: 후보 192가 4장 중 2장만 확보돼 2/2 비앵커로도
        // 4표 문턱을 못 넘고 FP가 확정 생존했다(회의장 다인 화면 · F1 96.3).
        // offset별 2회 재시도로도 남는 유실이라, 전 후보 수집이 끝난 뒤 빠진 offset만 한 번 더 모은다.
        {
          const collected = new Map<number, Set<number>>();
          for (const frame of frames) {
            if (!collected.has(frame.time)) collected.set(frame.time, new Set());
            collected.get(frame.time)!.add(frame.offset);
          }
          const missing: Array<{ time: number; offset: number }> = [];
          for (const time of accepted) {
            const need = requiredVotes.get(time) ?? 4;
            const have = collected.get(time) ?? new Set<number>();
            if (have.size >= need) continue;
            for (const offset of need === 3 ? [1.2, 4, 7] : [-3, 1.2, 4, 7]) {
              if (!have.has(offset)) missing.push({ time, offset });
            }
          }
          // 재수집은 지연을 두고 최대 2라운드(§191-c) — 1라운드로는 부족함이 실측됐다.
          // MW 7/28 실기: §132 재수집이 발동했는데 그 1장도 죽어 876이 2/2(만장일치인데
          // 3표 요건 미달)로 통과, FP 875.5가 됐다. §190-b와 같은 원리로 라운드 사이에
          // 지연을 둔다 — 순간 부하에서는 연속 재시도가 함께 죽는다.
          let pending = missing;
          for (let round = 0; round < 2 && pending.length > 0; round += 1) {
            // 재수집 전 지연(§190-d) — 1/06 실측: §132 재수집이 있는데도 292가 3/3으로 남아
            // 배제 표 미달 FP가 됐다(유실이 회수 FN뿐 아니라 검증 FP도 만든다).
            await new Promise((resolve) => setTimeout(resolve, 1000 * (round + 1)));
            activity.add("info", `비전 검증 · 프레임 부족 후보 ${new Set(pending.map((entry) => entry.time)).size}개의 ${pending.length}장을 재수집합니다(${round + 1}차).`);
            const stillMissing: typeof pending = [];
            for (const [index, entry] of pending.entries()) {
              setText("busy-message", `비전 검증 · 부족분 재수집 ${index + 1}/${pending.length}(${round + 1}차)…`);
              const { filename } = await exportFrameToFolder(Math.max(0, entry.time + entry.offset), String(dataFolder.nativePath), 480);
              const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
              if (bytes) frames.push({ time: entry.time, offset: entry.offset, bytes });
              else stillMissing.push(entry);
            }
            pending = stillMissing;
          }
          if (pending.length > 0) {
            activity.add("warning", `비전 검증 · 재수집 2라운드 후에도 ${pending.length}장 유실 — 해당 후보는 배제 불가로 남습니다(§191-c).`);
          }
        }
        // 비전 참조 예시 코퍼스는 8뉴스 앵커샷 기반 — 모닝와이드 판정에 넣으면 오히려 오도한다(프로필 분리).
        const references = program === "news8"
          ? loadAnchorExemplars()
            .map((exemplar) => ({ bytes: base64ToBytes(exemplar.pngBase64), mimeType: "image/png" as const }))
            .filter((reference) => looksCompleteImage(reference.bytes, "png"))
            .slice(0, 5)
          : [];
        const client = new OpenAITextClient({ endpoint: settings.aiEndpoint });
        const rejected = new Set<number>();
        const rejectionVotes = new Map<number, number>();
        const verifyVerdicts = new Map<number, string[]>();
        // 배치는 장수뿐 아니라 바이트 합계로도 나눈다 — 참조 포함 1.2MB 캡(어댑터) 아래 유지(실기 실측 §78).
        const referenceBytes = references.reduce((sum, reference) => sum + reference.bytes.byteLength, 0);
        const maxFramesPerBatch = Math.max(3, 12 - references.length);
        // 배치 응답에서 인덱스가 누락된 프레임은 표가 사라져 FP가 생존한다(§92 1차 E2E 622.75 실측)
        // — 유실분만 모아 1회 재판정한다. 이미 받은 판정(anchor 표·저신뢰 기권 포함)은 재판정하지
        // 않는다 — 진짜 앵커를 지키는 표를 재시도로 뒤집을 수 있기 때문.
        let pending = frames;
        // 일일 한도 도달은 "판정 유실"이 아니다(§110-c 실측: 한도 기각이 유실로 위장돼 원인 불명이 됐다)
        // — 남은 배치·재판정 라운드를 즉시 접고 별도 경고로 알린다.
        let budgetStopped = false;
        // 크레딧 소진 구별(§191-f) — 즉시 중단은 한도와 같지만 사용자 처방이 다르다.
        // 실사고: 소진 상태가 "일일 한도 도달"로 표기돼 감시 스크립트가 복구로 오판,
        // 5회차를 헛돌렸다(채점기 가드가 전량 거부해 오염은 없었다).
        let creditExhausted = false;
        const lossCauses = new Map<string, number>();
        // "기타" 유실의 원문 표본(§191-e) — mwY 실사고에서 검증·회수 판정이 "기타 67"로
        // 전멸했는데 원 에러가 어디에도 남지 않아 크레딧 소진·네트워크·API 장애를 구별할 수
        // 없었다. 마지막 원문 한 건이면 계통 원인 진단에 충분하다.
        let lastLossDetail = "";
        for (let round = 0; round < 2 && pending.length > 0; round += 1) {
          const chunks = chunkVisionProbes(pending, referenceBytes, maxFramesPerBatch);
          const missed: typeof frames = [];
          // 유실 원인 내역(§111-c) — 마지막 라운드 기준(= 최종 미판정분의 원인)만 남긴다.
          lossCauses.clear();
          let done = 0;
          for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
            const chunk = chunks[chunkIndex]!;
            done += chunk.length;
            setText("busy-message", round === 0 ? `비전 검증 ${done}/${pending.length}…` : `비전 검증 · 유실 재판정 ${done}/${pending.length}…`);
            busy.progress(Math.round((done / Math.max(1, pending.length)) * 100));
            try {
              const results = await runVisionBatch(
                `verify:${round}:${chunk[0]?.time ?? 0}`,
                chunk.length,
                () => client.classifyAnchorShots(
                  chunk.map((frame) => ({ bytes: frame.bytes, mimeType: "image/png" as const })),
                  references,
                  {},
                  // §168-b — 검증(배제) 경로에도 착석 단서를 켠다. §92 오배제 0을 위협하는
                  // 방향이지만 이 단서만은 예외다: **진짜 앵커는 언제나 앉아 있으므로**
                  // "서 있으면 앵커가 아니다"가 진짜 앵커를 지울 수 없다. 회수 경로만 켰을
                  // 때(§168) 남은 결손이 전부 이 경로에서 나왔다 — 7/29 334를 수락해 FP,
                  // 296은 배제해 FN. 대조 회차로 오배제 0을 확인하고 반영한다.
                  // 모닝와이드도 같은 단서를 쓴다 — 앵커가 데스크에 앉아 있는 것이 두 프로그램
                  // 공통이고, 서서 진행하는 것은 칼럼 진행자뿐임을 고해상 실측으로 확인했다.
                  { seatedAtDesk: true },
                ),
              );
              const received = new Set<number>();
              for (const result of results) {
                received.add(result.index);
                // 프레임별 판정 기록(§122) — 배제는 "4표 전원 합의"라 표 수만으로는 어느 프로브가
                // 어떻게 판정됐는지 알 수 없다. 4/20 846(진짜 앵커)이 4표로 배제된 사건을 동일
                // 프레임·동일 참조·동일 파라미터로 9회 재현했으나 전부 2표였다 — 간접 추론이
                // 막혔으므로 실기가 실제로 무엇을 받았는지 남긴다.
                const judged = chunk[result.index];
                if (judged) {
                  const list = verifyVerdicts.get(judged.time) ?? [];
                  list.push(`${judged.offset >= 0 ? "+" : ""}${judged.offset}${result.isAnchor ? "앵커" : "비앵커"}(${result.confidence.toFixed(2)})`);
                  verifyVerdicts.set(judged.time, list);
                }
                // 배제 표는 고신뢰(0.85+) non-anchor만 인정 — 명백한 footage는 0.97+로 판정되고(§92 실측),
                // 비정형 합성 구도의 흔들리는 판정(경계선 신뢰도)은 진짜 앵커를 죽이지 못하게 한다.
                if (!result.isAnchor && result.confidence >= 0.85) {
                  const time = chunk[result.index]!.time;
                  rejectionVotes.set(time, (rejectionVotes.get(time) ?? 0) + 1);
                }
              }
              chunk.forEach((frame, index) => {
                if (!received.has(index)) {
                  missed.push(frame);
                  lossCauses.set("응답 누락", (lossCauses.get("응답 누락") ?? 0) + 1);
                }
              });
            } catch (error) {
              // 일시 API 오류로 배치 하나가 실패해도 비전 전체를 포기하지 않는다(§92 3차 E2E 실측:
              // 배치 실패 → 전체 강하 → FP 잔존). 실패 배치는 유실 재판정 라운드로 넘긴다.
              missed.push(...chunk);
              // 크레딧 소진도 한도와 같은 종결 조건이다(§191-e) — mwY 실사고에서 "기타"로
              // 남아 잔여 배치를 전부 헛시도했다. 단 사용자 안내는 갈라야 한다(§191-f):
              // 일일 한도는 설정 탭에서 풀 수 있지만 크레딧 소진은 OpenAI 충전이 필요하다.
              if (error instanceof Error && (error.message.includes("한도") || isCreditExhausted(error.message))) {
                budgetStopped = true;
                if (isCreditExhausted(error.message)) creditExhausted = true;
                for (const rest of chunks.slice(chunkIndex + 1)) missed.push(...rest);
                break;
              }
              const kind = aiFailureKind(error);
              lossCauses.set(kind, (lossCauses.get(kind) ?? 0) + chunk.length);
              lastLossDetail = (error instanceof Error ? error.message : String(error)).slice(0, 160);
            }
          }
          pending = missed;
          if (budgetStopped) break;
        }
        if (budgetStopped) {
          verifyBudgetStopped = true;
          activity.add("warning", creditExhausted
            ? `OpenAI 크레딧 소진 — 비전 검증을 중단합니다(미판정 ${pending.length}장은 배제하지 않습니다). platform.openai.com에서 크레딧을 충전해야 재개됩니다.`
            : `AI 일일 한도 도달 — 비전 검증을 중단합니다(미판정 ${pending.length}장은 배제하지 않습니다). 설정 탭에서 한도를 조정할 수 있습니다.`);
        } else if (pending.length > 0) {
          activity.add("warning", `비전 검증 · 프레임 ${pending.length}장 판정 유실${formatLossCauses(lossCauses)} — 해당 후보는 배제하지 않습니다.`);
          if (lastLossDetail) activity.add("warning", `판정 유실 원문(마지막 1건): ${lastLossDetail}`);
        }
        // 표 분포 가시화(§113) — 224류 요동(같은 FP가 실행마다 배제↔생존)의 표가 몇 표에서
        // 갈리는지 없이는 중재 사정권(3표)을 조정할 수 없다.
        // 표 수만으로는 "프레임을 못 구해 표가 모자란 것"과 "모델이 앵커로 본 것"을 못 가른다(§124-d).
        // 3/10 실측: 620(도시 전경 b-roll)·684(이름+직함 인터뷰)가 2·3표로 살아남아 FP가 됐는데,
        // 확보 프레임 수가 없어 유실인지 오판인지 판정할 수 없었다. 후보별로 `표/확보장수`를 남긴다.
        if (accepted.length > 0) {
          const frameCount = new Map<number, number>();
          for (const frame of frames) frameCount.set(frame.time, (frameCount.get(frame.time) ?? 0) + 1);
          const line = accepted
            .map((time) => `${time.toFixed(0)}=${rejectionVotes.get(time) ?? 0}/${frameCount.get(time) ?? 0}`)
            .join(" ");
          activity.add("info", `배제 표/확보 분포(필요 ${[...new Set(requiredVotes.values())].join("·")}표): ${line}`);
        }
        // 배제 3표 후보의 이견 재판정(§113) — 4표 규칙에서 1표가 요동으로 갈리면 같은 FP가
        // 실행마다 생존/배제를 오간다(6/23 224 실측 3례). 3표 후보의 프레임 4장을 통째로 1회
        // 재판정해 4표 전원 합의가 나올 때만 배제로 승격한다 — 배제 문턱을 낮추지 않으므로
        // §92 오배제 0 원칙은 그대로다(진짜 앵커는 재판정에서도 anchor 표를 받는다).
        if (!budgetStopped) {
          for (const [time, votes] of [...rejectionVotes.entries()]) {
            const need = requiredVotes.get(time) ?? 4;
            if (votes !== need - 1) continue;
            const candidateFrames = frames.filter((frame) => frame.time === time);
            if (candidateFrames.length < need) continue;
            setText("busy-message", `비전 검증 · 3표 재판정 ${time.toFixed(0)}s…`);
            try {
              const results = await runVisionBatch(
                `verify-arbit:${time}`,
                candidateFrames.length,
                () => client.classifyAnchorShots(
                  candidateFrames.map((frame) => ({ bytes: frame.bytes, mimeType: "image/png" as const })),
                  references,
                  {},
                  { seatedAtDesk: true }, // §168-b — 재투표도 같은 정의로 판단해야 일관된다.
                ),
              );
              let revotes = 0;
              for (const result of results) {
                if (!result.isAnchor && result.confidence >= 0.85) revotes += 1;
              }
              if (revotes >= need) {
                rejectionVotes.set(time, need);
                activity.add("info", `비전 검증 · ${need - 1}표 후보 ${time.toFixed(1)}s 재판정 ${need}표 합의 — 배제로 승격.`);
              }
            } catch (error) {
              // 실패를 무로그로 삼키지 않는다(안정화 감사 #5) — 재판정 실패는 "표 부족 유지"라
              // 안전하지만, 원인이 로그에 없으면 §160 검문이 뚫린다. 한도면 남은 후보도 같은
              // 결과이므로 즉시 끊는다.
              const revoteMessage = error instanceof Error ? error.message : String(error);
              activity.add("warning", `비전 검증 · ${time.toFixed(1)}s 재판정 실패(${revoteMessage.slice(0, 80)}) — 표 부족으로 유지합니다.`);
              if (revoteMessage.includes("한도")) {
                budgetStopped = true;
                activity.add("warning", "AI 일일 한도 도달 — 남은 재판정 후보를 중단합니다.");
                break;
              }
            }
          }
        }
        // 네 프레임(-3s·+1.2s·+4s·+7s)이 모두 non-anchor일 때만 배제 — 일부만 확보된 후보는 배제하지 않는다.
        // -3s를 뺀 후보(§120)는 3표 전원 합의가 기준이다.
        for (const [time, votes] of rejectionVotes) {
          if (votes >= (requiredVotes.get(time) ?? 4)) rejected.add(time);
        }
        // 배제된 후보의 프레임별 판정(§122) — "왜 배제됐는지"를 사후에 프레임 단위로 볼 수 있어야
        // 오배제와 정당한 배제를 가를 수 있다. 배제분만 남겨 로그 길이를 지킨다.
        for (const time of rejected) {
          const detail = verifyVerdicts.get(time) ?? [];
          activity.add("info", `배제 판정 상세 ${time.toFixed(0)}s (${detail.length}/${requiredVotes.get(time) ?? 4}장): ${detail.join(" ")}`);
        }
        // 표 0으로 살아남은 후보의 상세(§191-d) — 배제 표 분포의 `0/3`은 "3장 전부 앵커 판정"과
        // "3장 전부 저신뢰(<0.85) 기권"을 구별하지 못한다. MW 7/28 실측: 1050(전면 b-roll,
        // 인물 없음)이 0/3으로 통과해 FP 1048.3이 됐는데, 응답 유실은 0건이라 둘 중 무엇인지
        // 로그로 판정 불가였다. 진짜 앵커(대부분 0표)까지 다 찍으면 스팸이므로, **표 0이면서
        // 앵커 만장일치가 아닌 것**(기권 포함)만 남긴다 — 정상 앵커는 전 프레임 고신뢰 앵커다.
        for (const time of accepted) {
          if (rejected.has(time) || (rejectionVotes.get(time) ?? 0) > 0) continue;
          const detail = verifyVerdicts.get(time) ?? [];
          const allConfidentAnchor = detail.length > 0 && detail.every((entry) => entry.includes("앵커(") && !entry.includes("비앵커(") && !/\(0\.[0-7]/u.test(entry));
          if (allConfidentAnchor) continue;
          activity.add("info", `무표 생존 상세 ${time.toFixed(0)}s (${detail.length}장): ${detail.join(" ") || "판정 기록 없음"}`);
        }
        visionRejectedTimes = [...rejected];
        const kept = accepted.filter((time) => !rejected.has(time));
        // 안전망 문턱 3→1(§124) — "잔여가 적으면 배제를 통째로 되돌린다"는 규칙이 분포 밖 회차에서
        // 정확히 거꾸로 작동했다. 2/10 실측: 후보 7개 중 6개를 배제하려 했고 **그 6건이 전부 옳았는데**
        // (라벨 12개 중 어느 것과도 대응하지 않음) 잔여 1개라 필터가 해제돼 FP 4건이 최종 출력에 남았다
        // (F1 76.9). 후보가 부실한 회차일수록 배제 비율이 높은 게 정상인데, 안전망은 그 비율을 폭주로
        // 오인한다 — 그런 회차는 회수가 아이템을 다시 채운다(2/10은 배제 6에 회수 9).
        // 3이라는 값은 §92 당시 보수적으로 잡은 것이고, 그 뒤 §113 재판정·§120 누수 규칙으로 배제
        // 문턱이 더 높아졌다. 실측도 뒷받침한다 — 1/13·1/27·2/03·2/10의 배제 15건이 전부 정당했다.
        // 이제 막는 것은 "전부 배제"뿐이다.
        if (rejected.size > 0 && kept.length >= 1) {
          verified = kept;
          activity.add("info", `비전 검증 · 과분할 의심 ${rejected.size}건 제외 → 앵커 ${verified.length}개 확정`);
          activity.add("info", `비전 배제 시각: ${[...rejected].sort((a, b) => a - b).map((time) => time.toFixed(1)).join(" ")}`);
        } else if (rejected.size > 0) {
          activity.add("warning", `비전 검증 · 제외 후보 ${rejected.size}건이 있으나 잔여 ${kept.length}개(<1)라 필터를 해제합니다.`);
        } else {
          activity.add("info", "비전 검증 · 전 후보 앵커 확인(제외 0)");
        }
      } catch (error) {
        // 런타임 강등(§182 감사 #1·#2) — 검증이 통째로 실패하면 남은 유료 경로도 같은
        // 결과다(§110-c). 플래그를 내려 회수 블록을 건너뛰고, 무료 경로의 유일한 FP 방어인
        // 하단 띠 검사(§149)를 살린다 — 종전에는 플래그가 안 내려가 띠 필터가 꺼진 채
        // 완주했고, 로그 문구("무료 결과 그대로 진행")가 그 사실을 가렸다.
        visionEnabled = false;
        activity.add("warning", `비전 검증 실패 — 무료 경로로 강등합니다(하단 띠 검사 활성 · 크레딧/키는 'AI 설정' 탭에서 확인): ${error instanceof Error ? error.message : String(error)}`);
        toast("비전 검증이 실패해 이번 분할은 무료 경로로 진행했습니다.", "warning", 6000);
      }
    }
    // 놓친 경계 회수(§101·§107) — 무료 신호로는 놓친 경계를 원리적으로 찾을 수 없는 경우가 있다
    // (§100: 놓친 앵커의 뱅크 거리가 회차 중앙값보다 나쁜 경우까지 있고, 어떤 임계·영역·컷
    // 신호로도 oracle 63.2가 천장이었다). 판별 정보는 픽셀에 있으므로, 비정상적으로 긴 아이템
    // 안쪽만 균등 간격으로 훑어 비전에 직접 묻는다.
    //
    // 놓친 경계 회수(§110) — 프로브 소스 3종:
    //  ①균등 격자: 경고 회차(bankFit>0.1)에만. §107 전면 발동은 비경고 회차 FP 3건으로 원복됐다
    //    (§107-b) — 무차별 훑기가 오판 노출을 늘리기 때문.
    //  ②띠 이벤트: 전 회차. "새 헤드라인 등장" 사전 신호가 있는 지점만이라(회차당 20~30곳)
    //    §107의 실패 요인이 없고, 격자 사정권 밖(75s 구간·짧은 리드)의 FN도 닿는다(§109 실측 96%).
    //  ③배제 재심: 검증이 배제한 후보(§101-c) — 오배제 자기치유.
    if (visionEnabled && verifyBudgetStopped) {
      // §182 감사 #3 — 검증이 한도로 중단됐으면 회수도 같은 결과다(§110-c). 프레임 내보내기
      // 비용까지 치르며 실패를 반복하지 않는다.
      activity.add("warning", "검증 단계에서 한도 도달 — 놓친 경계 회수를 생략합니다.");
    }
    if (visionEnabled && !verifyBudgetStopped) {
      try {
        // §171 비경고 회차 긴 공백 스윕 — §107 전면 발동은 산발 오판 FP 3건으로 원복됐지만(§107-b),
        // §170-b가 "후보가 어느 목록에도 안 오르는 FN"(4/07 220.8, 135초 공백)을 규명해 재개한다.
        // §107과의 차이 두 가지로 실패 원인을 막는다. ①공백 120초 이상·8초 간격만(§107은 100초·4초
        // 전면) — 정상 리포트(105~152초)의 대부분이 스윕 대상에서 빠진다. ②스윕 발견은 2표 합의
        // (§107-c 처방)를 요구한다 — 산발 오판은 단일 프레임 사건이므로 +2초 프레임 재판정으로 거른다.
        const warnEpisode = bankFit > BANK_FIT_WARN_DISTANCE;
        const plan = warnEpisode
          ? planRescueProbes(verified, tailStart ?? duration)
          : planRescueProbes(verified, tailStart ?? duration, { maxSpan: 120, stepSeconds: 8 });
        const wideGapTimes = new Set(warnEpisode ? [] : plan.times);
        const gridProbeCount = plan.times.length;
        // 띠 이벤트 시각은 "띠가 바뀐 직후 표본"이라 보통은 새 아이템 리드 안 — 그대로 프로브로 쓴다.
        // 그 전제가 깨지는 경우(짧은 앵커 블록 + 늦은 배너)는 되짚기 2차 라운드가 맡는다(§123).
        const bandProbeTimes: number[] = [];
        // §110 띠 이벤트는 8뉴스 하단 띠 실측 기반이다. 모닝와이드는 띠 헤드라인이 한 아이템
        // 안에서 여러 번 바뀌어(7/24 실측 5회) 이 신호를 쓰면 과분할된다 — P3에서 좌상단 태그
        // 기반으로 재설계하기 전까지 잠근다(plan §7-b).
        const bandEventCandidates = program === "news8" ? bandEvents : [];
        for (const eventTime of bandEventCandidates) {
          const nearVerified = verified.some((existing) => Math.abs(existing - eventTime) <= 8);
          const nearProbe = plan.times.some((existing) => Math.abs(existing - eventTime) <= 2);
          if (!nearVerified && !nearProbe && eventTime < (tailStart ?? duration) - 5) {
            plan.times.push(eventTime);
            bandProbeTimes.push(eventTime);
          }
        }
        const bandProbeCount = plan.times.length - gridProbeCount;
        // 오디오 사인오프 회수(§152) — 리포터 클로징 "KBC ◯◯◯입니다"는 리포트가 끝났다는
        // 결정론적 신호다(5회차 20건 실측: 오검출 0·경계 30% 커버). 화면 신호와 달리 실행마다
        // 흔들리지 않아 §126 변동에 대한 보험이 된다. 창은 이미 뽑아 둔 프로브 지점 직전만 보고,
        // 후보는 회수 프로브 목록에 합류시켜 기존 비전 판정·병합·재스냅을 그대로 통과시킨다.
        const signoffProbeCount = await (async (): Promise<number> => {
          // §7-ap — 모닝와이드 재실측 후 개통(종전에는 `program !== "news8"`로 잠겨 있었다).
          // 19회차 로컬 STT 실측: 경계 적중 6/19(완화형 7/19) · **대조 오검출 0/19**로 8뉴스
          // §152 확정치(오검출 0·경계 30% 커버)와 사실상 같다. MW의 결손은 정밀도가 아니라
          // 재현율이고, 오디오는 짧은 앵커 블록에서 시각 프로브가 이탈하는 지점을 그대로 덮는다.
          // 창 기하는 아이템 스케일이라 그대로 쓴다 — 라벨 실측 아이템 길이 p50이 MW 42초 ·
          // 8뉴스 45초로 사실상 같다(불일치는 블록 스케일에만 있다).
          const signoffPattern = program === "news8" ? SIGNOFF_PATTERN : MORNING_WIDE_SIGNOFF_PATTERN;
          if (plan.times.length === 0) return 0;
          const windows = planSignoffWindows(plan.times, verified, tailStart ?? duration);
          if (windows.length === 0) return 0;
          let audio: { bytes: Uint8Array; name: string };
          try {
            audio = await busy.during("오디오 단서 · 시퀀스 오디오 추출 중…", () => exportActiveSequenceAudio());
          } catch (error) {
            activity.add("warning", `오디오 단서 · 오디오 추출 실패로 건너뜁니다: ${error instanceof Error ? error.message : String(error)}`);
            return 0;
          }
          // 파싱 1회 슬라이서(안정화 감사 #3) — 창마다 전체 WAV 재파싱(~150MB×24)을 막는다.
          let sliceWindow: (begin: number, end: number) => Uint8Array;
          try {
            sliceWindow = createWavWindowSlicer(audio.bytes);
          } catch (error) {
            activity.add("warning", `오디오 단서 · WAV 파싱 실패로 건너뜁니다: ${error instanceof Error ? error.message : String(error)}`);
            return 0;
          }
          const hits: SignoffHit[] = [];
          let sttStopped = false;
          // 창별 실패 사유(안정화 감사 #2) — 실패를 "사인오프 없음"으로 위장하지 않기 위한 기록.
          const sttFailedWindows = new Map<number, string>();
          for (const [windowIndex, window] of windows.entries()) {
            if (sttStopped) break;
            setText("busy-message", `오디오 단서 ${windowIndex + 1}/${windows.length}…`);
            try {
              const clip = sliceWindow(window.begin, window.end);
              const result = await runSignoffStt(clip, window.begin);
              hits.push(...findSignoffs(result, window.begin, signoffPattern));
              sttFailedWindows.delete(windowIndex);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              sttFailedWindows.set(windowIndex, message.slice(0, 80));
              // 한도·인증 실패는 남은 창도 같은 결과이므로 멈춘다 — 한도 기각을 유실로 위장하지 않는다(§110-c).
              // HTTP 4xx/5xx의 영어 detail(예: insufficient credits)도 같은 부류다(안정화 감사 #2) —
              // 한국어 토큰만 보다가 402를 무성(無聲)으로 위장하면 §160 검문이 뚫린다.
              if (/한도|초과|인증|API 키|HTTP 4\d\d|HTTP 5\d\d|credit|quota|unauthorized/iu.test(message)) {
                activity.add("warning", `오디오 단서 · ${windowIndex}/${windows.length}창에서 중단(${message}) — 남은 창은 건너뜁니다.`);
                sttStopped = true;
              }
            }
          }
          // 실패 창을 무성(無聲)으로 위장하지 않는다 — "사인오프 없음"과 "판정 못 함"을 로그로 가른다.
          if (sttFailedWindows.size > 0) {
            const [firstIndex, firstMessage] = [...sttFailedWindows.entries()][0]!;
            activity.add("warning", `오디오 단서 · 창 ${sttFailedWindows.size}곳 판정 실패(예: ${firstIndex}번 창 — ${firstMessage}) — 해당 창은 무성 아님·미판정이다.`);
          }
          if (hits.length === 0) {
            activity.add("info", `오디오 단서 · 판정된 창 ${windows.length - sttFailedWindows.size}/${windows.length}곳에서 사인오프 없음`);
            return 0;
          }
          const times = signoffProbeTimes(hits, verified).filter((time) => plan.times.every((existing) => Math.abs(existing - time) > 1.5));
          activity.add("info", `오디오 단서 · 사인오프 ${hits.length}건 → 회수 후보 ${times.length}개: ${times.map((time) => time.toFixed(1)).join(" ")}`);
          plan.times.push(...times);
          return times.length;
        })();
        for (const rejectedTime of visionRejectedTimes) {
          if (plan.times.every((existing) => Math.abs(existing - rejectedTime) > 2)) plan.times.push(rejectedTime + 1.2);
        }
        if (plan.times.length > 0) {
          activity.add("info", `놓친 경계 회수 시작 — 격자 ${gridProbeCount}·띠 이벤트 ${bandProbeCount}·오디오 ${signoffProbeCount}·재심 ${plan.times.length - gridProbeCount - bandProbeCount - signoffProbeCount} = ${plan.times.length}프레임을 훑습니다(유료).`);
          // 실기 사후 판독용(§110-b) — 어떤 시각을 훑었는지 없으면 회수 실패를 진단할 수 없다.
          activity.add("info", `회수 프로브 시각: ${plan.times.slice(0, 60).map((time) => time.toFixed(1)).join(" ")}${plan.times.length > 60 ? " …" : ""}`);
          const probes: Array<{ time: number; bytes: Uint8Array }> = [];
          for (const [probeIndex, time] of plan.times.entries()) {
            throwIfNewsCutCancelled();
            setText("busy-message", `회수 훑기 ${probeIndex + 1}/${plan.times.length}…`);
            busy.progress(Math.round(((probeIndex + 1) / Math.max(1, plan.times.length)) * 100));
            // 내보내기 재시도(§121-b) — 검증 경로(§92)에만 있던 재시도가 여기엔 없어서, 내보내기가
            // 조용히 빈손으로 끝나면 그 지점의 회수 기회가 통째로 사라졌다. 3/24 재실행 실측:
            // 252 프로브 1장이 유실돼 248 경계가 그대로 FN이 됐다(F1 96.3).
            let bytes: Uint8Array | null = null;
            for (let attempt = 0; attempt < 2 && !bytes; attempt += 1) {
              const { filename } = await exportFrameToFolder(Math.max(0, time), String(dataFolder.nativePath), 480);
              bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
            }
            if (bytes) probes.push({ time, bytes });
          }
          // 내보내기 유실은 그 지점의 회수 기회 상실이다(§101-c 진단) — 몇 장이 어디서 빠졌는지 남긴다.
          if (probes.length < plan.times.length) {
            const lost = plan.times.filter((time) => !probes.some((probe) => probe.time === time));
            // 지연 재시도 패스(§190-b) — 같은 지점 2연속 실패(§121-b)는 순간 부하에서 함께
            // 죽는다. 순회가 끝나 부하가 풀린 뒤 한 번 더 시도한다. 1/06 실측: 372 프로브
            // 유실이 그대로 FN이 되어 5실행 중 1실행이 95.2로 떨어졌다(요동의 실체).
            await new Promise((resolve) => setTimeout(resolve, 1000));
            for (const time of lost) {
              const { filename } = await exportFrameToFolder(Math.max(0, time), String(dataFolder.nativePath), 480);
              const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
              if (bytes) probes.push({ time, bytes });
            }
            probes.sort((a, b) => a.time - b.time);
            const stillLost = plan.times.filter((time) => !probes.some((probe) => probe.time === time));
            if (stillLost.length > 0) {
              activity.add("info", `회수 훑기 · 프레임 내보내기 유실 ${stillLost.length}장(지연 재시도 후): ${stillLost.slice(0, 10).map((time) => time.toFixed(0)).join(" ")}`);
            } else {
              activity.add("info", `회수 훑기 · 유실 ${lost.length}장을 지연 재시도로 전부 확보했습니다.`);
            }
          }
          // 같은 회차에서 이미 확정된 앵커 프레임을 참조로 우선 주입(§101-c) — 연단·기자회견이
          // 배경으로 합성된 앵커샷 오독은 프롬프트 절로도 남았다(3차 실기 799.6·833.8 잔존).
          // "같은 스튜디오·같은 앵커·같은 데스크"의 실물 예시가 코퍼스 예시보다 강한 신호다.
          // 검증을 통과한 verified 앞쪽에서 뽑으므로 footage가 참조로 들어갈 위험은 없다.
          const sameEpisodeRefs: Array<{ bytes: Uint8Array; mimeType: "image/png" }> = [];
          for (const anchorTime of verified.slice(0, 3)) {
            const { filename } = await exportFrameToFolder(Math.max(0, anchorTime + 1.2), String(dataFolder.nativePath), 480);
            const bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
            if (bytes && looksCompleteImage(bytes, "png")) sameEpisodeRefs.push({ bytes, mimeType: "image/png" });
          }
          const rescueRefs = [
            ...sameEpisodeRefs,
            // 코퍼스 예시는 8뉴스 앵커샷 기반 — 모닝와이드는 같은 회차 참조만 쓴다(프로필 분리).
            ...(program === "news8"
              ? loadAnchorExemplars()
                .map((exemplar) => ({ bytes: base64ToBytes(exemplar.pngBase64), mimeType: "image/png" as const }))
                .filter((reference) => looksCompleteImage(reference.bytes, "png"))
              : []),
          ].slice(0, 5);
          const rescueClient = new OpenAITextClient({ endpoint: settings.aiEndpoint });
          const found: number[] = [];
          // 배치는 검증 경로와 동일하게 장수(참조 포함 12)와 바이트 합계(1.1MB)로 나눈다 —
          // 1차 E2E에서 장수로만 나눴다가 어댑터 1.2MB 상한에 전 배치가 조용히 걸려
          // 회수 0건으로 끝났다(§101-b). 실패는 반드시 개수로 가시화한다.
          const rescueRefBytes = rescueRefs.reduce((sum, reference) => sum + reference.bytes.byteLength, 0);
          const rescuePerBatch = Math.max(3, 12 - rescueRefs.length);
          // 판정 유실 재시도(§110-b) — 실기에서 모델이 유효 JSON을 주면서 프레임 엔트리를 통째로
          // 빠뜨리는 일이 흔하다(7/24 검증 40장 실측). 참조가 크면 청크당 프로브가 1~2장뿐이라
          // 엔트리 유실 = 그 지점 회수의 조용한 실패다. 검증 경로(§92)와 동일하게 수신 인덱스를
          // 대조해 유실분만 1회 재판정하고, 남으면 개수·시각으로 가시화한다.
          let rescuePending = probes;
          // §172-b 스윕 미달 앵커 판정(0.75~0.95)의 2표 구제 후보.
          const wideGapWeakHits: number[] = [];
          // 검증 경로와 동일한 한도 처리(§110-c) — 한도 기각을 유실로 위장하지 않는다.
          let rescueBudgetStopped = false;
          const rescueLossCauses = new Map<string, number>();
          let rescueLastLossDetail = ""; // §191-e — 검증 경로와 같은 원문 표본
          const rescueNearMisses: string[] = [];
          const rescueVerdicts: string[] = [];
          for (let rescueRound = 0; rescueRound < 2 && rescuePending.length > 0; rescueRound += 1) {
            const rescueChunks = chunkVisionProbes(rescuePending, rescueRefBytes, rescuePerBatch);
            const rescueMissed: typeof probes = [];
            // 유실 원인 내역(§111-c) — 마지막 라운드 기준(= 최종 미판정분의 원인)만 남긴다.
            rescueLossCauses.clear();
            let rescueJudged = 0;
            for (let chunkIndex = 0; chunkIndex < rescueChunks.length; chunkIndex += 1) {
              const chunk = rescueChunks[chunkIndex]!;
              rescueJudged += chunk.length;
              setText("busy-message", rescueRound === 0
                ? `회수 판정 ${rescueJudged}/${rescuePending.length}…`
                : `회수 · 유실 재판정 ${rescueJudged}/${rescuePending.length}…`);
              try {
                const results = await runVisionBatch(
                  `rescue:${rescueRound}:${chunk[0]?.time ?? 0}`,
                  chunk.length,
                  // 위치 단서는 회수(추가) 경로에만 켠다(§139) — 검증(배제) 경로에 켜면
                  // §92 오배제 0이 위험하지만, 추가를 엄격하게 하는 방향은 안전하다.
                  () => rescueClient.classifyAnchorShots(
                    chunk.map((probe) => ({ bytes: probe.bytes, mimeType: "image/png" as const })),
                    rescueRefs,
                    {},
                    { anchorLeftDesk: true, seatedAtDesk: true },
                  ),
                );
                const received = new Set<number>();
                // 회수는 "추가"라 오검출이 곧 과분할이다 — 검증 경로(0.85)보다 엄격한 문턱을 쓴다(§137).
                for (const result of results) {
                  received.add(result.index);
                  const probe = chunk[result.index];
                  if (!probe) continue;
                  rescueVerdicts.push(`${probe.time.toFixed(0)}${result.isAnchor ? "→앵커" : "→비앵커"}(${result.confidence.toFixed(2)})`);
                  if (result.isAnchor && result.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE) found.push(probe.time);
                  // 임계 바로 아래 판정은 진단 가치가 있다(§101-c) — "오독"과 "임계 미달"을 로그로 가른다.
                  else if (result.isAnchor) {
                    rescueNearMisses.push(`${probe.time.toFixed(0)}(${result.confidence.toFixed(2)})`);
                    // §172-b 스윕 프로브의 미달 앵커 판정(0.75~0.95)은 버리지 않고 2표 구제 후보로
                    // 남긴다 — 7/13 실측: 189.8 경계를 188→앵커(0.81)로 보고도 임계에서 버려 FN이
                    // 됐다. +2초 독립 프레임이 0.95+면 두 표의 합의로 채택한다.
                    if (wideGapTimes.has(probe.time) && result.confidence >= 0.75) wideGapWeakHits.push(probe.time);
                  }
                }
                chunk.forEach((probe, index) => {
                  if (!received.has(index)) {
                    rescueMissed.push(probe);
                    rescueLossCauses.set("응답 누락", (rescueLossCauses.get("응답 누락") ?? 0) + 1);
                  }
                });
              } catch (error) {
                // 배치 실패는 회수 포기가 아니라 유실이다 — 재판정 라운드로 넘긴다(검증 경로 §92와 동일).
                rescueMissed.push(...chunk);
                if (error instanceof Error && (error.message.includes("한도") || isCreditExhausted(error.message))) {
                  rescueBudgetStopped = true;
                  for (const rest of rescueChunks.slice(chunkIndex + 1)) rescueMissed.push(...rest);
                  break;
                }
                const kind = aiFailureKind(error);
                rescueLossCauses.set(kind, (rescueLossCauses.get(kind) ?? 0) + chunk.length);
                rescueLastLossDetail = (error instanceof Error ? error.message : String(error)).slice(0, 160);
              }
            }
            rescuePending = rescueMissed;
            if (rescueBudgetStopped) break;
          }
          if (rescueBudgetStopped) {
            activity.add("warning", `AI 일일 한도 도달 — 놓친 경계 회수를 중단합니다(미판정 ${rescuePending.length}장). 설정 탭에서 한도를 조정할 수 있습니다.`);
          } else if (rescuePending.length > 0) {
            activity.add("warning", `회수 · 프레임 ${rescuePending.length}장 판정 유실${formatLossCauses(rescueLossCauses)} — 해당 지점은 회수하지 않습니다: ${rescuePending.slice(0, 10).map((probe) => probe.time.toFixed(0)).join(" ")}`);
            if (rescueLastLossDetail) activity.add("warning", `회수 유실 원문(마지막 1건): ${rescueLastLossDetail}`);
          }
          // 실기 사후 판독용(§110-b) — 프로브별 판정이 없으면 "비전이 뭐라 했는지"를 영영 알 수 없다.
          // 앵커 판정을 먼저 싣는다(§124-b) — 격자 회차는 프로브가 150장이라 40건 절단에 **정작 경계가
          // 된 판정이 잘려나갔다**(1/20 706·786 FP를 로그에서 볼 수 없어 진단이 막혔다). 경계를 만든
          // 판정은 몇 건 안 되므로 우선 싣고, 남는 자리에만 비앵커를 채운다.
          if (rescueVerdicts.length > 0) {
            const anchorLines = rescueVerdicts.filter((line) => line.includes("→앵커"));
            const otherLines = rescueVerdicts.filter((line) => !line.includes("→앵커"));
            const shown = [...anchorLines, ...otherLines.slice(0, Math.max(0, 40 - anchorLines.length))];
            activity.add("info", `회수 판정 상세: ${shown.join(" ")}${rescueVerdicts.length > shown.length ? " …" : ""}`);
          }
          if (rescueNearMisses.length > 0) {
            activity.add("info", `회수 · 임계(${RESCUE_ANCHOR_MIN_CONFIDENCE}) 미달 판정 ${rescueNearMisses.length}건: ${rescueNearMisses.slice(0, 8).join(" ")}`);
          }
          // §171 긴 공백 스윕 발견은 2표 합의를 거친다 — §107-b의 FP 3건은 진단에서 재현되지 않는
          // 단일 프레임 산발 오판이었다(§107-c). +2초 프레임이 독립 표본이 되어 오판 확률을 제곱으로
          // 떨어뜨린다. 두 번째 프레임의 판정 유실은 보수적으로 기각한다(회수는 추가라 불확실하면
          // 안 늘리는 쪽이 맞다 — §121-c와 같은 원칙).
          const wideGapHits = found.filter((time) => wideGapTimes.has(time));
          // §172-b 미달 구제 후보도 같은 2표 절차를 태운다 — 첫 표가 약하므로(0.75~0.95) 두 번째
          // 표가 임계(0.95+)를 넘어야만 채택된다. 확정 히트와 조건이 같아 코드 경로를 공유한다.
          const weakRescueCandidates = wideGapWeakHits.filter((time) => !found.includes(time));
          if (weakRescueCandidates.length > 0) {
            activity.add("info", `스윕 미달 2표 구제 후보 ${weakRescueCandidates.length}건: ${weakRescueCandidates.map((time) => time.toFixed(1)).join(" ")}`);
          }
          const secondVoteTargets = [...wideGapHits, ...weakRescueCandidates];
          if (secondVoteTargets.length > 0) {
            activity.add("info", `긴 공백 스윕 발견 ${wideGapHits.length}건 — 2표 합의 확인: ${secondVoteTargets.map((time) => time.toFixed(1)).join(" ")}`);
            // 한도 도달 후에도 표적마다 실패 호출을 계속 내면, 남은 히트가 "비전이 기각함"이
            // 아니라 **예산 소진 때문에** 조용히 삭제된다(안정화 감사 — 회수 본체 §110-c와
            // judge()에는 있던 처리가 이 루프에만 빠져 있었다). 한도를 만나면 호출을 멈추되,
            // 미확인 표적은 §121-c 원칙대로 그대로 기각하고 그 사유를 로그로 가른다.
            let confirmBudgetStopped = false;
            for (const hitTime of secondVoteTargets) {
              let confirmed = false;
              if (confirmBudgetStopped) {
                activity.add("info", `2표 합의 ${hitTime.toFixed(1)}: 한도로 미확인 → 기각(비전 판정 아님)`);
              } else {
                try {
                  let secondBytes: Uint8Array | null = null;
                  // 연속 재시도는 순간 부하에서 함께 죽는다(§190-b 실측) — 2회차부터 1초 지연을
                  // 두고 3회까지 시도한다. 종전 2회 즉시 재시도로는 이 지점만 유실이 남아
                  // **진짜 앵커가 "판정 유실"로 기각**됐다(모닝와이드 7/29 요동의 직접 원인:
                  // 5실행 중 2회, 유실 지점이 매번 달랐다 — 860·876·1020).
                  for (let attempt = 0; attempt < 3 && !secondBytes; attempt += 1) {
                    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
                    const { filename } = await exportFrameToFolder(Math.max(0, hitTime + 2.0), String(dataFolder.nativePath), 480);
                    secondBytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
                  }
                  if (secondBytes) {
                    const votes = await runVisionBatch(
                      `rescue-confirm:${hitTime}`,
                      1,
                      () => rescueClient.classifyAnchorShots(
                        [{ bytes: secondBytes!, mimeType: "image/png" as const }],
                        rescueRefs,
                        {},
                        { anchorLeftDesk: true, seatedAtDesk: true },
                      ),
                    );
                    const vote = votes[0];
                    confirmed = Boolean(vote && vote.isAnchor && vote.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE);
                    activity.add("info", `2표 합의 ${hitTime.toFixed(1)}: +2초 프레임 ${vote ? `${vote.isAnchor ? "앵커" : "비앵커"}(${vote.confidence.toFixed(2)})` : "판정 유실"} → ${confirmed ? "채택" : "기각"}`);
                  } else {
                    // 내보내기 유실을 "비전이 기각함"으로 위장하지 않는다(1차 회수 경로와 동일 원칙).
                    activity.add("info", `2표 합의 ${hitTime.toFixed(1)}: +2초 프레임 내보내기 유실 → 기각(비전 판정 아님)`);
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error);
                  activity.add("warning", `2표 합의 ${hitTime.toFixed(1)} 확인 실패(${message}) — 보수적으로 기각합니다.`);
                  if (message.includes("한도")) {
                    activity.add("warning", "AI 일일 한도 도달 — 남은 2표 합의 확인을 중단합니다(미확인분은 기각).");
                    confirmBudgetStopped = true;
                  }
                }
              }
              if (!confirmed) {
                const foundIndex = found.indexOf(hitTime);
                if (foundIndex >= 0) found.splice(foundIndex, 1);
              } else if (!found.includes(hitTime)) {
                // §172-b 미달 구제 — 첫 표 0.75~0.95 + 두 번째 표 0.95+의 합의로 채택된다.
                found.push(hitTime);
              }
            }
          }
          // 되짚기 2차 라운드(§123) — 띠 이벤트는 "배너가 뜨고 띠가 안정된 표본"이라 짧은 앵커
          // 블록에서는 리드인의 **끝 이후**를 가리킨다(3/24 920 실측: 블록 920~927에 배너가 923에
          // 떠서 이벤트가 컷 뒤 930에 잡혔고 그 프레임은 b-roll이라 회수 실패). 1차가 빗나간 띠
          // 지점만 6초 앞을 다시 본다. 6초는 실측에서 나왔다 — 930−6=924가 블록 안이고, 10초로
          // 잡으면 920이라 컷 직전으로 샌다.
          //
          // §121-c에서 이 라운드를 거리 기반 중복제거로만 걸렀다가 두 번 다 FP를 냈다(78s·90s —
          // 둘 다 진짜 앵커였고, 아이템1의 앵커 블록이 90초 넘게 이어진 것). 창을 20→30초로 넓혀도
          // 새어 원복했다. 거리로는 "긴 앵커 블록"과 "새 단신"을 가를 수 없기 때문이다.
          // 이번에는 **연속성**으로 가른다 — 직전 시작과 되짚기 발견의 중간점이 앵커면 둘은 같은
          // 블록이므로 버린다(3/24: (52+78)/2=65 앵커 → 기각, (866+924)/2=895 b-roll → 채택).
          const backAccepted: number[] = [];
          // −6과 −2 두 점을 본다(§144) — −6 한 점만으로는 짧은 리드(4~5초)에서 컷 직전으로 샌다.
          // 1/14 실측: 이벤트 722(성금 카드), −6=716.0은 직전 리포트 b-roll인데 진짜 시작은
          // 716.4 — 0.4초 차이로 빗나갔고, −2=720은 앵커였다. 비용은 실패 띠 지점당 +1장.
          const backoffTimes = bandProbeTimes
            .filter((time) => !found.includes(time))
            .flatMap((time) => [time - 6, time - 2])
            .filter((time, index, list) => list.indexOf(time) === index)
            .filter((time) => time > 0
              && time < (tailStart ?? duration) - 5
              && verified.every((existing) => Math.abs(existing - time) > 8)
              // 중복 판정 방지 문턱은 1.5로(§144-b, 구 2) — 띠 이벤트는 plan.times에 합류하므로
              // (§110 회수 구성) −2 후보가 자기 이벤트와 정확히 2.0초 거리라 `> 2`의 경계값에서
              // **전부** 걸러졌다(체인14 실측: 1/14·1/15·2/19 세 회차 모두 −2가 목록에 0개).
              // 2초 스캔 격자에서 2초 떨어진 프레임은 다른 프레임이다 — 1.5면 재심 오프셋
              // (+1.2)과의 우발 중복만 걸러진다.
              && plan.times.every((existing) => Math.abs(existing - time) > 1.5));
          if (!rescueBudgetStopped && backoffTimes.length > 0) {
            activity.add("info", `회수 되짚기 — 1차 실패한 띠 지점의 6·2초 앞 ${backoffTimes.length}곳을 재훑기합니다(유료): ${backoffTimes.slice(0, 20).map((time) => time.toFixed(0)).join(" ")}`);
            const backVerdicts: string[] = [];
            const grab = async (time: number): Promise<Uint8Array | null> => {
              let bytes: Uint8Array | null = null;
              for (let attempt = 0; attempt < 2 && !bytes; attempt += 1) {
                const { filename } = await exportFrameToFolder(Math.max(0, time), String(dataFolder.nativePath), 480);
                bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
              }
              return bytes;
            };
            const judge = async (probes: Array<{ time: number; bytes: Uint8Array }>): Promise<Map<number, boolean>> => {
              const out = new Map<number, boolean>();
              // 장수뿐 아니라 바이트 합계로도 나눈다 — 장수로만 나눴다가 어댑터 상한에 배치가 통째로
              // 걸려 되짚기가 0건으로 끝났다(§121-b 실기: "프레임 합계가 너무 큽니다" 2회).
              const chunks = chunkVisionProbes(probes, rescueRefBytes, rescuePerBatch);
              for (const chunk of chunks) {
                try {
                  const results = await runVisionBatch(
                    `rescue-back:${chunk[0]?.time ?? 0}`,
                    chunk.length,
                    // 되짚기도 회수(추가) 경로다 — 위치 단서를 함께 켠다(§139).
                    () => rescueClient.classifyAnchorShots(
                      chunk.map((probe) => ({ bytes: probe.bytes, mimeType: "image/png" as const })),
                      rescueRefs,
                      {},
                      { anchorLeftDesk: true, seatedAtDesk: true },
                    ),
                  );
                  for (const result of results) {
                    const probe = chunk[result.index];
                    if (!probe) continue;
                    backVerdicts.push(`${probe.time.toFixed(0)}${result.isAnchor ? "→앵커" : "→비앵커"}(${result.confidence.toFixed(2)})`);
                    out.set(probe.time, result.isAnchor && result.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE);
                  }
                } catch (error) {
                  activity.add("warning", `회수 되짚기 배치 실패 — 해당 지점은 회수하지 않습니다: ${error instanceof Error ? error.message : String(error)}`);
                  // 한도 도달이면 남은 청크도 같은 결과다(§110-c, 안정화 감사 #4) — 실패 호출을
                  // 계속 내면 그 지점들이 "한도 때문"이 아니라 "그냥 회수 안 됨"으로 위장된다.
                  if (error instanceof Error && error.message.includes("한도")) {
                    activity.add("warning", "AI 일일 한도 도달 — 남은 되짚기 지점을 중단합니다.");
                    break;
                  }
                }
              }
              return out;
            };
            const backProbes: Array<{ time: number; bytes: Uint8Array }> = [];
            for (const [backIndex, time] of backoffTimes.entries()) {
              setText("busy-message", `회수 되짚기 ${backIndex + 1}/${backoffTimes.length}…`);
              const bytes = await grab(time);
              if (bytes) backProbes.push({ time, bytes });
            }
            const backHits = await judge(backProbes);
            // 연속성 판정 — 직전 시작과 60초 이내면 중간점을 한 장 더 봐서 같은 블록인지 가른다.
            // 60초: 실측 최장 앵커 블록이 40초 안쪽이라 그보다 멀면 물어볼 필요가 없다(프레임 절약).
            // owner(되짚기 발견 시각)마다 독립 항목으로 담는다 — mid로 Map 키를 잡으면 두 owner가
            // 같은 0.25초 버킷으로 양자화될 때(근접 띠 이벤트에서 backoffTimes가 <0.25초로 붙는 경우)
            // 뒤 owner가 앞 owner를 덮어 연속성 판정이 조용히 한 건 사라졌다(에러경계 감사 2026-08-11).
            // 근접 owner는 아래 ±8초 병합이 어차피 걷으므로 둘 다 평가해도 FP가 늘지 않는다.
            const midChecks: Array<{ mid: number; owner: number }> = [];
            for (const [time, isAnchor] of backHits) {
              if (!isAnchor) continue;
              const starts = [...verified, ...found].filter((start) => start < time).sort((a, b) => b - a);
              const prev = starts[0];
              if (prev === undefined || time - prev >= 60) { backAccepted.push(time); continue; }
              midChecks.push({ mid: Math.round((prev + time) / 2 * 4) / 4, owner: time });
            }
            if (midChecks.length > 0) {
              setText("busy-message", `회수 되짚기 · 연속성 확인 ${midChecks.length}곳…`);
              const midProbes: Array<{ time: number; bytes: Uint8Array }> = [];
              // 같은 mid는 한 번만 내보낸다(양자화 충돌 시 중복 프레임 방지) — 판정은 mid로 조회한다.
              const grabbedMids = new Set<number>();
              for (const { mid } of midChecks) {
                if (grabbedMids.has(mid)) continue;
                grabbedMids.add(mid);
                const bytes = await grab(mid);
                if (bytes) midProbes.push({ time: mid, bytes });
              }
              const midHits = await judge(midProbes);
              // 카드 확인도 한도를 존중한다 — 도달 후 남은 중간점마다 실패 호출을 반복하면
              // 그 지점들이 "카드 아님"으로 위장된다(안정화 감사, §110-c와 같은 부류).
              let cardBudgetStopped = false;
              for (const { mid, owner } of midChecks) {
                // 중간점 판정을 못 받았으면(내보내기·응답 유실) 보수적으로 버린다 — 되짚기 FP가
                // §121-c의 실패 모드였으므로 불확실할 때는 추가하지 않는 쪽이 맞다.
                if (midHits.get(mid) === false) backAccepted.push(owner);
                // §173 3형 카드 확인 — 연속성 기각(중간점도 앵커 = 같은 앵커 블록)은 §125 3형의
                // 서명이기도 하다: 앵커 단신이 흘러가다 **전면 인용 카드에서 끝나는** 경우, 되짚기
                // -6/-2초 지점은 앵커·중간점도 앵커라 기각되지만 진짜 경계는 띠 이벤트 원 지점
                // (카드 시작)이다. 6/23 실측: 196·200 앵커(0.99) → 연속성 기각 → FN 202.0.
                // 원 지점(owner+6 ≈ 띠 이벤트)이 "전면 인용 카드"면 3형 규칙(카드 직행은 별도
                // 아이템)대로 그 지점을 경계로 채택한다. 성금·캠페인 카드(명단)는 프롬프트가
                // false로 갈라 §138의 성금 구조를 침범하지 않는다. 판정 실패는 보수 기각.
                else if (midHits.get(mid) === true && !cardBudgetStopped) {
                  const cardTime = Math.round((owner + 6.0) * 10) / 10;
                  try {
                    const cardBytes = await grab(cardTime + 0.8);
                    if (cardBytes) {
                      // runVisionBatch 경유 — 직접 호출하면 일일 한도·비용 집계 밖이라
                      // "한도" 에러를 받을 수조차 없다(안정화 감사).
                      const cardVotes = await runVisionBatch(
                        `rescue-card:${cardTime}`,
                        1,
                        () => rescueClient.classifyAnchorShots(
                          [{ bytes: cardBytes, mimeType: "image/png" as const }],
                          [],
                          {},
                          { quoteCardOnly: true },
                        ),
                      );
                      const cardVote = cardVotes[0];
                      if (cardVote && cardVote.isAnchor && cardVote.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE) {
                        activity.add("info", `3형 카드 경계 채택 ${cardTime.toFixed(1)} — 앵커 단신이 전면 인용 카드로 끝남(§173)`);
                        backAccepted.push(cardTime);
                      } else {
                        activity.add("info", `3형 카드 확인 ${cardTime.toFixed(1)}: ${cardVote ? `카드 아님(${cardVote.confidence.toFixed(2)})` : "판정 유실"} → 기각`);
                      }
                    } else {
                      activity.add("info", `3형 카드 확인 ${cardTime.toFixed(1)}: 프레임 내보내기 유실 → 기각(판정 아님)`);
                    }
                  } catch (error) {
                    // 카드 확인 실패는 기각 유지 — 회수는 추가라 불확실하면 안 늘린다(§121-c).
                    // 다만 실패를 무성으로 삼키면 "카드 아님"과 구별할 수 없다(안정화 감사).
                    const message = error instanceof Error ? error.message : String(error);
                    activity.add("warning", `3형 카드 확인 ${cardTime.toFixed(1)} 실패(${message}) — 기각 유지.`);
                    if (message.includes("한도")) {
                      activity.add("warning", "AI 일일 한도 도달 — 남은 3형 카드 확인을 중단합니다.");
                      cardBudgetStopped = true;
                    }
                  }
                }
              }
            }
            if (backVerdicts.length > 0) {
              activity.add("info", `회수 되짚기 판정: ${backVerdicts.slice(0, 40).join(" ")}${backVerdicts.length > 40 ? " …" : ""}`);
            }
            activity.add("info", `회수 되짚기 · 앵커 ${[...backHits.values()].filter(Boolean).length}건 중 연속성 통과 ${backAccepted.length}건`);
          }
          // 훑기 격자(10s)라 경계보다 최대 그만큼 뒤다. 재스냅이 뒤로 36초를 훑으므로 그대로 넘긴다.
          // 병합 전 목록 — §170-d에서 "검증을 통과한 경계"와 "회수로 들어온 경계"를 가르는 기준이 된다.
          const verifiedBeforeRescue = [...verified];
          const merged = [...verified];
          for (const time of [...found, ...backAccepted].sort((a, b) => a - b)) {
            let nearest: number | null = null;
            for (const existing of merged) {
              if (nearest === null || Math.abs(existing - time) < Math.abs(nearest - time)) nearest = existing;
            }
            if (nearest === null) { merged.push(time); continue; }
            const gap = Math.abs(nearest - time);
            // 허용오차(±8s) 안이면 같은 경계다 — 더 볼 것 없다.
            if (gap <= 8) continue;
            if (gap > 20) { merged.push(time); continue; }
            // 8~20초는 갈림길이다(§138). 이전에는 20초 안이면 무조건 버렸는데, 그 규칙이
            // **성금 나눔 캠페인 구조**를 통째로 삼켰다 — 짧은 앵커 리드 → 전면 카드 → 앵커 복귀가
            // 13~16초 간격이라 두 번째 앵커가 언제나 폐기됐다(1/28 702·1/06 809·1/14 716 실측).
            // 두 앵커 사이가 끊겼는지를 중간점으로 가른다(§123과 같은 착상). 실측 마진 5배:
            // 같은 블록 중복 0.002~0.050, 진짜 다음 아이템 0.270~0.367.
            const base = await grabGrid(nearest + 0.5);
            const mid = await grabGrid(Math.round(((nearest + time) / 2) * 10) / 10);
            // 못 재면 예전 동작(폐기)을 따른다 — 회수는 추가라 못 재는 쪽에서 늘리지 않는다.
            const sameBlock = base === null || mid === null ? true : isSameShotGrid(base, mid);
            if (!sameBlock) merged.push(time);
          }
          merged.sort((a, b) => a - b);
          if (merged.length > verified.length) {
            activity.add("info", `학습 범위 밖 회수 · 경계 ${merged.length - verified.length}개 추가 → 앵커 ${merged.length}개`);
            activity.add("info", `회수 시각: ${merged.filter((time) => !verified.includes(time)).map((time) => time.toFixed(1)).join(" ")}`);
            verified = merged;
          } else {
            activity.add("info", "학습 범위 밖 회수 · 추가 경계 없음");
          }

          // §168-c 칼럼 시작점 회수 — §168-b가 "서 있는 진행자"를 일괄 배제하면서 데스크 칼럼의
          // FP는 사라졌지만 **시작점도 함께 잃었다**(7/29 294.3). 배제된 후보에만 세 번째 질문
          // ("스튜디오 안에서 서서 진행하는가")을 던져, 한 블록의 **첫 등장만** 되살린다.
          // 두 번째 이후는 같은 칼럼의 연속이므로 살리지 않는다 — 그게 FP의 원인이었다.
          // §170 칼럼 회수는 두 프로그램 공용이다 — 모닝와이드 7/30에도 같은 구조의
          // 「데스크 칼럼」(보도국장이 대형 스크린 앞에 서서 235초 진행)이 실재한다.
          if (visionRejectedTimes.length > 0) {
            try {
              const grabStanding = async (time: number): Promise<Uint8Array | null> => {
                // 내보내기 재시도(§121-b와 동일) — 중간점 확인(§172 미해결 등재)이 이 헬퍼에 걸리므로
                // 1회 유실이 채택/기각을 가르면 안 된다.
                let bytes: Uint8Array | null = null;
                for (let attempt = 0; attempt < 2 && !bytes; attempt += 1) {
                  const { filename } = await exportFrameToFolder(Math.max(0, time), String(dataFolder.nativePath), 480);
                  bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
                }
                return bytes;
              };
              // §191 — 칼럼 회수도 **본 검증과 같은 3프레임**으로 판정한다. 종전에는 시각당
              // +1.2 한 장만 봤는데, 그 한 장이 타이트한 크롭이면 착석 여부가 보이지 않아
              // 대담 코너의 앉은 게스트를 칼럼 진행자로 되살렸다(7/31 353.8 — 본 검증이
              // 3/3 비앵커로 제대로 배제한 것을 1표가 뒤집었다). 같은 샷의 +4·+7에서는
              // 데스크와 마이크가 드러나고 361초엔 진행자가 중앙에 앉아 있다. 지시 문구를
              // 조이는 것으로는 못 막았다(§191 1차) — §170-d와 같이 구조로 막는다.
              const standingProbes: Array<{ time: number; bytes: Uint8Array }> = [];
              let standingTimeCount = 0;
              for (const time of visionRejectedTimes) {
                if (verified.some((start) => Math.abs(start - time) <= 8)) continue;
                standingTimeCount += 1;
                setText("busy-message", `칼럼 시작 확인 ${standingTimeCount}/${visionRejectedTimes.length}…`);
                for (const offset of STANDING_PROBE_OFFSETS) {
                  const bytes = await grabStanding(time + offset);
                  if (bytes) standingProbes.push({ time, bytes });
                }
              }
              if (standingProbes.length > 0) {
                // 참조 프레임은 보내지 않는다 — 질문이 "앵커인가"가 아니라 "서서 진행하는가"라
                // 앵커 예시가 판단에 도움이 안 되고, 합계 1.2MB 상한만 밀어 올려 호출이 통째로
                // 실패했다(§168-c 1차 실측: "프레임 합계가 너무 큽니다"로 경로 미실행).
                // 같은 이유로 4장씩 나눠 보낸다.
                const standingHits: Array<{ probeIndex: number; isAnchor: boolean; confidence: number }> = [];
                for (let offset = 0; offset < standingProbes.length; offset += 4) {
                  const chunk = standingProbes.slice(offset, offset + 4);
                  // runVisionBatch 경유 — 직접 호출하면 이 유료 호출이 일일 한도·비용 집계
                  // 밖에 놓여 "한도" 에러를 받을 수조차 없다(안정화 감사). 다른 비전 경로 5곳과
                  // 같은 규약으로 맞춘다.
                  const chunkResults = await busy.during(
                    `칼럼 시작 확인 ${offset + 1}~${offset + chunk.length}/${standingProbes.length}(유료)…`,
                    () => runVisionBatch(
                      `rescue-standing:${chunk[0]?.time ?? 0}`,
                      chunk.length,
                      () => rescueClient.classifyAnchorShots(
                        chunk.map((probe) => ({ bytes: probe.bytes, mimeType: "image/png" as const })),
                        [],
                        {},
                        { standingPresenterOnly: true },
                      ),
                    ),
                  );
                  for (const result of chunkResults) {
                    standingHits.push({ probeIndex: offset + result.index, isAnchor: result.isAnchor, confidence: result.confidence });
                  }
                }
                const results = standingHits.map((hit) => ({ index: hit.probeIndex, isAnchor: hit.isAnchor, confidence: hit.confidence }));
                // §191 — 시각별로 표를 모아 다수결로 판정한다. 판정된 프레임이 2장 미만이면
                // 되살리지 않는다: 회수는 **추가** 경로라 오검출이 곧 과분할이므로 닫히는
                // 쪽으로 실패해야 한다(§137). 프레임 유실은 §190-e·f 재기동 처방 뒤 0.5% 미만이다.
                const standingVotes = new Map<number, { yes: number; total: number; marks: string[] }>();
                for (const result of results) {
                  const probe = standingProbes[result.index];
                  if (!probe) continue;
                  const tally = standingVotes.get(probe.time) ?? { yes: 0, total: 0, marks: [] };
                  tally.total += 1;
                  const accepted = result.isAnchor && result.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE;
                  if (accepted) tally.yes += 1;
                  // 확신도까지 남긴다 — 2/3과 3/3을 가른 것이 무엇이었는지는 개수만으로는 못 본다.
                  tally.marks.push(`${result.isAnchor ? "칼럼" : "아님"}(${result.confidence.toFixed(2)})`);
                  standingVotes.set(probe.time, tally);
                }
                // 호출이 무엇을 보고 무엇을 골랐는지 남긴다 — 회수 경로 검증 2원칙의 첫째다.
                if (standingVotes.size > 0) {
                  const detail = [...standingVotes.entries()]
                    .sort((a, b) => a[0] - b[0])
                    .map(([time, tally]) => `${time.toFixed(0)}s ${tally.yes}/${tally.total} [${tally.marks.join(" ")}]`)
                    .join(" · ");
                  activity.add("info", `칼럼 판정 표 상세: ${detail}`);
                }
                const standingStarts: number[] = [];
                for (const [time, tally] of [...standingVotes.entries()].sort((a, b) => a[0] - b[0])) {
                  // §191 3차 — 과반이 아니라 **만장일치**다. 2차 실측이 경계를 그어 줬다:
                  // 진짜 칼럼 시작 4건(7/30 336·350, 8뉴스 7/29 296·334)은 전부 3/3이었고,
                  // 오검출(7/31 354 대담 게스트)만 2/3이었다. 참 음성은 0/3이다. 본 검증의
                  // 배제 확신도는 참·거짓이 똑같이 0.97~0.99라 거기엔 구별 신호가 없다.
                  // 판정된 프레임 기준 만장일치라 프레임 유실(2/2)은 통과하고 이견만 막는다.
                  if (tally.total < 2 || tally.yes !== tally.total) continue;
                  // 블록의 첫 등장만 — 이미 채택한 칼럼 시작과 60초 안이면 같은 칼럼의 연속이다.
                  // 앞선 확정 경계와의 거리로는 거르지 않는다(§168-c 2차 실측): 칼럼 시작은 직전
                  // 아이템 경계 60초 안에 올 수 있어, 그 규칙이 표적 296.0을 죽이고 대신 연속 지점
                  // 334.0을 통과시켜 F1을 96.0 → 92.3으로 떨어뜨렸다. 확정 경계와의 ±8초 중복은
                  // 프레임 수집 단계에서 이미 걸러진다.
                  const nearStanding = standingStarts.some((start) => time - start <= 60 && time > start);
                  if (nearStanding) continue;
                  // 알려진 공백(§172 미해결 등재) — 칼럼이 **직전 확정 경계에서 이미 시작**된 경우, 그
                  // 중간의 서 있는 진행자를 새 시작으로 오인하는 FP는 여기서 방어되지 않는다
                  // (6/29 실측: 칼럼 579~866.8의 중간 820 → FP 819, 8실행 중 5회). 시각 판별
                  // 4종(중간점·시작부 1점/2점·동일 코너 비교)을 전부 시도했으나 실패해 원복했다
                  // — 근거와 재개 조건(구조 단서 확보 시)은 런북 §172 미해결 등재. 여기에 판별 코드를
                  // 다시 넣기 전에 그 절부터 읽을 것.
                  standingStarts.push(time);
                }
                if (standingStarts.length > 0) {
                  activity.add("info", `칼럼 시작 회수 · ${standingStarts.length}건: ${standingStarts.map((time) => time.toFixed(1)).join(" ")}`);
                  // §170-d 칼럼은 통째로 하나 — 판정·근거는 columnMidRescueDrops 주석 참조.
                  const dropped = columnMidRescueDrops(standingStarts, verifiedBeforeRescue, verified);
                  if (dropped.length > 0) {
                    activity.add("info", `칼럼 중간 회수 폐기 · ${dropped.length}건: ${dropped.map((time) => time.toFixed(1)).join(" ")}`);
                  }
                  verified = [...verified.filter((time) => !dropped.includes(time)), ...standingStarts].sort((a, b) => a - b);
                } else {
                  activity.add("info", `칼럼 시작 확인 · ${standingVotes.size}곳 모두 해당 없음`);
                }
              }
            } catch (error) {
              activity.add("warning", `칼럼 시작 확인 실패 — 건너뜁니다: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      } catch (error) {
        activity.add("warning", `학습 범위 밖 회수 실패 — 기존 결과로 진행: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // 하단 띠 검사(무료) — 인용·이름표 띠(흰 띠는 있는데 큰 헤드라인 글자 없음)가 +2s·+4s
    // 양쪽에서 감지되면 발언·회견 샷 오검출로 배제한다(anchor-lowerthird-band.plan.md).
    // 오프닝 직후는 띠가 늦게 떠서 첫 후보는 면제. 프레임 확보 실패 후보는 그대로 통과.
    //
    // §149 — **비전 ON에서는 통째로 끈다.** 이 필터가 비전 경로에서 진짜 앵커를 지운 실측이
    // 3건(1/28 687 · 2/19 560 · 1/06 796 — 짧은 리드 프로브 이탈·데스크 잡동사니 가짜 2줄
    // 등 띠 기하의 원리적 한계)이고, 옳게 지우던 발언·대담 FP는 이제 §139 위치 단서가 회수
    // 판정 단계에서 잡는다(체인14 실증: 4/09·3/18 FP 전멸). 비전 OFF(무료 경로)에서는 검증이
    // 없으므로 이 필터가 여전히 발언 샷 FP의 유일한 방어라 유지한다.
    if (verified.length > 1 && !visionEnabled) {
      const probeQuoteBand = async (time: number): Promise<boolean | null> => {
        try {
          // 480px 유지 — 960px 실험(§141-c)은 기각됐다: 밀집 인용문은 540p에서도 한 덩어리
          // (51~63행)로 읽혀 못 잡고, 진짜 앵커 오판만 1건 늘었다(1/28 232.4). 밀집 인용
          // FP의 판별자는 띠가 아니라 §139 위치 단서다(회수 경로 전용 프롬프트).
          // 내보내기 재시도(§121-b와 동일, §182 감사 #11) — 무료 경로의 유일한 FP 방어라
          // 1회 유실이 판정 표를 조용히 줄이면 안 된다.
          let bytes: Uint8Array | null = null;
          for (let attempt = 0; attempt < 2 && !bytes; attempt += 1) {
            const { filename } = await exportFrameToFolder(time, String(dataFolder.nativePath), 480, undefined, "bmp");
            bytes = await readExportedFrameBytes(dataFolder, api.formats, filename);
          }
          const bmp = bytes ? parseBmp24(bytes) : null;
          return bmp ? isQuoteBandStats(lowerThirdRowStats(bmp), bmp.height) : null;
        } catch {
          return null;
        }
      };
      const kept: number[] = [verified[0]!];
      const rejected: number[] = [];
      // 인용 띠 기하(§141)는 8뉴스 실측 — 모닝와이드 무료 경로는 필터 없이 전원 유지한다(P5 재실측 전).
      const bandCheckTargets = program === "news8" ? verified.slice(1) : [];
      if (program !== "news8") kept.push(...verified.slice(1));
      for (const [checkIndex, time] of bandCheckTargets.entries()) {
        setText("busy-message", `하단 띠 검사 ${checkIndex + 1}/${verified.length - 1}…`);
        // 프로브가 후보와 같은 샷일 때만 그 판정을 믿는다(§135) — 앵커 리드가 4초보다 짧으면
        // +2s·+4s가 **다음 꼭지**에 떨어져 그 화면의 잔글씨를 인용 띠로 오인한다. 1/28 687이
        // 그렇게 지워졌다(성금 카드 계좌번호를 이름표 띠로 판정, 격자 거리 0.38 — 진짜 앵커는 0.06 이하).
        // 두 프로브 모두 같은 샷일 것을 요구하면 필터가 너무 무뎌진다(1/28 428은 +4s만 샷을
        // 벗어나는데 그 때문에 발언 샷 FP가 살아남았다) — **같은 샷인 프로브의 표만** 세고,
        // 표가 하나도 없으면 배제하지 않는다.
        const base = await grabGrid(time + 0.5);
        const votes: boolean[] = [];
        for (const offset of [2, 4]) {
          if (!isSameShotGrid(base, await grabGrid(time + offset))) continue;
          const verdict = await probeQuoteBand(time + offset);
          if (verdict !== null) votes.push(verdict);
        }
        if (votes.length > 0 && votes.every((vote) => vote)) rejected.push(time);
        else kept.push(time);
      }
      // 안전망 문턱 3은 의도적 분기다(§182 감사 #8) — 비전 경로는 §124에서 1로 내렸지만
      // 그쪽은 4프레임 검증이 오배제를 걸러 준다. 무료 경로는 이 필터가 유일한 방어라
      // 검증 없이 대량 배제되면 확인할 길이 없으므로 §92 당시의 보수 문턱을 유지한다.
      if (rejected.length > 0 && kept.length >= 3) {
        verified = kept;
        // 배제 시각을 반드시 남긴다(§134) — 개수만 남기면 이 필터가 진짜 앵커를 지워도
        // 사후 판독으로 알 수 없다(1/28 687 실측: 헤드라인 띠를 인용 띠로 오인해 TP 1개 소실).
        activity.add("info", `하단 띠 검사 · 인용·이름표 띠 ${rejected.length}건 배제 → 앵커 ${verified.length}개 (배제 ${rejected.map((time) => time.toFixed(1)).join(" ")})`);
      } else if (rejected.length > 0) {
        // 해제 시에도 의심 시각을 남긴다(§134·§182 감사 #9) — 채택 분기와 같은 이유.
        activity.add("warning", `하단 띠 검사 · 배제 후보 ${rejected.length}건이 있으나 잔여 ${kept.length}개(<3)라 필터를 해제합니다 (의심 ${rejected.map((time) => time.toFixed(1)).join(" ")})`);
      }
    }
    // 2/4 경계 정밀 재스냅(인점 = 전환 컷 정확히, §61)
    // §148 — 재스냅을 아이템 구성 **앞**에 한다. 회수·되짚기 시각은 격자·이벤트 지연으로
    // 진짜 컷보다 최대 6초 늦어, 구성-후-재스냅 순서에서는 최소 길이 병합(§148-b 12s)이
    // 재스냅 전의 인위로 짧아진 간격으로 판정된다(1/15 실측: 진짜 16.9s 아이템이 pre-snap
    // 13.5s로 읽혀 839.2 경계가 병합·소실).
    setNewsCutStep(3);
    const bounds = [...[...new Set(verified)].sort((a, b) => a - b), tailStart ?? duration];
    const refined: number[] = [];
    for (const [index, bound] of bounds.entries()) {
      const percent = Math.round((index / Math.max(1, bounds.length)) * 100);
      throwIfNewsCutCancelled();
      setText("busy-message", `2/4 경계 재스냅 ${index + 1}/${bounds.length} · ${percent}%`);
      busy.progress(percent);
      refined.push(await refineBoundaryToTransition(grabGrid, bound));
    }
    if (gridFailureTimes.length > 0) {
      // 재스냅은 격자를 못 얻은 시각을 "정착과 상이"로 읽는다 — 그 경계는 되돌려지지 않았을 수 있다.
      activity.add("warning", `격자 확보 실패 ${gridFailureTimes.length}건 — 해당 경계는 재스냅이 불완전할 수 있습니다: ${gridFailureTimes.slice(0, 12).map((time) => time.toFixed(2)).join(" ")}`);
    }
    if (tailStart !== null) {
      activity.add("info", `원클릭 분할 · 아웃트로(구독 범퍼) ${Math.round(refined.at(-1)! * 10) / 10}s부터 제외`);
    }
    const rawItems = buildItemsFromStarts(refined.slice(0, -1), refined.at(-1)!);
    if (rawItems.length === 0) throw new Error("보도 아이템을 구성하지 못했습니다.");
    return rawItems.filter((item) => item.end - item.start > 1);
  });

  newsCutItems = items;
  newsCutCreatedNames = [];
  newsCutCreatedGuids = [];
  renderNewsCutList();
  if (items.length === 0) throw new Error("보도 아이템을 만들지 못했습니다.");
  activity.add("success", `원클릭 분할 · 화면 분석 아이템 ${items.length}개`);
  // 최종 경계를 반드시 기록한다(§134) — 개수만 남기면 사후 채점이 후보·회수 로그를 재구성하는
  // 근사치가 되고, 그 값은 띠 필터·재스냅 **이전**이라 실제 산출물과 다르다(2026-07-29 실측:
  // 4/09를 90.9로 적었으나 실제는 95.2, 1/28은 83.9가 아니라 82.8이었다).
  activity.add("info", `최종 아이템 시작: ${items.map((item) => item.start.toFixed(1)).join(" ")}`);
  // 시퀀스 생성 직전이 마지막 취소 지점 — 생성이 시작되면 완주가 더 안전하다(부분 산출물 방지).
  throwIfNewsCutCancelled();
  setNewsCutStep(4);
  await handleNewsCutCreate();
  if (newsCutCreatedNames.length === 0) {
    throw new Error("아이템 시퀀스가 만들어지지 않았습니다.");
  }
  if (!exportAfter) {
    activity.add("success", `분할 완료 — 시퀀스 ${newsCutCreatedNames.length}개 생성(내보내기 생략). 검토 후 '일괄 내보내기'를 누르세요.`);
    toast("분할이 끝났습니다. '일괄 내보내기'로 내보낼 수 있습니다.", "success", 6000);
    return;
  }
  // 내보내기 단계 실패는 분할 실패가 아니다(§183 감사 #5) — 시퀀스는 이미 생성돼 있고
  // '일괄 내보내기'로 이어갈 수 있는데, 종전에는 "원클릭 분할 실패"로만 보고돼 성공한
  // 분할이 실패로 읽혔다(프리셋 부재·폴더 문제 실측 유형).
  try {
    const targets = await resolveNewsCutExportTargets();
    setNewsCutStep(5);
    await exportNewsSequencesWith(targets.presetFile, targets.outputFolder);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    activity.add("warning", `분할은 완료됐으나 내보내기 단계에서 실패했습니다 — 시퀀스 ${newsCutCreatedNames.length}개는 생성돼 있어 '일괄 내보내기'로 이어갈 수 있습니다: ${message}`);
    toast("분할 완료 · 내보내기 실패 — 설정 확인 후 '일괄 내보내기'를 누르세요.", "warning", 8000);
    return;
  }
  activity.add("success", "원클릭 분할 완료 — 출력 폴더를 확인하세요.");
}

// 원클릭 분할 취소(UX 감사 C-1) — busy 오버레이의 '분할 취소' 버튼이 토큰을 세우면 다음 검사
// 지점(스캔 프레임·비전 후보·회수 훑기·재스냅 경계·시퀀스 생성 직전)에서 예외로 중단한다.
// 원본은 비파괴라 잃는 것이 없고, 유료 비전 호출도 다음 후보 경계에서 멈춘다.
let newsCutCancel: { cancelled: boolean } | null = null;

function throwIfNewsCutCancelled(): void {
  if (newsCutCancel?.cancelled) throw new Error("사용자가 분할을 취소했습니다.");
}

// 분할 실행 중 4개 분할 버튼을 잠근다(재진입 시각 신호) — DOM 결손엔 무해.
function setNewsCutButtonsDisabled(disabled: boolean): void {
  for (const id of ["news-cut-auto-btn", "news-cut-split-btn", "news-cut-mw-auto-btn", "news-cut-mw-split-btn"]) {
    const btn = optionalElement<HTMLButtonElement>(id);
    if (btn) btn.disabled = disabled;
  }
}

async function runNewsCutAutoFlowCancellable(exportAfter: boolean, program: NewsCutProgram = "news8"): Promise<void> {
  // 재진입 가드(2026-08-19 사용자 사고) — 분할이 도는 중에 버튼을 다시 누르면 두 번째 흐름이
  // newsCutCancel을 덮어써, 동시에 여러 개가 유료로 돌고(로그 실측: 3중 실행) 서로 프레임
  // 내보내기 자원을 뺏어 스캔이 8분 넘게 걸렸다. 이미 실행 중이면 새로 시작하지 않는다.
  if (newsCutCancel) {
    toast("이미 분할이 진행 중입니다 — 끝날 때까지 기다려 주세요(진행 상황은 오버레이에 표시됩니다).", "warning", 5000);
    return;
  }
  newsCutCancel = { cancelled: false };
  setNewsCutButtonsDisabled(true);
  const cancelButton = optionalElement<HTMLButtonElement>("busy-cancel-btn");
  if (cancelButton) {
    cancelButton.hidden = false;
    cancelButton.disabled = false;
    cancelButton.textContent = "분할 취소";
  }
  try {
    // 오버레이를 클릭 즉시 띄운다(사용자 사고) — 선검증(시퀀스 상태·큐시트·데이터 폴더) 구간이
    // 첫 busy.during 밖이라 그동안 화면에 아무 표시가 없어 "멈춘 줄" 오해를 샀다. 바깥 during이
    // 깊이를 1로 유지해 단계 사이 오버레이 깜빡임도 없앤다(BusyState는 깊이 0에서만 숨긴다).
    await busy.during("분할 준비 중…", () => runNewsCutAutoFlow(exportAfter, program));
  } finally {
    newsCutCancel = null;
    setNewsCutButtonsDisabled(false);
    if (cancelButton) cancelButton.hidden = true;
  }
}

async function handleNewsCutAuto(): Promise<void> {
  await runNewsCutAutoFlowCancellable(true);
}

async function handleNewsCutSplitOnly(): Promise<void> {
  await runNewsCutAutoFlowCancellable(false);
}

async function handleMorningCutAuto(): Promise<void> {
  await runNewsCutAutoFlowCancellable(true, "morningwide");
}

async function handleMorningCutSplitOnly(): Promise<void> {
  await runNewsCutAutoFlowCancellable(false, "morningwide");
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
  activity.add("success", `썸네일 이미지 저장: ${outputPath}`);
  toast("현재 프레임 썸네일을 저장했습니다.", "success");
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
  let data: unknown;
  try {
    data = await fileEntry.read({ format: formats?.binary });
  } finally {
    // 내보낸 WAV는 메모리로 읽고 나면 쓸모가 없다 — 지우지 않으면 회차마다 ~30MB가
    // 플러그인 데이터 폴더에 영구 누적된다(§167 실측: 하루 배치로 2.8GB). 읽기 실패
    // 경로에서도 남기지 않도록 finally에서 지운다. 삭제 실패는 무시(다음 실행에 재시도).
    try { await fileEntry.delete(); } catch { /* 임시 파일 삭제 실패는 무시 */ }
  }
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

/**
 * 오디오 사인오프 창 하나를 STT한다(§152) — `whisper-1`만 쓴다.
 *
 * 세그먼트 타임스탬프가 필요하고(verbose_json), 창이 12초뿐이라 diarize 계열의 이점이 없다.
 * 신규 네트워크 코드를 만들지 않고 기존 SpeechApiClient·secureStorage 경로를 그대로 쓴다.
 */
async function runSignoffStt(clip: Uint8Array, windowBegin: number): Promise<TranscriptSegment[]> {
  const client = new SpeechApiClient({ endpoint: settings.aiEndpoint });
  const request = {
    bytes: clip,
    filename: `signoff_${Math.round(windowBegin)}.wav`,
    mimeType: "audio/wav",
    model: "whisper-1" as const,
    language: "ko",
  };
  const result = aiQueueController
    ? await aiQueueController.run("stt", {
      model: request.model,
      window: Math.round(windowBegin),
      bytes: clip.byteLength,
    }, () => client.transcribe(request), { estimateUnits: 1, cacheTtlMs: 0 })
    : await client.transcribe(request);
  return result.segments;
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
  bind("news-thumb-lightbox", "click", () => {
    const overlay = optionalElement<HTMLElement>("news-thumb-lightbox");
    if (overlay) overlay.hidden = true;
  });
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const overlay = optionalElement<HTMLElement>("news-thumb-lightbox");
    if (overlay && !overlay.hidden) overlay.hidden = true;
  });
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
  bind("news-cut-mw-auto-btn", "click", guarded(handleMorningCutAuto, "모닝와이드 원클릭 분할 실패"));
  bind("news-cut-mw-split-btn", "click", guarded(handleMorningCutSplitOnly, "모닝와이드 분할 실패"));
  bind("news-cut-cuesheet-btn", "click", guarded(handleNewsCutCueSheet, "큐시트 읽기 실패"));
  bind("news-cut-analyze-btn", "click", guarded(handleNewsCutAnalyze, "뉴스 분할 분석 실패"));
  bind("news-cut-create-btn", "click", guarded(handleNewsCutCreate, "뉴스 분할 시퀀스 생성 실패"));
  bind("news-cut-export-btn", "click", guarded(handleNewsCutExport, "뉴스 분할 내보내기 실패"));
  // 분할 취소(UX 감사 C-1) — 토큰만 세우고, 실제 중단은 흐름 안의 검사 지점이 수행한다.
  bind("busy-cancel-btn", "click", () => {
    if (!newsCutCancel) return;
    newsCutCancel.cancelled = true;
    const cancelButton = optionalElement<HTMLButtonElement>("busy-cancel-btn");
    if (cancelButton) {
      cancelButton.disabled = true;
      cancelButton.textContent = "취소 중…";
    }
    setText("busy-message", "취소 중 — 현재 단계에서 멈춥니다…");
  });
  // 첫 실행 배너의 'AI 설정 열기' — 키·동의가 있는 탭으로 바로 이동한다(UX 감사 A-2).
  bind("newscut-setup-open-btn", "click", () => {
    document.querySelector<HTMLButtonElement>('.nav-tab[data-tab="ai-settings"]')?.click();
  });
  // 동의 토글이 바뀌면 배너 상태를 즉시 갱신한다.
  bind("ai-consent-checkbox", "change", () => {
    void refreshNewsCutSetupBanner();
  });
  bind("news-cut-cleanup-btn", "click", guarded(handleNewsCutCleanup, "뉴스 분할 아이템 정리 실패"));
  bind("news-cut-folder-btn", "click", guarded(handleChooseOutput, "내보내기 폴더 선택 실패"));
  bind("license-apply-btn", "click", handleLicenseApply);
  bind("learn-clear-btn", "click", guarded(async () => handleLearnClear(), "학습 초기화 실패"));
  bind("scan-markers-btn", "click", guarded(() => markersQcPanel.scanMarkers(), "마커 검색 실패"));
  bind("batch-create-btn", "click", guarded(() => markersQcPanel.batchCreate(), "일괄 생성 실패"));
  bind("add-story-markers-btn", "click", guarded(() => markersQcPanel.addStoryMarkers(), "스토리 마커 추가 실패"));
  bind("duck-plan-btn", "click", guarded(handleDuckPlan, "BGM 덕킹 계획 실패"));
  bind("choose-preset-btn", "click", guarded(handleChoosePreset, "프리셋 선택 실패"));
  bind("choose-output-btn", "click", guarded(handleChooseOutput, "내보내기 폴더 선택 실패"));
  bind("choose-mogrt-btn", "click", guarded(handleChooseMogrt, "MOGRT 선택 실패"));
  bind("insert-mogrt-btn", "click", guarded(handleInsertMogrt, "MOGRT 삽입 실패"));
  bind("export-video-btn", "click", guarded(handleExportVideo, "영상 내보내기 실패"));
  bind("export-cover-btn", "click", guarded(handleExportCover, "썸네일 저장 실패"));
  bind("stt-from-sequence-btn", "click", guarded(transcribeActiveSequence, "시퀀스 자막 생성 실패"));
  bind("motion-apply-btn", "click", guarded(handleApplyClipMotion, "클립 모션 적용 실패"));
  bind("choose-asset-root-btn", "click", guarded(() => assetBrowserPanel.chooseRoot(), "에셋 폴더 선택 실패"));
  bind("open-asset-root-btn", "click", guarded(() => assetBrowserPanel.openRoot(), "에셋 폴더 열기 실패"));
  bind("sync-assets-btn", "click", guarded(() => assetBrowserPanel.sync(), "에셋 동기화 실패"));
  bind("asset-search-input", "input", () => assetBrowserPanel.render());
  bind("asset-type-select", "change", () => assetBrowserPanel.render());
  bind("asset-category-select", "change", () => assetBrowserPanel.render());
  bind("open-asset-category-btn", "click", guarded(() => assetBrowserPanel.openCategory(), "선택 폴더 열기 실패"));
  bind("asset-rights-save-btn", "click", guarded(handleSaveAssetRights, "에셋 권리 정보 저장 실패"));
  bind("ai-save-btn", "click", guarded(async () => {
    await aiSettingsPanel.save();
    // 키 저장 직후 뉴스 분할 탭 첫 실행 배너를 갱신한다(UX 감사 A-2).
    void refreshNewsCutSetupBanner();
  }, "AI 설정 저장 실패"));
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
  // 정상 초기화와 손상 저널 재초기화가 같은 구독을 공유한다 — 재초기화 경로만 렌더 전용
  // 콜백을 쓰면 persistence-error 고지가 빠져, 손상 저널 세션의 저장 실패가 무고지가 된다.
  const handleRecoveryEvent: Parameters<RecoveryManager["subscribe"]>[0] = (event) => {
    recoveryPanel.render();
    if (event.type === "persistence-error") {
      activity.add("warning", event.message ?? "복구 기록을 저장하지 못했습니다.");
    }
  };
  try {
    const browserStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    recoveryManager = new RecoveryManager(browserStorage ? { storage: browserStorage } : {});
    recoveryManager.subscribe(handleRecoveryEvent);
    const interrupted = await recoveryManager.restore();
    if (interrupted > 0) {
      activity.add("warning", `이전 세션에서 중단된 비파괴 작업 ${interrupted}개를 복구 목록에 표시했습니다.`);
      toast(`중단된 작업 ${interrupted}개를 확인해 주세요.`, "warning", 6200);
    }
    recoveryPanel.render();
  } catch (error) {
    // 복원 실패로 추적을 끄지 않는다(§186 감사 #15) — 종전에는 null로 두어 이후 자동 편집이
    // **저널 없이** 복제+변경을 진행했고, 손상 스토리지는 지워지지 않아 매 실행 반복됐다.
    // 손상 원문을 백업 키로 옮긴 뒤 빈 저널로 재시작해 추적을 유지한다.
    recoveryManager = null;
    try {
      const browserStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
      if (browserStorage) {
        const damaged = browserStorage.getItem(RECOVERY_STORAGE_KEY);
        if (typeof damaged === "string" && damaged) {
          browserStorage.setItem(`${RECOVERY_STORAGE_KEY}.corrupt`, damaged);
          browserStorage.removeItem(RECOVERY_STORAGE_KEY);
        }
        recoveryManager = new RecoveryManager({ storage: browserStorage });
        // 정상 경로와 같은 핸들러를 쓴다 — 재초기화 세션에서 저널 쓰기 실패(persistence-error)
        // 고지가 빠지면 손상 저널 세션이 무고지로 추적을 잃는다.
        recoveryManager.subscribe(handleRecoveryEvent);
        activity.add("warning", "복구 저널이 손상돼 백업 키(.corrupt)에 보존하고 빈 저널로 다시 시작했습니다 — 이후 작업의 복구 추적은 유지됩니다.");
      }
    } catch {
      // 재초기화까지 실패하면 추적 없이 진행하는 수밖에 없다 — 아래 오류 보고가 그 사실을 남긴다.
    }
    reportError(error, "복구 기록 초기화 실패");
  }
  try {
    automationController = new AutomationController({
      getTranscript: () => {
        return resolveAutomationTranscript(speechController?.transcript, subtitleController?.document);
      },
      // §189 #2: 적용 직전 시간 기준 대조용 시퀀스 길이. 읽기 실패는 null — 검사가 적용을
      // 막는 새 실패 지점이 되지 않게 한다(검사 불가 시 기존 동작 유지).
      getSequenceDurationSeconds: async () => {
        try {
          return (await readSequenceStatus(undefined, { includeSelection: false, includePlayerPosition: false })).sequenceEnd;
        } catch {
          return null;
        }
      },
      confirmTimeBaseMismatch: (details) => requestAutomationTimeBaseConfirmation(details),
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
            // begin() 실패 시 여기서 복제본을 지우지 않는다(§186 감사 #9) — 이 훅은
            // applyAutomationPlan의 try 안에서 불리므로 예외를 그대로 흘리면 그쪽 catch가
            // 원본 재활성화 방어까지 갖춘 정리를 한다. 종전의 사전 제거는 같은 복제본을
            // 두 번 지우게 해, 두 번째 정리 실패(AUTOMATION_CLONE_CLEANUP_FAILED)가
            // 원래 오류(begin 실패)를 가렸다.
            onClonePrepared: async ({ sourceGuid, cloneGuid, sequenceName }) => {
              if (!recoveryManager) return;
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
              // 저널이 디스크에 앉은 뒤에 변경을 진행한다(§186 감사 #6) — persist가
              // fire-and-forget이라 begin() 반환만으로는 "clone-before-mutation 기록 후 변경"
              // 불변식이 보장되지 않았다(기록 전 크래시 시 저널 무흔적).
              await recoveryManager.flushPersistence();
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
        // §189 #3(사용자 확정): STT 원본이 있는 동안 자막 편집은 자동 편집 원고를 바꾸지
        // 않는다 — 무음 컷은 물리 발화 기준이 안전하고, 편집 직후와 분석 시점의 원고가
        // 뒤집히던 요동(push 자막 → pull STT)을 없앤다. 규칙은 pull과 같은 resolve 한 곳이다.
        automationController?.setTranscript(resolveAutomationTranscript(speechController?.transcript, document));
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
        // STT 소스가 바뀌면 원고는 이미 비워진 상태다 — 자막 문서가 있으면 그쪽으로 복귀한다(§189 #3).
        automationController?.setTranscript(resolveAutomationTranscript(speechController?.transcript, subtitleController?.document ?? null));
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
        // §189 #3: 새 STT는 자막 문서 유무와 무관하게 즉시 자동 편집 원고가 된다(STT 우선).
        automationController?.setTranscript(resolveAutomationTranscript(transcript, null));
        // 타임코드 구간이 없으면 자막 문서를 만들 수 없다 — 무고지로 건너뛰지 않는다(§186-b).
        // 원고 자체는 speechController.transcript로 남아 자동 편집(getTranscript)이 쓸 수 있다.
        if (subtitleController && transcript.result.segments.length === 0) {
          activity.add("warning", "STT 원고에 타임코드 구간이 없어 자막 문서로 변환하지 않았습니다 — 원고는 자동 편집에서 사용할 수 있습니다.");
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
  // 부팅 위생·안내(운영·UX 감사) — 임시파일 잔재 회수·첫 실행 배너·지속 로그 시작. 전부 실패해도 무해.
  void sweepDataFolderTemps();
  void refreshNewsCutSetupBanner();
  void (async () => {
    try {
      const api = frameDataFolderApi();
      if (!api) return;
      const dataFolder = await api.fileSystem.getDataFolder();
      await persistentLog.init(dataFolder);
      persistentLog.start();
      // 사용자·지원자가 파일을 찾을 수 있게 정확한 위치를 로그로 남긴다(가이드가 이 줄을 안내).
      activity.add("info", `지속 로그 기록 중 — ${persistentLog.folderPath() ?? "플러그인 데이터 폴더"}\\${persistentLog.fileName()}`);
    } catch { /* 지속 로그 실패는 기능에 영향 없음 */ }
  })();
  activity.add("info", "ShortFlow Studio가 준비되었습니다.");
}

// 라이선스 게이트 — 배포(release) 빌드에서만 잠금 오버레이를 강제한다. dev 빌드는 상태 로그만.
declare const __SHORTFLOW_RELEASE__: boolean;

function licenseEnforced(): boolean {
  return typeof __SHORTFLOW_RELEASE__ !== "undefined" && __SHORTFLOW_RELEASE__ === true;
}

function readLicenseLastSeenMs(): number {
  const value = Number(localStorage.getItem(LICENSE_CLOCK_KEY));
  if (!Number.isFinite(value) || value <= 0) return 0;
  // 시계 이상(CMOS 방전·VM 복원)이 심은 비현실적 미래 스탬프는 폐기한다(운영 감사) — 이 값이
  // 남으면 시계를 올바로 되돌린 순간부터 영구 잠금이 된다. 1년+ 미래는 정상 사용에서 불가능.
  if (value > Date.now() + 365 * 86_400_000) {
    try { localStorage.removeItem(LICENSE_CLOCK_KEY); } catch { /* 제거 실패는 다음 실행에 재시도 */ }
    return 0;
  }
  return value;
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
      // 로그 한 줄로는 안 보인다(운영 감사 F5) — 만료 임박은 toast로도 알린다.
      activity.add("warning", `시리얼 키 만료까지 ${check.daysLeft}일 남았습니다 — 연장 키를 준비하세요.`);
      toast(`시리얼 키 만료까지 ${check.daysLeft}일 — 발급 담당자에게 연장 키를 요청하세요.`, "warning", 8000);
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
