import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

type Attributes = Readonly<Record<string, string>>;

interface StaticElement {
  readonly tag: string;
  readonly attributes: Attributes;
  readonly index: number;
  readonly source: string;
}

interface StaticDocument {
  readonly html: string;
  readonly elements: readonly StaticElement[];
  readonly byId: ReadonlyMap<string, readonly StaticElement[]>;
}

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_HTML_PATH = path.join(ROOT, "public", "index.html");
const PUBLIC_CSS_PATH = path.join(ROOT, "public", "styles.css");
const DIST_HTML_PATH = path.join(ROOT, "dist", "index.html");
const DIST_CSS_PATH = path.join(ROOT, "dist", "styles.css");

const LABELABLE_TAGS = new Set([
  "button",
  "input",
  "meter",
  "output",
  "progress",
  "select",
  "textarea",
]);

const FEATURE_IDS = {
  finalQc: [
    "final-qc-gate",
    "final-qc-platform-select",
    "final-qc-output-name",
    "final-qc-true-peak",
    "final-qc-clipped-samples",
    "final-qc-longest-silence",
    "final-qc-dialogue-lufs",
    "final-qc-bgm-lufs",
    "final-qc-missing-fonts",
    "final-qc-missing-assets",
    "final-qc-summary",
    "final-qc-run-btn",
    "final-qc-results",
    "final-qc-waiver-code",
    "final-qc-waiver-reason",
    "final-qc-waive-btn",
    "final-qc-json-btn",
    "final-qc-md-btn",
  ],
  assetRights: [
    "asset-rights-status",
    "asset-rights-selected-name",
    "asset-rights-kind-select",
    "asset-rights-commercial-select",
    "asset-rights-source-input",
    "asset-rights-license-input",
    "asset-rights-expiry-input",
    "asset-rights-attribution-input",
    "asset-rights-notes-input",
    "asset-rights-save-btn",
    "asset-audio-preview",
    "asset-category-select",
    "open-asset-category-btn",
  ],
  aiQueue: [
    "ai-queue-pause-btn",
    "ai-cache-clear-btn",
    "ai-queue-usage",
    "ai-cache-count",
    "ai-queue-concurrency-input",
    "ai-request-limit-input",
    "ai-cost-limit-input",
    "ai-confirm-threshold-input",
    "ai-queue-save-btn",
    "ai-job-list",
  ],
  brandKit: [
    "brand-kit-count",
    "brand-kit-import-btn",
    "brand-kit-export-btn",
    "brand-kit-select",
    "brand-kit-new-btn",
    "brand-kit-duplicate-btn",
    "brand-kit-delete-btn",
    "brand-name-input",
    "brand-font-input",
    "brand-font-weight-input",
    "brand-primary-color",
    "brand-secondary-color",
    "brand-accent-color",
    "brand-logo-name",
    "brand-logo-btn",
    "brand-caption-max-input",
    "brand-caption-position-select",
    "brand-caption-shadow-checkbox",
    "brand-caption-highlight-checkbox",
    "brand-thumb-layout-select",
    "brand-thumb-background-color",
    "brand-thumb-text-color",
    "brand-thumb-brightness-input",
    "brand-thumb-contrast-input",
    "brand-thumb-saturation-input",
    "brand-thumb-shadow-input",
    "brand-thumb-shadow-color",
    "brand-thumb-glow-input",
    "brand-thumb-glow-color",
    "brand-tts-model-select",
    "brand-tts-voice-input",
    "brand-tts-speed-input",
    "brand-active-name",
    "brand-kit-save-btn",
    "brand-kit-apply-btn",
  ],
  subtitles: [
    "subtitle-editor",
    "subtitle-editor-heading",
    "subtitle-status",
    "subtitle-import-btn",
    "subtitle-export-btn",
    "subtitle-undo-btn",
    "subtitle-redo-btn",
    "subtitle-max-chars-input",
    "subtitle-reflow-btn",
    "subtitle-ai-reflow-btn",
    "subtitle-ai-review-btn",
    "subtitle-translate-language-input",
    "subtitle-ai-translate-btn",
    "subtitle-meta",
    "subtitle-cue-list",
  ],
} as const;

const OPERATIONAL_UI_IDS = [
  "recovery-count",
  "recovery-list",
  "recovery-confirm-dialog",
  "recovery-confirm-title",
  "recovery-confirm-description",
  "recovery-confirm-label",
  "recovery-confirm-cancel-btn",
  "recovery-confirm-approve-btn",
  "automation-timebase-dialog",
  "automation-timebase-title",
  "automation-timebase-description",
  "automation-timebase-label",
  "automation-timebase-cancel-btn",
  "automation-timebase-approve-btn",
  "run-diagnostics-btn",
  "export-diagnostics-btn",
  "diagnostics-summary",
  "diagnostics-list",
] as const;

function parseAttributes(source: string): Attributes {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    if (!name) continue;
    attributes[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function parseDocument(source: string): StaticDocument {
  const html = source.replace(/<!--[\s\S]*?-->/g, "");
  const elements: StaticElement[] = [];
  const pattern = /<([a-z][a-z0-9:-]*)(\s[^<>]*?)?\s*\/?>/gi;
  for (const match of html.matchAll(pattern)) {
    const tag = match[1]?.toLowerCase();
    if (!tag || match.index === undefined) continue;
    elements.push({
      tag,
      attributes: parseAttributes(match[2] ?? ""),
      index: match.index,
      source: match[0],
    });
  }

  const mutableById = new Map<string, StaticElement[]>();
  for (const element of elements) {
    const id = element.attributes.id;
    if (!id) continue;
    const matches = mutableById.get(id) ?? [];
    matches.push(element);
    mutableById.set(id, matches);
  }

  return { html, elements, byId: mutableById };
}

function documentFromFile(filePath: string): StaticDocument {
  return parseDocument(readFileSync(filePath, "utf8"));
}

function elementById(document: StaticDocument, id: string): StaticElement {
  const matches = document.byId.get(id) ?? [];
  assert.equal(matches.length, 1, `#${id} must occur exactly once (found ${matches.length})`);
  return matches[0]!;
}

function hasAttribute(element: StaticElement, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(element.attributes, name);
}

function classNames(element: StaticElement): ReadonlySet<string> {
  return new Set((element.attributes.class ?? "").split(/\s+/).filter(Boolean));
}

function visibleText(source: string): string {
  return source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tokenCount(source: string, token: string): number {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(`\\b${escaped}\\b`, "g"))].length;
}

function optionsFor(document: StaticDocument, selectId: string): readonly StaticElement[] {
  const select = elementById(document, selectId);
  assert.equal(select.tag, "select", `#${selectId} must be a select`);
  const openEnd = document.html.indexOf(">", select.index);
  const closeStart = document.html.toLowerCase().indexOf("</select>", openEnd);
  assert.ok(openEnd >= 0 && closeStart >= 0, `#${selectId} must have a closing tag`);
  return parseDocument(document.html.slice(openEnd + 1, closeStart)).elements
    .filter((element) => element.tag === "option");
}

function optionValues(document: StaticDocument, selectId: string): readonly string[] {
  return optionsFor(document, selectId).map((option) => option.attributes.value ?? "");
}

function defaultOptionValue(document: StaticDocument, selectId: string): string {
  const options = optionsFor(document, selectId);
  assert.ok(options.length > 0, `#${selectId} must contain at least one option`);
  const selected = options.find((option) => hasAttribute(option, "selected")) ?? options[0]!;
  return selected.attributes.value ?? "";
}

function assertUniqueIds(document: StaticDocument): void {
  const duplicates = [...document.byId.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([id, matches]) => `${id} (${matches.length})`);
  assert.deepEqual(duplicates, [], `duplicate DOM IDs: ${duplicates.join(", ")}`);
}

function assertReferencedIds(document: StaticDocument): void {
  const referenceAttributes = ["aria-controls", "aria-describedby", "aria-labelledby"] as const;
  for (const element of document.elements) {
    for (const attribute of referenceAttributes) {
      const value = element.attributes[attribute];
      if (!value) continue;
      for (const id of value.split(/\s+/).filter(Boolean)) {
        elementById(document, id);
      }
    }
    if (element.tag === "output" && element.attributes.for) {
      for (const id of element.attributes.for.split(/\s+/).filter(Boolean)) {
        elementById(document, id);
      }
    }
  }
}

function assertLabelsAndButtons(document: StaticDocument): void {
  for (const label of document.elements.filter((element) => element.tag === "label")) {
    const targetId = label.attributes.for;
    if (!targetId) continue;
    const target = elementById(document, targetId);
    assert.ok(LABELABLE_TAGS.has(target.tag), `<label for="${targetId}"> targets non-labelable <${target.tag}>`);
  }

  for (const button of document.elements.filter((element) => element.tag === "button")) {
    assert.equal(button.attributes.type, "button", `${button.attributes.id ? `#${button.attributes.id}` : button.source} must declare type="button"`);
  }
}

function assertTabContracts(document: StaticDocument): void {
  const tabs = document.elements.filter((element) => element.attributes["data-tab"] !== undefined);
  const panels = document.elements.filter((element) => element.attributes["data-panel"] !== undefined);
  assert.ok(tabs.length > 0, "at least one tab is required");
  assert.equal(tabs.length, panels.length, "every tab must have exactly one tabpanel");

  const tabNames = tabs.map((tab) => tab.attributes["data-tab"]!);
  const panelNames = panels.map((panel) => panel.attributes["data-panel"]!);
  assert.equal(new Set(tabNames).size, tabs.length, "data-tab values must be unique");
  assert.equal(new Set(panelNames).size, panels.length, "data-panel values must be unique");
  assert.deepEqual(new Set(panelNames), new Set(tabNames), "data-tab and data-panel names must match");

  const selectedTabs = tabs.filter((tab) => tab.attributes["aria-selected"] === "true");
  const visiblePanels = panels.filter((panel) => !hasAttribute(panel, "hidden"));
  assert.equal(selectedTabs.length, 1, "exactly one tab must be initially selected");
  assert.equal(visiblePanels.length, 1, "exactly one tabpanel must be initially visible");

  for (const tab of tabs) {
    const name = tab.attributes["data-tab"]!;
    const tabId = `tab-${name}`;
    const panelId = `panel-${name}`;
    assert.equal(tab.tag, "button", `[data-tab="${name}"] must be a button`);
    assert.equal(tab.attributes.id, tabId);
    assert.equal(tab.attributes.role, "tab");
    assert.equal(tab.attributes["aria-controls"], panelId);
    assert.ok(tab.attributes["aria-selected"] === "true" || tab.attributes["aria-selected"] === "false");

    const panel = elementById(document, panelId);
    assert.equal(panel.attributes["data-panel"], name);
    assert.equal(panel.attributes.role, "tabpanel");
    assert.equal(panel.attributes["aria-labelledby"], tabId);

    const selected = tab.attributes["aria-selected"] === "true";
    assert.equal(classNames(tab).has("is-active"), selected, `${tabId} active class must match aria-selected`);
    assert.equal(classNames(panel).has("is-active"), selected, `${panelId} active class must match its tab`);
    assert.equal(hasAttribute(panel, "hidden"), !selected, `${panelId} hidden state must be the inverse of selection`);
    if (selected) assert.notEqual(tab.attributes.tabindex, "-1", `${tabId} must remain keyboard reachable`);
    else assert.equal(tab.attributes.tabindex, "-1", `${tabId} must use roving tabindex`);
  }

  assert.equal(
    visiblePanels[0]!.attributes["data-panel"],
    selectedTabs[0]!.attributes["data-tab"],
    "the visible panel must belong to the selected tab",
  );
}

function sourceFilesWithDomReferences(): readonly string[] {
  const controllerPaths = readdirSync(path.join(ROOT, "src"))
    .filter((name) => name.endsWith("-controller.ts"))
    .map((name) => path.join(ROOT, "src", name));
  return [path.join(ROOT, "index.ts"), path.join(ROOT, "src", "ui.ts"), ...controllerPaths];
}

function extractLiteralDomIds(source: string): ReadonlySet<string> {
  const ids = new Set<string>();
  const helperPattern = /\b(?:(?:element|optionalElement)(?:<[^>\r\n]+>)?|bind|valueOf|numberOf|checkedOf|setText|setValue|setChecked|required|optional)\s*\(\s*["'`]([a-z][a-z0-9-]+)["'`]/g;
  for (const match of source.matchAll(helperPattern)) {
    if (match[1]) ids.add(match[1]);
  }

  const loopPattern = /for\s*\(\s*const\s+(?:id|\[[^\]]+\])\s+of\s+\[([\s\S]*?)\]\s*(?:as const)?\s*\)/g;
  for (const loop of source.matchAll(loopPattern)) {
    const body = loop[1] ?? "";
    for (const literal of body.matchAll(/["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)["'`]/g)) {
      if (literal[1]) ids.add(literal[1]);
    }
  }
  return ids;
}

function assertSourceDomReferences(document: StaticDocument): void {
  const references = new Map<string, string[]>();
  for (const filePath of sourceFilesWithDomReferences()) {
    const relativePath = path.relative(ROOT, filePath).replaceAll("\\", "/");
    const source = readFileSync(filePath, "utf8");
    for (const id of extractLiteralDomIds(source)) {
      const files = references.get(id) ?? [];
      files.push(relativePath);
      references.set(id, files);
    }
  }
  references.set("log-list", ["src/ui.ts ActivityLog default"]);

  const missing = [...references.entries()]
    .filter(([id]) => (document.byId.get(id) ?? []).length !== 1)
    .map(([id, files]) => `#${id} <- ${files.join(", ")}`)
    .sort();
  assert.deepEqual(missing, [], `source-referenced DOM IDs missing or duplicated:\n${missing.join("\n")}`);
}

function assertFeatureIds(document: StaticDocument): void {
  for (const [feature, ids] of Object.entries(FEATURE_IDS)) {
    for (const id of ids) {
      elementById(document, id);
    }
    assert.ok(ids.length > 0, `${feature} contract must not be empty`);
  }
}

function assertLiveRegions(document: StaticDocument): void {
  assert.equal(elementById(document, "final-qc-results").attributes["aria-live"], "polite");
  assert.equal(elementById(document, "ai-job-list").attributes["aria-live"], "polite");
  const subtitleStatus = elementById(document, "subtitle-status");
  assert.equal(subtitleStatus.attributes.role, "status");
  assert.equal(subtitleStatus.attributes["aria-live"], "polite");
  const subtitleList = elementById(document, "subtitle-cue-list");
  assert.equal(subtitleList.attributes.role, "list");
  assert.equal(subtitleList.attributes["aria-live"], "polite");
  assert.equal(elementById(document, "subtitle-editor").attributes["aria-labelledby"], "subtitle-editor-heading");
}

function assertOperationalUiContracts(document: StaticDocument): void {
  for (const id of OPERATIONAL_UI_IDS) elementById(document, id);

  const recoveryCount = elementById(document, "recovery-count");
  assert.equal(recoveryCount.attributes["aria-label"], "복구 기록 수");
  const recoveryList = elementById(document, "recovery-list");
  assert.equal(recoveryList.attributes["aria-live"], "polite");
  assert.equal(recoveryList.attributes["aria-relevant"], "additions text");
  const recoveryDialog = elementById(document, "recovery-confirm-dialog");
  assert.equal(recoveryDialog.tag, "dialog");
  assert.equal(recoveryDialog.attributes["aria-labelledby"], "recovery-confirm-title");
  assert.equal(recoveryDialog.attributes["aria-describedby"], "recovery-confirm-description");
  const timeBaseDialog = elementById(document, "automation-timebase-dialog");
  assert.equal(timeBaseDialog.tag, "dialog");
  assert.equal(timeBaseDialog.attributes["aria-labelledby"], "automation-timebase-title");
  assert.equal(timeBaseDialog.attributes["aria-describedby"], "automation-timebase-description");

  const runButton = elementById(document, "run-diagnostics-btn");
  const exportButton = elementById(document, "export-diagnostics-btn");
  assert.equal(runButton.tag, "button");
  assert.equal(exportButton.tag, "button");
  assert.ok(!hasAttribute(runButton, "disabled"), "diagnostics must be runnable initially");
  assert.ok(hasAttribute(exportButton, "disabled"), "diagnostics export must wait for a report");

  const summary = elementById(document, "diagnostics-summary");
  assert.equal(summary.attributes.role, "status");
  assert.equal(summary.attributes["aria-live"], "polite");
  assert.ok(classNames(summary).has("is-idle"), "diagnostics summary must start idle");
  assert.equal(elementById(document, "diagnostics-list").attributes["aria-live"], "polite");

  const text = visibleText(document.html);
  assert.ok(text.includes("비파괴 작업 복구"));
  assert.ok(text.includes("자동 편집 전 생성한 검증된 복제 시퀀스와 작업 상태를 최대 50개까지 기록합니다."));
  assert.ok(text.includes("진단 실행"));
  assert.ok(text.includes("진단 JSON 저장"));
  assert.ok(text.includes("자동 외부 전송은 하지 않습니다."));
  assert.ok(text.includes("JSON 저장 시 API 키, 경로, 미디어명, 원고 등 민감 정보는 제거됩니다."));
}

function assertOperationalSourceContracts(source: string): void {
  assert.match(source, /bind\("run-diagnostics-btn",\s*"click",\s*guarded\(\(\) => diagnosticsPanel\.run\(\)/);
  assert.match(source, /bind\("export-diagnostics-btn",\s*"click",\s*guarded\(\(\) => diagnosticsPanel\.exportJson\(\)/);
  assert.match(source, /button\.type\s*=\s*"button";[\s\S]*?button\.textContent\s*=\s*"복제본 제거";/);
  // 복구 패널의 복제본 제거는 검증형 remove를 배선해야 한다 — §186 #9로 직접 호출은
  // 사라졌으므로(정리는 applyAutomationPlan 단일 지점) 배선 참조를 확인한다.
  assert.match(source, /removeClone: removeVerifiedClonedSequence/);
  assert.match(source, /dialog\.uxpShowModal\.bind\(dialog\)/);
  assert.match(source, /if \(!await requestRecoveryRollbackConfirmation\(entry\)\)/);
  assert.doesNotMatch(source, /globalThis as unknown as \{ confirm\?/);

  assert.equal(tokenCount(source, "collectDiagnosticsReport"), 2, "diagnostics collection must occur only in the panel run flow");
  assert.equal(tokenCount(source, "diagnosticsPanel.run"), 1, "diagnostics execution must be bound to a single click handler");
  assert.equal(tokenCount(source, "diagnosticsPanel.exportJson"), 1, "diagnostics export must be bound to a single click handler");
  assert.equal(tokenCount(source, "TelemetryManager"), 0, "the panel must not start an automatic telemetry sender");

  const exportHandler = /async function exportJson\(\): Promise<void> \{[\s\S]*?\n {2}\}/u.exec(source)?.[0] ?? "";
  const selfCheckIndex = exportHandler.indexOf("assertDiagnosticRedactionSelfCheck();");
  const pickerIndex = exportHandler.indexOf("getFileForSaving?.(");
  assert.ok(selfCheckIndex >= 0, "diagnostics export must run the active redaction self-check");
  assert.ok(pickerIndex > selfCheckIndex, "redaction self-check must run before opening the save picker");
  assert.match(source, /diagnosticBundleToJSON\(\{[\s\S]*?reportPurpose:\s*"user-initiated-local-export"/);
  assert.match(source, /getFileForSaving\?\.\([\s\S]*?ShortFlow_Diagnostics_/);
  assert.match(source, /await file\.write\(payload,/);
  assert.match(source, /function ensureAiConsent\(/);
  assert.match(source, /ensureAiConsent\("AI 자막"\)/);
  assert.match(source, /ensureAiConsent\("AI 연결 테스트"\)/);
  assert.match(source, /ensureAiConsent\("썸네일 AI"\)/);
  assert.match(source, /ensureAiConsent:\s*\(\)\s*=>\s*ensureAiConsent\("TTS\/STT"\)/);
  assert.match(source, /onWarning:\s*\(message\)\s*=>\s*activity\.add\("warning", message\)/);
  // §189 #3(사용자 확정): 모든 push가 pull과 같은 STT 우선 resolve를 거쳐야 한다 —
  // 자막 편집 직후와 분석 시점의 원고가 뒤집히던 불일치(조용한 편집 폐기)를 계약으로 고정한다.
  assert.match(source, /onSourceChange:\s*\(\)\s*=>\s*\{[\s\S]{0,240}?automationController\?\.setTranscript\(resolveAutomationTranscript\(speechController\?\.transcript, subtitleController\?\.document \?\? null\)\);[\s\S]{0,80}?\}/);
  assert.match(source, /onTranscript:\s*\(transcript\)\s*=>\s*\{[\s\S]{0,500}?automationController\?\.setTranscript\(resolveAutomationTranscript\(transcript, null\)\);/);
  assert.match(source, /onChange:\s*\(document\)\s*=>\s*\{[\s\S]{0,420}?automationController\?\.setTranscript\(resolveAutomationTranscript\(speechController\?\.transcript, document\)\);/);
  // 모닝와이드 프로필 분기(morning-wide-split P4) — 8뉴스 기본값 동결 + 전용 버튼 + 8뉴스
  // 전용 신호(§110 띠·§152 사인오프)의 프로그램 게이트를 계약으로 고정한다.
  assert.match(source, /async function runNewsCutAutoFlow\(exportAfter: boolean, program: NewsCutProgram = "news8"\)/);
  assert.match(source, /bind\("news-cut-mw-auto-btn", "click", guarded\(handleMorningCutAuto, "모닝와이드 원클릭 분할 실패"\)\)/);
  assert.match(source, /bind\("news-cut-mw-split-btn", "click", guarded\(handleMorningCutSplitOnly, "모닝와이드 분할 실패"\)\)/);
  assert.match(source, /const bandEventCandidates = program === "news8" \? bandEvents : \[\];/);
  assert.match(source, /if \(program !== "news8"\) return 0;/);
  // §189 #2(사용자 확정): 자동 편집 적용은 시퀀스 길이 대조 포트와 불일치 확인 모달이 배선돼야 한다.
  assert.match(source, /getSequenceDurationSeconds:\s*async \(\) => \{[\s\S]{0,240}?includeSelection: false, includePlayerPosition: false[\s\S]{0,80}?sequenceEnd/);
  assert.match(source, /confirmTimeBaseMismatch:\s*\(details\) => requestAutomationTimeBaseConfirmation\(details\)/);
  assert.match(source, /controller\.cueCount === 0/);
  assert.match(source, /const generation = \+\+statusRefreshGeneration;[\s\S]*?controller\.projectKey !== projectKey[\s\S]*?await controller\.loadProject\(projectKey\)/);
  assert.match(source, /subtitleController\.setDocument\(createSubtitleDocument\([\s\S]{1,1600}?\), true\);/);
  assert.match(source, /createTtsAssetRightsRecord\(/);
  assert.match(source, /const sessionGeneratedAssetRightsIdsByProject = new Map<string, Set<string>>\(\);/);
  assert.match(source, /const normalizedReferenceId = nativePath \? normalizeNativePath\(nativePath\) : fallback\.assetId;/);
  assert.match(source, /function rememberSessionGeneratedAssetRights\(assetId: string, projectKey = SESSION_FALLBACK_PROJECT_KEY\): void/);
  assert.match(source, /const sessionGeneratedIds = sessionGeneratedAssetRightsIds\(projectKey\);/);
  assert.match(source, /sessionGeneratedIds\.has\(record\.assetId\)/);
  assert.match(source, /rememberSessionGeneratedAssetRights\(saved\.assetId, projectKey\);/);
  assert.match(source, /return \[\.\.\.visibleRecords, \.\.\.registryOnlyRecords\];/);
  assert.match(source, /function destroyPanel\(\): void/);
  assert.match(source, /void controller\.dispose\(\)\.catch\(\(error\) => reportError\(error, "썸네일 편집기 종료 저장 실패"\)\);/);
  assert.match(source, /destroy\(\)\s*\{[\s\S]{0,120}?destroyPanel\(\);[\s\S]{0,40}?\}/);

  const thumbnailSource = readFileSync(path.join(ROOT, "src", "thumbnail-controller.ts"), "utf8");
  assert.match(thumbnailSource, /button\.closest<HTMLElement>\("\.thumb-ai-card"\)/);
  assert.match(thumbnailSource, /button\.disabled \|\| card\?\.hidden/);
  assert.match(thumbnailSource, /썸네일 AI 보정은 내부 베타에서 비활성화되어 있습니다/);
}

function assertUiDefaults(document: StaticDocument): void {
  assert.deepEqual(optionValues(document, "ai-provider-select"), ["openai"]);
  assert.equal(defaultOptionValue(document, "ai-provider-select"), DEFAULT_SETTINGS.aiProvider);
  assert.equal(elementById(document, "ai-model-input").attributes.value, DEFAULT_SETTINGS.aiModel);
  assert.ok(!hasAttribute(elementById(document, "ai-consent-checkbox"), "checked"));
  // 유료 기능의 기본 ON(§96)은 제품 결정이므로 계약으로 고정한다. HTML 기본값과 저장 설정
  // 기본값이 어긋나면 첫 실행과 재적재 후 동작이 갈리므로 둘을 한 단언으로 묶는다.
  assert.equal(
    hasAttribute(elementById(document, "news-cut-vision-check"), "checked"),
    DEFAULT_SETTINGS.newsCutVision,
  );
  const endpoint = elementById(document, "ai-endpoint-input");
  assert.equal(endpoint.attributes.value, "https://api.openai.com/v1");
  assert.ok(hasAttribute(endpoint, "readonly"), "the fixed OpenAI endpoint must be readonly");

  assert.deepEqual(optionValues(document, "tts-model-select"), ["gpt-4o-mini-tts", "tts-1-hd", "tts-1"]);
  assert.equal(defaultOptionValue(document, "tts-model-select"), DEFAULT_SETTINGS.ttsModel);
  assert.equal(defaultOptionValue(document, "tts-voice-select"), DEFAULT_SETTINGS.ttsVoice);
  assert.deepEqual(optionValues(document, "tts-format-select"), ["wav", "mp3", "aac", "flac"]);
  assert.equal(defaultOptionValue(document, "tts-format-select"), DEFAULT_SETTINGS.ttsFormat);
  assert.equal(elementById(document, "tts-speed-input").attributes.value, String(DEFAULT_SETTINGS.ttsSpeed));

  assert.deepEqual(optionValues(document, "stt-model-select"), [
    "gpt-4o-transcribe-diarize",
    "gpt-4o-transcribe",
    "gpt-4o-mini-transcribe",
    "whisper-1",
  ]);
  assert.equal(defaultOptionValue(document, "stt-model-select"), DEFAULT_SETTINGS.sttModel);
  assert.equal(elementById(document, "stt-language-input").attributes.value, DEFAULT_SETTINGS.sttLanguage);
  assert.deepEqual(optionValues(document, "stt-output-format-select"), ["both", "srt", "text"]);
  assert.equal(defaultOptionValue(document, "stt-output-format-select"), DEFAULT_SETTINGS.sttOutputFormat);

  assert.deepEqual(optionValues(document, "brand-tts-model-select"), ["gpt-4o-mini-tts", "tts-1-hd", "tts-1"]);
  assert.equal(defaultOptionValue(document, "brand-caption-position-select"), "bottom");
  assert.equal(elementById(document, "brand-caption-max-input").attributes.value, "24");
  assert.ok(hasAttribute(elementById(document, "brand-caption-shadow-checkbox"), "checked"));
  assert.ok(!hasAttribute(elementById(document, "brand-caption-highlight-checkbox"), "checked"));

  assert.equal(defaultOptionValue(document, "final-qc-platform-select"), "youtube-shorts");
  assert.equal(elementById(document, "final-qc-output-name").attributes.value, "ShortFlow_Export.mp4");
  assert.deepEqual(optionValues(document, "asset-rights-kind-select"), [
    "music",
    "sfx",
    "image",
    "video",
    "ai-audio",
    "ai-image",
    "ai-video",
    "other",
  ]);
  assert.equal(defaultOptionValue(document, "asset-rights-commercial-select"), "unknown");
  const thumbnailAiCard = document.elements.find((element) => classNames(element).has("thumb-ai-card"));
  assert.ok(thumbnailAiCard, "thumbnail AI card must be present");
  // deferred-ai-features Phase 1: the thumbnail image AI (gpt-image-2) is now enabled in the beta UI.
  assert.ok(!hasAttribute(thumbnailAiCard, "hidden"), "thumbnail AI card must be visible");
  assert.ok(!hasAttribute(elementById(document, "thumb-ai-preset-select"), "disabled"));
  assert.ok(!hasAttribute(elementById(document, "thumb-ai-prompt-input"), "disabled"));
  assert.ok(!hasAttribute(elementById(document, "thumb-ai-run-btn"), "disabled"));
  assert.equal(elementById(document, "ai-queue-concurrency-input").attributes.value, "2");
  assert.equal(elementById(document, "ai-request-limit-input").attributes.value, "100");
  assert.equal(elementById(document, "ai-cost-limit-input").attributes.value, "100");
  assert.equal(elementById(document, "ai-confirm-threshold-input").attributes.value, "10");
  assert.equal(elementById(document, "subtitle-max-chars-input").attributes.value, "19");
  assert.equal(elementById(document, "subtitle-translate-language-input").attributes.value, "영어");
}

function assertInitialDisabledStates(document: StaticDocument): void {
  for (const id of ["final-qc-waive-btn", "final-qc-json-btn", "final-qc-md-btn"]) {
    assert.ok(hasAttribute(elementById(document, id), "disabled"), `#${id} must start disabled`);
  }
  assert.ok(!hasAttribute(elementById(document, "final-qc-run-btn"), "disabled"));

  for (const id of [
    "subtitle-export-btn",
    "subtitle-undo-btn",
    "subtitle-redo-btn",
    "subtitle-reflow-btn",
    "subtitle-ai-reflow-btn",
    "subtitle-ai-review-btn",
    "subtitle-ai-translate-btn",
  ]) {
    assert.ok(hasAttribute(elementById(document, id), "disabled"), `#${id} must start disabled`);
  }
  assert.ok(!hasAttribute(elementById(document, "subtitle-import-btn"), "disabled"));
}

function assertCssContracts(css: string): void {
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important\s*;/s);
  assert.match(css, /html,\s*body\s*\{[^}]*height:\s*100%\s*;[^}]*min-height:\s*100%\s*;/s);
  assert.match(css, /body\s*\{[^}]*overflow:\s*hidden\s*;/s);
  assert.match(css, /\.app-shell\s*\{[^}]*display:\s*flex\s*;[^}]*flex-direction:\s*column\s*;[^}]*height:\s*100vh\s*;[^}]*overflow:\s*hidden\s*;/s);
  assert.match(css, /\.workspace\s*\{[^}]*flex:\s*1\s+1\s+auto\s*;[^}]*min-height:\s*0\s*;[^}]*overflow-y:\s*auto\s*;/s);
  assert.match(css, /\.two-column-layout\s*\{[^}]*display:\s*flex\s*;[^}]*flex-wrap:\s*wrap\s*;/s);
  assert.match(css, /\.two-column-layout\s*>\s*\*\s*\{[^}]*flex:\s*1\s+1\s+260px\s*;[^}]*min-width:\s*0\s*;/s);
  assert.match(css, /\.automation-workspace\s*\{[^}]*display:\s*flex\s*;[^}]*flex-wrap:\s*wrap\s*;/s);
  assert.match(css, /\.automation-card\s*\{[^}]*flex:\s*1\s+1\s+300px\s*;[^}]*min-width:\s*0\s*;/s);
  assert.match(css, /\.asset-workspace\s*\{[^}]*display:\s*flex\s*;[^}]*flex-wrap:\s*wrap\s*;/s);
  assert.match(css, /\.asset-sidebar\s*\{[^}]*flex:\s*1\s+1\s+260px\s*;/s);
  assert.match(css, /\.asset-browser\s*\{[^}]*flex:\s*2\s+1\s+320px\s*;/s);
  assert.match(css, /\.speech-workspace\s*\{[^}]*display:\s*flex\s*;[^}]*flex-wrap:\s*wrap\s*;/s);
  assert.match(css, /\.speech-card\s*\{[^}]*flex:\s*1\s+1\s+320px\s*;[^}]*min-width:\s*0\s*;/s);
  // 레퍼런스 보드 카드 0×0 붕괴 회귀 방지(§27-a): 리스트는 flex-wrap, 카드는 flex-basis를 유지한다.
  assert.match(css, /\.reference-list\s*\{[^}]*display:\s*flex\s*;[^}]*flex-wrap:\s*wrap\s*;/s);
  assert.match(css, /\.reference-card\s*\{[^}]*flex:\s*1\s+1\s+138px\s*;/s);
  // UXP Premiere는 grid auto-fill/auto-fit 컨테이너를 0폭으로 붕괴시킨다 — 목록은 flex-wrap으로 배치한다.
  assert.ok(
    !/auto-fill|auto-fit/.test(css),
    "styles.css must not use grid auto-fill/auto-fit (collapses to 0px in Premiere UXP; use flex-wrap)",
  );
  assert.match(css, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.asset-browser\s*\{[^}]*order:\s*-1\s*;/s);
  assert.match(css, /@media\s*\(max-width:\s*500px\)\s*\{[\s\S]*?\.app-header\s*\{[^}]*min-height:\s*48px\s*;[^}]*padding-top:\s*8px\s*;[^}]*padding-bottom:\s*8px\s*;/s);
  assert.match(css, /@media\s*\(max-width:\s*500px\)\s*\{[\s\S]*?\.sequence-status\s*\{[^}]*padding-top:\s*7px\s*;[^}]*padding-bottom:\s*7px\s*;/s);
  assert.match(css, /@media\s*\(max-width:\s*500px\)\s*\{[\s\S]*?\.status-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*;[^}]*row-gap:\s*6px\s*;/s);
  assert.match(css, /@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.app-header\s*\{[^}]*min-height:\s*42px\s*;[^}]*padding-top:\s*6px\s*;[^}]*padding-bottom:\s*6px\s*;/s);
  for (const selector of [
    ".nav-tab[aria-selected=\"true\"]",
    ".workflow-panel",
    ".qc-status-strip",
    ".qc-status-item",
    ".final-qc-card",
    ".final-qc-results",
    ".final-qc-row.is-error",
    ".ai-queue-card",
    ".ai-job-list",
    ".ai-job-row.is-failed",
    ".brand-kit-card",
    ".brand-kit-toolbar",
    ".subtitle-editor-card",
    ".subtitle-status[data-status=\"error\"]",
    ".subtitle-cue-list",
    ".subtitle-word.is-active",
    ".subtitle-action-button:focus-visible",
  ]) {
    assert.ok(css.includes(selector), `styles.css is missing ${selector}`);
  }
}

function assertOperationalCssContracts(css: string): void {
  for (const selector of [
    ".recovery-card",
    ".recovery-count",
    ".recovery-list",
    ".recovery-row.is-interrupted",
    ".diagnostics-card",
    ".diagnostics-summary.is-green",
    ".diagnostics-summary.is-yellow",
    ".diagnostics-summary.is-red",
    ".diagnostics-list",
    ".diagnostic-row.is-green .diagnostic-state",
    ".diagnostic-row.is-yellow .diagnostic-state",
    ".diagnostic-row.is-red .diagnostic-state",
  ]) {
    assert.ok(css.includes(selector), `styles.css is missing ${selector}`);
  }
}

function assertSharedHtmlContracts(document: StaticDocument): void {
  assertUniqueIds(document);
  assertReferencedIds(document);
  assertLabelsAndButtons(document);
  assertTabContracts(document);
  assertFeatureIds(document);
  assertLiveRegions(document);
  assertUiDefaults(document);
  assertInitialDisabledStates(document);
}

describe("public UXP HTML contract", () => {
  const document = documentFromFile(PUBLIC_HTML_PATH);

  it("keeps IDs unique and every static relationship resolvable", () => {
    assertUniqueIds(document);
    assertReferencedIds(document);
    assertLabelsAndButtons(document);
  });

  it("keeps tabs and tabpanels in a complete accessible one-to-one mapping", () => {
    assertTabContracts(document);
  });

  it("provides every literal DOM ID consumed by index.ts and controllers", () => {
    assertSourceDomReferences(document);
  });

  it("keeps final QC, AI queue, brand kit, and subtitle integration surfaces complete", () => {
    assertFeatureIds(document);
    assertLiveRegions(document);
    assertInitialDisabledStates(document);
    assert.match(document.html, /id="subtitle-import-btn"[^>]*>SRT\/Whisper JSON 불러오기<\/button>/u);
    assert.match(readFileSync(path.join(ROOT, "index.ts"), "utf8"), /types:\s*\["srt", "json"\]/u);
  });

  it("publishes production model and control defaults", () => {
    assertUiDefaults(document);
  });
});

describe("AI endpoint safety contract", () => {
  it("pins restored settings to OpenAI instead of reviving a custom endpoint", () => {
    const restored = normalizeSettings({
      aiProvider: "custom",
      aiEndpoint: "https://attacker.example/v1",
    });
    assert.equal(restored.aiProvider, "openai");
    assert.equal(restored.aiEndpoint, DEFAULT_SETTINGS.aiEndpoint);
  });

  it("does not read a custom provider or editable endpoint back from index.ts", () => {
    const source = readFileSync(path.join(ROOT, "index.ts"), "utf8");
    assert.equal(
      /aiProvider\s*:\s*valueOf\("ai-provider-select"\)\s*===\s*"custom"/.test(source),
      false,
      "index.ts must not restore the removed custom provider path",
    );
    assert.equal(
      /aiEndpoint\s*:\s*valueOf\("ai-endpoint-input"\)/.test(source),
      false,
      "index.ts must not persist a DOM-supplied API endpoint",
    );
  });
});

describe("recovery and system diagnostics UI contract", () => {
  const document = documentFromFile(PUBLIC_HTML_PATH);
  // 복구·진단·에셋 브라우저·마커/QC 패널이 src/recovery-panel.ts, src/diagnostics-panel.ts,
  // src/asset-browser-panel.ts, src/markers-qc-panel.ts로 분리됐으므로 함께 검사한다.
  const indexSource = readFileSync(path.join(ROOT, "index.ts"), "utf8")
    + readFileSync(path.join(ROOT, "src", "recovery-panel.ts"), "utf8")
    + readFileSync(path.join(ROOT, "src", "diagnostics-panel.ts"), "utf8")
    + readFileSync(path.join(ROOT, "src", "asset-browser-panel.ts"), "utf8")
    + readFileSync(path.join(ROOT, "src", "markers-qc-panel.ts"), "utf8");

  it("exposes recovery and diagnostics IDs with accessible initial states", () => {
    assertOperationalUiContracts(document);
  });

  it("keeps recovery destructive actions explicit and diagnostics user initiated", () => {
    assertOperationalSourceContracts(indexSource);
  });

  it("styles recovery and green, yellow, and red diagnostics states", () => {
    assertOperationalCssContracts(readFileSync(PUBLIC_CSS_PATH, "utf8"));
  });
});

describe("UXP visual state contract", () => {
  it("styles hidden panels, selected tabs, and integrated feature states", () => {
    assertCssContracts(readFileSync(PUBLIC_CSS_PATH, "utf8"));
  });

  it("binds workflow tabs only after the UXP panel DOM is ready", () => {
    const source = readFileSync(path.join(ROOT, "index.ts"), "utf8");
    const uiSource = readFileSync(path.join(ROOT, "src", "ui.ts"), "utf8");
    assert.match(source, /function whenDocumentReady\(task: \(\) => void\): void/u);
    assert.match(source, /document\.readyState === "loading"/u);
    assert.match(source, /document\.addEventListener\("DOMContentLoaded", task, \{ once: true \}\)/u);
    assert.match(source, /function startPanel\(\): void \{[\s\S]*setupTabs\(\);[\s\S]*bootstrap\(\)/u);
    assert.doesNotMatch(source, /\nsetupTabs\(\);\nstartPanel\(\);/u);
    assert.match(uiSource, /let tabsInitialized = false;/u);
    assert.match(uiSource, /function activateWorkflowTab\(tab: HTMLButtonElement/u);
    assert.match(uiSource, /function workflowTabFromEvent\(event: Event\): HTMLButtonElement \| null/u);
    assert.match(uiSource, /document\.addEventListener\("click"[\s\S]*activateWorkflowTab\(tab\);[\s\S]*true\);/u);
    assert.match(uiSource, /document\.addEventListener\("keydown"[\s\S]*activateWorkflowTab\(next, true\);[\s\S]*true\);/u);
    assert.match(uiSource, /tabsInitialized = true;/u);
  });

  it("keeps Premiere Safe Zone overlays on the Host-compatible BMP renderer", () => {
    const source = readFileSync(path.join(ROOT, "index.ts"), "utf8");
    const overlayFunction = /async function createPremiereSafeZoneOverlay[\s\S]*?\n\}\n\nfunction guarded/u.exec(source)?.[0] ?? "";
    assert.match(overlayFunction, /const expectedContextKey = await readActiveContextKey\(\);/u);
    assert.match(overlayFunction, /renderSafeZoneGuideBmp/u);
    assert.match(overlayFunction, /__SHORTFLOW_SAFE_GUIDE_DO_NOT_EXPORT__/u);
    assert.match(overlayFunction, /readSequenceStatus\(undefined, \{ expectedContextKey \}\)/u);
    assert.match(overlayFunction, /expectedContextKey,/u);
    assert.doesNotMatch(overlayFunction, /document\.createElement\("canvas"\)/u);
    assert.doesNotMatch(overlayFunction, /canvasToPngBytes/u);
  });
});

describe("built UXP artifact contract", () => {
  it("preserves public HTML contracts in dist/index.html", { skip: !existsSync(DIST_HTML_PATH) }, () => {
    assertSharedHtmlContracts(documentFromFile(DIST_HTML_PATH));
  });

  it("preserves public CSS contracts in dist/styles.css", { skip: !existsSync(DIST_CSS_PATH) }, () => {
    assertCssContracts(readFileSync(DIST_CSS_PATH, "utf8"));
  });

  const distHasOperationalUi = existsSync(DIST_HTML_PATH)
    && readFileSync(DIST_HTML_PATH, "utf8").includes('id="run-diagnostics-btn"');
  it("preserves recovery and diagnostics contracts after rebuilding dist", { skip: !distHasOperationalUi }, () => {
    assertOperationalUiContracts(documentFromFile(DIST_HTML_PATH));
    assertOperationalCssContracts(readFileSync(DIST_CSS_PATH, "utf8"));
  });
});

describe("internal beta packaging contract", () => {
  it("keeps production source maps out of dist and CCX candidates", () => {
    const viteConfig = readFileSync(path.join(ROOT, "vite.config.mjs"), "utf8");
    const verifyDist = readFileSync(path.join(ROOT, "scripts", "verify-dist.mjs"), "utf8");
    const verifyRelease = readFileSync(path.join(ROOT, "scripts", "verify-release.mjs"), "utf8");
    assert.match(viteConfig, /sourcemap:\s*false/);
    assert.match(verifyDist, /source map을 포함하지 않습니다/);
    assert.match(verifyDist, /sourceMappingURL을 포함하지 않습니다/);
    assert.match(verifyRelease, /source map을 포함하지 않습니다/);
  });
});

// §152 오디오 사인오프 회수 — 위계·경로 계약. 이 세 가지가 깨지면 §149(무료 신호가 비전
// 판정을 뒤집지 않는다)와 §99(유료 동의 게이트) 원칙이 조용히 무너진다.
describe("audio signoff cue contract (§152)", () => {
  const indexSource = readFileSync(path.join(ROOT, "index.ts"), "utf8");

  it("오디오 단서는 비전 ON 블록 안에서만 동작한다 — 유료 동의 게이트(§99) 재사용", () => {
    // 앵커를 게이트 코드 문자열로 잡는다(§182 감사 #7) — 로그 문구("하단 띠 검사")는 다른
    // 곳에 재등장할 수 있어 취약했다(강등 문구 추가로 실제로 깨짐).
    const rescueAt = indexSource.indexOf("if (visionEnabled && !verifyBudgetStopped) {");
    const cueAt = indexSource.indexOf("오디오 사인오프 회수");
    const freeFilterAt = indexSource.indexOf("if (verified.length > 1 && !visionEnabled) {");
    assert.ok(rescueAt > 0 && cueAt > rescueAt, "사인오프 회수는 회수(비전 ON) 블록 안에 있어야 한다");
    assert.ok(freeFilterAt > cueAt, "사인오프 회수는 무료 띠 필터(§149)보다 앞이어야 한다");
  });

  it("사인오프 후보는 회수 프로브 목록에만 합류한다 — 경계를 직접 확정하지 않는다(§149 위계)", () => {
    assert.match(indexSource, /plan\.times\.push\(\.\.\.times\)/u);
    // verified를 직접 손대면 비전 판정을 건너뛰게 된다 — 그 형태가 없어야 한다.
    assert.ok(
      !/verified\.push\(\.\.\.signoff/u.test(indexSource),
      "사인오프가 verified를 직접 늘리면 비전 판정을 건너뛴다",
    );
  });

  it("창 STT는 whisper-1로만 부른다 — 세그먼트 타임스탬프가 필요하다", () => {
    const fn = indexSource.slice(indexSource.indexOf("async function runSignoffStt"));
    assert.match(fn.slice(0, 900), /model:\s*"whisper-1"\s*as const/u);
  });

  it("내보낸 프레임은 읽은 뒤 지운다 — 헬퍼가 정리해 호출부 누락을 원천 차단한다(§167-b)", () => {
    const fn = indexSource.slice(indexSource.indexOf("async function readExportedFrameBytes"));
    const body = fn.slice(0, fn.indexOf("\n}\n") + 3);
    assert.match(body, /entry\.delete\(\)/u, "프레임 임시 파일 삭제가 없다");
    // 재시도 루프 안에서 지우면 다음 시도가 읽을 파일이 사라진다 — 루프 뒤여야 한다.
    assert.ok(body.indexOf("entry.delete()") > body.lastIndexOf("attempt += 1"), "삭제는 재시도 루프 뒤여야 한다");
  });

  it("내보낸 시퀀스 WAV는 읽은 뒤 지운다 — 안 지우면 회차마다 ~30MB가 영구 누적된다(§167)", () => {
    const fn = indexSource.slice(indexSource.indexOf("async function exportActiveSequenceAudio"));
    const body = fn.slice(0, fn.indexOf("\n}\n") + 3);
    assert.match(body, /fileEntry\.delete\(\)/u, "임시 WAV 삭제가 없다");
    // 읽기 실패 경로에서도 남기지 않아야 한다 — finally 안에서 지워야 한다.
    const deleteAt = body.indexOf("fileEntry.delete()");
    const finallyAt = body.indexOf("} finally {");
    assert.ok(finallyAt > 0 && deleteAt > finallyAt, "삭제는 finally 안에 있어야 읽기 실패에도 정리된다");
  });

  it("칼럼 시작 판정은 참조 프레임 없이 나눠 보낸다 — 합계 상한에 걸려 호출이 통째로 실패했다(§170)", () => {
    const block = indexSource.slice(indexSource.indexOf("standingPresenterOnly: true"));
    const call = indexSource.slice(indexSource.lastIndexOf("classifyAnchorShots", indexSource.indexOf("standingPresenterOnly: true")));
    // 참조 배열이 빈 리터럴이어야 한다 — rescueRefs를 실으면 1.2MB 상한을 넘긴다.
    assert.match(call.slice(0, 400), /\[\],\s*\{\},\s*\{ standingPresenterOnly: true \}/u, "칼럼 판정에 참조 프레임을 실으면 안 된다");
    assert.ok(block.length > 0);
    // 4장씩 나눠 보내는 청크 루프가 있어야 한다.
    const chunkArea = indexSource.slice(indexSource.indexOf("const standingHits"));
    assert.match(chunkArea.slice(0, 900), /offset \+= 4/u, "칼럼 판정은 청크로 나눠 보내야 한다");
  });

  it("칼럼 시작 회수는 시각당 3프레임 다수결로 판정한다 — 1표 되살리기 금지(§191)", () => {
    // 7/31 353.8: 본 검증이 3/3 비앵커로 배제한 대담 게스트를, 회수가 **한 장**(+1.2,
    // 타이트 크롭이라 착석이 안 보임)만 보고 되살렸다. 같은 샷의 +4·+7에는 데스크가 보인다.
    assert.match(indexSource, /const STANDING_PROBE_OFFSETS = \[1\.2, 4, 7\]/u, "칼럼 회수 프로브는 본 검증과 같은 3점이어야 한다");
    const area = indexSource.slice(indexSource.indexOf("const standingVotes"));
    // 표를 시각별로 모아야 한다 — 결과 순서대로 즉시 채택하면 1표 되살리기로 되돌아간다.
    // 만장일치다(§191 3차) — 진짜 칼럼 4건은 전부 3/3, 오검출만 2/3이었다.
    assert.match(area.slice(0, 2000), /tally\.total < 2 \|\| tally\.yes !== tally\.total/u, "2장 미만·이견 있으면 되살리지 않아야 한다");
    // 무엇을 보고 무엇을 골랐는지 로그로 남아야 한다(회수 경로 검증 2원칙의 첫째).
    assert.match(area.slice(0, 1600), /칼럼 판정 표 상세/u, "칼럼 판정 표가 로그에 남아야 한다");
  });

  it("표 0으로 살아남은 비정상 후보는 프레임별 판정이 로그에 남는다(§191-d)", () => {
    // MW 7/28: 인물 없는 b-roll(1050)이 0/3으로 통과해 FP — "전부 앵커 판정"인지 "저신뢰
    // 기권"인지 로그로 구별 불가했다. 정상 앵커(전 프레임 고신뢰 앵커)는 찍지 않는다.
    const area = indexSource.slice(indexSource.indexOf("무표 생존 상세"));
    assert.ok(area.length > 0, "무표 생존 상세 로그가 있어야 한다");
    const guard = indexSource.slice(indexSource.indexOf("const allConfidentAnchor"));
    assert.match(guard.slice(0, 300), /every/u, "전 프레임 고신뢰 앵커는 걸러야 스팸이 안 된다");
  });

  it("검증 프레임 부족분 재수집은 지연을 두고 2라운드까지 시도한다(§191-c)", () => {
    // MW 7/28 실기: 1라운드 재수집이 발동했는데 그 1장도 죽어 876이 2/2(만장일치·3표 미달)로
    // 통과, FP 875.5. 유실은 순간 부하에서 몰리므로 라운드 사이 지연이 핵심이다(§190-b 원리).
    const area = indexSource.slice(indexSource.indexOf("let pending = missing"));
    assert.match(area.slice(0, 400), /round < 2 && pending\.length > 0/u, "재수집은 2라운드 루프여야 한다");
    assert.match(area.slice(0, 700), /1000 \* \(round \+ 1\)/u, "라운드마다 지연이 늘어야 한다");
    assert.match(area.slice(0, 2200), /배제 불가로 남습니다/u, "잔여 유실은 경고로 관측돼야 한다");
  });

  it("비경고 회차도 긴 공백(120s·8s)을 스윕하고, 스윕 발견은 2표 합의를 거친다(§171)", () => {
    // §107 전면 발동(100s·4s)은 산발 오판 FP로 원복됐다 — 비경고 회차는 더 넓은 공백만,
    // 그리고 발견은 +2초 프레임 재판정(2표 합의)을 통과해야 채택된다(§107-c 처방).
    const area = indexSource.slice(indexSource.indexOf("const warnEpisode = bankFit >"));
    const head = area.slice(0, 700);
    assert.match(head, /planRescueProbes\(verified, tailStart \?\? duration, \{ maxSpan: 120, stepSeconds: 8 \}\)/u, "비경고 회차 스윕 파라미터가 다르다");
    assert.match(head, /const wideGapTimes = new Set\(warnEpisode \? \[\] : plan\.times\)/u, "스윕 프로브 식별이 없다");
    const confirmArea = indexSource.slice(indexSource.indexOf("2표 합의 확인"));
    assert.match(confirmArea.slice(0, 2200), /vote\.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE/u, "2표 합의가 회수 임계를 써야 한다");
    // 두 번째 프레임 판정 유실·실패는 기각이어야 한다 — 회수는 추가라 불확실하면 안 늘린다.
    assert.match(confirmArea.slice(0, 3000), /if \(!confirmed\) \{/u, "미확인 기각 분기가 없다");
  });

  it("스윕 미달 앵커 판정(0.75~)은 2표 구제를 태운다(§172-b)", () => {
    // §172-b — 7/13 실측: 188→앵커(0.81)를 임계에서 버려 189.8이 FN이 됐다.
    assert.match(indexSource, /wideGapTimes\.has\(probe\.time\) && result\.confidence >= 0\.75/u, "미달 구제 수집이 없다");
    assert.match(indexSource, /const weakRescueCandidates = wideGapWeakHits\.filter/u, "구제 후보가 2표 절차에 합류해야 한다");
  });

  it("되짚기 연속성 기각 지점은 3형 카드 확인을 거친다 — 앵커 단신이 카드로 끝나는 경계(§173)", () => {
    // 6/23 실측: 되짚기 -6/-2 지점 앵커(0.99) + 중간점도 앵커 → 연속성 기각 → FN 202.0.
    // 그 조합은 §125 3형(앵커 단신 → 전면 인용 카드 직행)의 서명이므로, 띠 이벤트 원 지점이
    // 인용 카드인지 확인해 경계로 채택한다. 성금 카드는 프롬프트가 false로 가른다.
    const area = indexSource.slice(indexSource.indexOf("§173 3형 카드 확인"));
    assert.match(area.slice(0, 2400), /quoteCardOnly: true/u, "카드 판정 프롬프트가 배선돼야 한다");
    assert.match(area.slice(0, 2400), /cardVote\.confidence >= RESCUE_ANCHOR_MIN_CONFIDENCE/u, "회수 임계를 써야 한다");
    // 연속성 통과(중간점 비앵커) 분기와 배타적이어야 한다 — 같은 지점을 이중 채택하면 안 된다.
    // 한도 가드(&& !cardBudgetStopped)가 붙어도 "중간점이 앵커일 때만"이라는 조건은 유지돼야 한다.
    assert.match(area.slice(0, 700), /else if \(midHits\.get\(mid\) === true/u, "기각 분기에서만 발동해야 한다");
  });

  it("유료 비전 호출은 전부 runVisionBatch를 거친다 — 직접 호출은 한도·비용 집계 밖(안정화 감사)", () => {
    // 카드 확인(§173)·칼럼 확인(§170)이 rescueClient를 직접 불러 일일 한도가 걸리지 않았다.
    // classifyAnchorShots 호출 지점마다 앞쪽에 runVisionBatch가 있어야 한다.
    const calls = [...indexSource.matchAll(/rescueClient\.classifyAnchorShots/gu)].map((match) => match.index ?? 0);
    assert.ok(calls.length >= 5, `회수 경로 비전 호출이 예상보다 적다: ${calls.length}`);
    for (const at of calls) {
      const before = indexSource.slice(Math.max(0, at - 400), at);
      assert.match(before, /runVisionBatch\(/u, `runVisionBatch를 거치지 않는 직접 호출이 있다(offset ${at})`);
    }
  });

  it("2표 합의·카드 확인 루프가 한도 도달 시 멈춘다 — 예산 소진을 '비전 기각'으로 위장하지 않는다", () => {
    const confirmArea = indexSource.slice(indexSource.indexOf("2표 합의 확인"));
    assert.match(confirmArea.slice(0, 3500), /confirmBudgetStopped = true/u, "2표 합의에 한도 중단이 없다");
    assert.match(confirmArea.slice(0, 3500), /한도로 미확인 → 기각\(비전 판정 아님\)/u, "한도 기각을 판정과 구별하는 로그가 없다");
    const cardArea = indexSource.slice(indexSource.indexOf("§173 3형 카드 확인"));
    assert.match(cardArea.slice(0, 2600), /cardBudgetStopped = true/u, "카드 확인에 한도 중단이 없다");
  });

  it("카드 확인 실패는 로그를 남긴다 — 무성 catch면 '카드 아님'과 구별 불가(안정화 감사)", () => {
    const cardArea = indexSource.slice(indexSource.indexOf("§173 3형 카드 확인"));
    const body = cardArea.slice(0, 2600);
    assert.match(body, /3형 카드 확인 .{0,40}실패/u, "카드 확인 실패 경고가 없다");
    assert.match(body, /프레임 내보내기 유실/u, "내보내기 유실을 판정과 구별하는 로그가 없다");
  });

  it("검증 통째 실패는 무료 경로로 실제 강등된다 — 플래그·문구·toast(§182 감사 #1·#2)", () => {
    // 종전에는 catch가 문구만 남기고 플래그를 안 내려, 무료 유일 방어(§149 띠 검사)가
    // 꺼진 채 완주했다. 강등 대입이 catch 안에 있어야 한다.
    const at = indexSource.indexOf("비전 검증 실패 — 무료 경로로 강등");
    assert.ok(at > 0, "강등 문구가 없다");
    assert.match(indexSource.slice(Math.max(0, at - 600), at), /visionEnabled = false;/u, "강등 대입이 catch 안에 있어야 한다");
    assert.match(indexSource.slice(at, at + 400), /toast\("비전 검증이 실패해/u, "강등 toast가 있어야 한다");
  });

  it("검증 한도 도달은 회수 단계까지 전파된다(§182 감사 #3)", () => {
    assert.match(indexSource, /verifyBudgetStopped = true;/u, "한도 전파 대입이 없다");
    assert.match(indexSource, /if \(visionEnabled && !verifyBudgetStopped\) \{/u, "회수 게이트가 한도를 반영해야 한다");
    assert.match(indexSource, /검증 단계에서 한도 도달 — 놓친 경계 회수를 생략/u, "회수 생략 로그가 없다");
  });

  it("설정 OFF·DOM 결손의 비전 생략도 로그를 남긴다(§182 감사 #5)", () => {
    assert.match(indexSource, /비전 검증 생략 — 설정에서 꺼져 있어/u, "생략 로그가 없다");
  });

  it("무료 경로 하단 띠 검사는 비전 OFF에서만 켜진다 — §149 불변식", () => {
    assert.match(indexSource, /if \(verified\.length > 1 && !visionEnabled\) \{/u, "무료 전용 게이트가 없다");
  });

  it("직접 렌더 파일명은 타임스탬프 규약을 쓴다 — 같은 날 재실행 무경고 덮어쓰기 방지(§183)", () => {
    const premiereSource = readFileSync(path.join(ROOT, "src", "premiere.ts"), "utf8");
    const at = premiereSource.indexOf("렌더 요청이 거부되었습니다");
    assert.ok(at > 0, "직접 렌더 블록이 없다");
    assert.match(premiereSource.slice(Math.max(0, at - 2200), at), /const filename = buildExportFilename\(name, extension\);/u, "직접 렌더가 타임스탬프 파일명을 써야 한다");
  });

  it("렌더 안정화 폴러는 실패 경로에서도 꺼진다 — finally 취소(§183 감사 #4)", () => {
    const premiereSource = readFileSync(path.join(ROOT, "src", "premiere.ts"), "utf8");
    const spots = [...premiereSource.matchAll(/awaitStableExportOutput\(/gu)].map((m) => m.index ?? 0).filter((at) => premiereSource.slice(at - 400, at).includes("Promise.race"));
    assert.ok(spots.length >= 2, "레이스 호출부가 예상보다 적다");
    for (const at of spots) {
      assert.match(premiereSource.slice(at, at + 400), /\} finally \{/u, "레이스 뒤 finally 취소가 있어야 한다");
    }
  });

  it("내보내기 부분 실패는 토스트에도 실패 개수를 싣는다(§183 감사 #5)", () => {
    assert.match(indexSource, /내보내기 완료 — 성공 .{0,40}실패/u, "직접 렌더 실패 토스트가 없다");
    assert.match(indexSource, /대기열 추가 — 성공 .{0,40}실패/u, "AME 실패 토스트가 없다");
  });

  it("원클릭의 내보내기 단계 실패는 '분할 실패'로 위장되지 않는다(§183 감사 #5)", () => {
    assert.match(indexSource, /분할은 완료됐으나 내보내기 단계에서 실패/u, "후반 실패 고지가 없다");
    assert.match(indexSource, /분할 완료 · 내보내기 실패/u, "후반 실패 토스트가 없다");
  });

  it("정리 버튼의 개수 계산과 실제 삭제가 같은 패턴 상수를 쓴다(§184 감사 #1)", () => {
    const premiereSource = readFileSync(path.join(ROOT, "src", "premiere.ts"), "utf8");
    assert.match(indexSource, /NEWS_ITEM_SEQUENCE_PATTERN\.test\(name\)/u, "개수 계산이 공용 상수를 써야 한다");
    assert.match(premiereSource, /NEWS_ITEM_SEQUENCE_PATTERN\.test\(String\(sequence\.name\)\)/u, "삭제가 공용 상수를 써야 한다");
    const inline = [...indexSource.matchAll(/\^\d\{8\}_news_/gu)];
    assert.equal(inline.length, 0, "index.ts에 인라인 아이템 정규식이 남아 있다");
  });

  it("시퀀스 생성 시작 시 이전 배치 목록을 비운다(§184 감사 #13)", () => {
    const at = indexSource.indexOf("const startIndex = nextNewsItemIndex(");
    assert.ok(at > 0);
    assert.match(indexSource.slice(Math.max(0, at - 700), at), /newsCutCreatedNames = \[\];/u, "생성 시작 전에 이전 배치를 비워야 한다");
  });

  it("생성 인덱스 조회 실패는 무음이 아니라 경고를 남긴다(§186-b)", () => {
    const at = indexSource.indexOf("const existingNames = await listSequenceNames().catch(");
    assert.ok(at > 0, "조회 실패 처리 블록이 있어야 한다");
    assert.match(indexSource.slice(at, at + 400), /activity\.add\("warning"/u, "실패 시 경고 고지가 있어야 한다");
  });

  it("다국어 내보내기는 표시 자막이 0이면 번역 전에 중단한다(§186-b)", () => {
    const at = indexSource.indexOf("async function handleMultilangExport");
    assert.ok(at > 0);
    assert.match(indexSource.slice(at, at + 900), /cue\.enabled && !cue\.hidden/u, "0바이트 SRT 성공 집계를 막는 보이는 큐 가드가 있어야 한다");
  });

  it("타임코드 없는 STT 원고는 자막 미변환을 고지한다(§186-b)", () => {
    const at = indexSource.indexOf("transcript.result.segments.length === 0");
    assert.ok(at > 0, "타임코드 부재 분기가 있어야 한다");
    assert.match(indexSource.slice(at, at + 300), /activity\.add\("warning"/u, "무고지 건너뜀이면 안 된다");
  });

  it("내보내기는 생성 시점 GUID를 1차 키로 전달한다(§184 #14)", () => {
    const at = indexSource.indexOf("queueSequenceExportsByName(newsCutCreatedNames, presetFile, outputFolder");
    assert.ok(at > 0);
    assert.match(
      indexSource.slice(at, at + 140),
      /newsCutCreatedGuids\)/u,
      "이름만 전달하면 동명 시퀀스에서 다른 대상을 내보낼 수 있다",
    );
    // 생성·초기화가 이름과 GUID를 함께 다뤄야 인덱스 1:1 동기가 유지된다.
    assert.match(indexSource, /newsCutCreatedGuids = result\.createdGuids;/u);
    const fallbackAt = indexSource.indexOf("usedNameFallback.length > 0");
    assert.ok(fallbackAt > 0, "GUID 미일치 이름 폴백은 경고 고지가 있어야 한다");
  });

  it("원클릭 분할은 스캔 전에 내보내기 전제를 전체 선검증한다(§183)", () => {
    const at = indexSource.indexOf("async function runNewsCutAutoFlow");
    assert.ok(at > 0);
    // 프리셋 파일 실재·폴더 토큰까지 클릭 시점에 확인해야 스캔·AI 비용 낭비를 막는다.
    assert.match(
      indexSource.slice(at, at + 900),
      /if \(exportAfter\) await resolveNewsCutExportTargets\(\);/u,
      "스캔 전에 resolveNewsCutExportTargets 선검증이 있어야 한다",
    );
  });

  it("자동 편집은 저널 영속화 완료 후에 변경을 진행한다(§186 감사 #6)", () => {
    const at = indexSource.indexOf("operationId = entry.operationId;");
    assert.ok(at > 0);
    assert.match(indexSource.slice(at, at + 500), /await recoveryManager\.flushPersistence\(\);/u, "begin 직후 영속화 대기가 있어야 한다");
  });

  it("복구 저널 복원 실패 시 추적을 끄지 않고 백업 후 재시작한다(§186 감사 #15)", () => {
    const at = indexSource.indexOf("복구 기록 초기화 실패");
    assert.ok(at > 0);
    const before = indexSource.slice(Math.max(0, at - 1600), at);
    assert.match(before, /RECOVERY_STORAGE_KEY\}\.corrupt/u, "손상 저널을 백업 키로 옮겨야 한다");
    assert.match(before, /removeItem\(RECOVERY_STORAGE_KEY\)/u, "손상 원본 키를 지워 반복 실패를 끊어야 한다");
    assert.match(before, /recoveryManager = new RecoveryManager\(\{ storage: browserStorage \}\)/u, "빈 저널로 추적을 재개해야 한다");
  });

  it("칼럼 시작을 확정하면 그 블록 안의 회수분을 버린다 — 칼럼은 통째로 하나(§170-d)", () => {
    // 판정 자체는 news-visual-cut의 columnMidRescueDrops(단위 테스트 별도)로 추출됐다.
    // 여기서는 배선만 확인한다 — 인라인 재구현으로 되돌아가면 단위 테스트가 무력화된다.
    const area = indexSource.slice(indexSource.indexOf("칼럼 시작 회수 · "));
    const body = area.slice(0, area.indexOf("standingStarts]"));
    assert.match(body, /columnMidRescueDrops\(standingStarts, verifiedBeforeRescue, verified\)/u, "폐기 판정은 추출 함수를 거쳐야 한다");
  });
});
