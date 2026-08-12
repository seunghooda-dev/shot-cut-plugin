export type LogLevel = "info" | "success" | "warning" | "error";

export function redactUiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "알 수 없는 오류");
  return raw
    .replace(/(authorization\s*[:=]\s*)bearer\s+[^\s,;"'}]+/giu, "$1Bearer [REDACTED]")
    .replace(/\bbearer\s+[a-z0-9._~+/-]{8,}/giu, "Bearer [REDACTED]")
    .replace(/\b(?:sk|sess)-[a-z0-9_-]{8,}\b/giu, "[REDACTED]")
    .replace(/("?(?:api[_-]?key|password|secret|token)"?\s*[:=]\s*["']?)[^\s,"'}]+/giu, "$1[REDACTED]")
    .replace(/[\u0000-\u001f\u007f]+/gu, " ")
    .trim()
    .slice(0, 2_000);
}

export function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`필수 UI 요소를 찾지 못했습니다: #${id}`);
  }
  return found as T;
}

export function optionalElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function valueOf(id: string): string {
  const control = element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
  // UXP는 값이 비거나 사용자가 건드리기 전 <input>/<select>.value로 null을 돌려줄 수 있어,
  // 이후 .trim()/.normalize() 호출이 크래시하지 않도록 항상 문자열을 반환한다.
  return control.value ?? "";
}

export function numberOf(id: string, fallback: number): number {
  // 빈 입력은 Number("")===0이 되어 0으로 잘못 읽히므로 fallback으로 처리한다.
  const raw = valueOf(id).trim();
  if (raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function checkedOf(id: string): boolean {
  return element<HTMLInputElement>(id).checked;
}

export function setText(id: string, text: string, title?: string): void {
  const target = optionalElement<HTMLElement>(id);
  if (!target) return;
  target.textContent = text;
  if (title !== undefined) target.setAttribute("title", title);
}

export function setValue(id: string, value: string | number): void {
  const target = optionalElement<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
  if (target) target.value = String(value);
}

// 경로/파일 선택 상태 표시. 선택되면 .is-set 클래스로 강조색·체크마크가 붙어 한눈에 띈다.
export function setPathValue(id: string, value: string, isSet: boolean, title?: string): void {
  const target = optionalElement<HTMLElement>(id);
  if (!target) return;
  target.textContent = value;
  // 일부 목 DOM에는 classList가 없어 방어한다(실 Host UXP DOM에는 존재).
  if (typeof target.classList?.toggle === "function") target.classList.toggle("is-set", isSet);
  if (title !== undefined) target.setAttribute("title", title);
}

export function setChecked(id: string, checked: boolean): void {
  const target = optionalElement<HTMLInputElement>(id);
  if (target) target.checked = checked;
}

export function bind(
  id: string,
  eventName: string,
  listener: (event: Event) => void | Promise<void>,
): void {
  const target = optionalElement<HTMLElement>(id);
  if (!target) return;
  target.addEventListener(eventName, (event) => {
    try {
      const result = listener(event);
      if (result && typeof result.catch === "function") {
        void result.catch((error: unknown) => console.error(redactUiError(error)));
      }
    } catch (error) {
      console.error(redactUiError(error));
    }
  });
}

let tabsInitialized = false;

function tabLabel(tab: HTMLElement): string {
  return (tab.textContent ?? "").replace(/^\s*\d+\s*/u, "").trim() || "메뉴";
}

// 현재 섹션 라벨을 접이식 내비 토글에 반영하고, 클릭/초기화(focus=false)일 때는 내비를 접는다.
// 키보드 화살표 이동(focus=true) 중에는 펼친 상태를 유지해 계속 탐색할 수 있게 한다.
function updateNavToggle(activeTab: HTMLElement, collapse: boolean): void {
  const nav = document.querySelector<HTMLElement>(".workflow-nav");
  if (!nav) return;
  const label = nav.querySelector<HTMLElement>(".nav-toggle-label");
  if (label) label.textContent = tabLabel(activeTab);
  const indexChip = nav.querySelector<HTMLElement>(".nav-toggle-index");
  if (indexChip) indexChip.textContent = activeTab.querySelector(".tab-index")?.textContent?.trim() ?? "";
  if (collapse) {
    nav.classList.remove("is-expanded");
    nav.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
  }
}

function activateWorkflowTab(tab: HTMLButtonElement, focus = false): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(".nav-tab[data-tab]")];
  const panels = [...document.querySelectorAll<HTMLElement>(".workflow-panel[data-panel]")];
  const id = tab.dataset.tab;
  if (!id) return;
  for (const candidate of tabs) {
    const active = candidate === tab;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-selected", String(active));
    candidate.tabIndex = active ? 0 : -1;
  }
  for (const panel of panels) {
    const active = panel.dataset.panel === id;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  }
  updateNavToggle(tab, !focus);
  if (focus) tab.focus();
}

function workflowTabFromEvent(event: Event): HTMLButtonElement | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const tab = target.closest<HTMLButtonElement>(".nav-tab[data-tab]");
  return tab instanceof HTMLButtonElement ? tab : null;
}

export function setupTabs(): void {
  if (tabsInitialized) return;
  tabsInitialized = true;

  document.addEventListener("click", (event) => {
    const tab = workflowTabFromEvent(event);
    if (!tab) return;
    event.preventDefault();
    activateWorkflowTab(tab);
  }, true);

  const navToggle = document.getElementById("nav-toggle");
  const toggleNav = (): void => {
    if (!navToggle) return;
    const nav = navToggle.closest<HTMLElement>(".workflow-nav");
    const expanded = nav?.classList.toggle("is-expanded") ?? false;
    navToggle.setAttribute("aria-expanded", String(expanded));
  };
  navToggle?.addEventListener("click", toggleNav);
  // div role=button이라 키보드 활성화를 직접 처리한다(Enter/Space).
  navToggle?.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleNav();
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    const tab = workflowTabFromEvent(event);
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll<HTMLButtonElement>(".nav-tab[data-tab]")];
    const index = tabs.indexOf(tab);
    let nextIndex = index < 0 ? 0 : index;
    if (event.key === "ArrowLeft") nextIndex = (nextIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") nextIndex = (nextIndex + 1) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    const next = tabs[nextIndex];
    if (next) activateWorkflowTab(next, true);
  }, true);

  const initial = document.querySelector<HTMLButtonElement>(".nav-tab.is-active[data-tab]")
    ?? document.querySelector<HTMLButtonElement>(".nav-tab[data-tab]");
  if (initial) activateWorkflowTab(initial);
}

function clockText(date = new Date()): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export class ActivityLog {
  private readonly target: HTMLOListElement | null;

  // onEntry(지속 로그 싱크) — DOM 표시와 별개로 모든 항목을 받아 파일 로그 등에 흘린다.
  // DOM 타깃이 없어도 호출된다(재로드 직후·헤드리스에서도 기록이 남아야 진단이 된다).
  constructor(id = "log-list", private readonly onEntry?: (level: LogLevel, message: string) => void) {
    this.target = optionalElement<HTMLOListElement>(id);
  }

  add(level: LogLevel, message: string): void {
    try {
      this.onEntry?.(level, message);
    } catch { /* 싱크 실패가 UI 로그를 막으면 안 된다 */ }
    if (!this.target) return;
    const empty = this.target.querySelector(".log-empty");
    empty?.remove();
    const item = document.createElement("li");
    item.className = `log-entry log-${level}`;

    const time = document.createElement("time");
    time.textContent = clockText();
    const badge = document.createElement("span");
    badge.className = "log-level";
    badge.textContent = level.toUpperCase();
    const body = document.createElement("span");
    body.className = "log-message";
    body.textContent = message;
    item.append(time, badge, body);
    this.target.prepend(item);
    while (this.target.children.length > 200) {
      this.target.lastElementChild?.remove();
    }
  }

  clear(): void {
    if (!this.target) return;
    clearChildren(this.target);
    const empty = document.createElement("li");
    empty.className = "log-empty";
    empty.textContent = "기록된 작업이 없습니다.";
    this.target.append(empty);
  }
}

export class BusyState {
  private readonly overlay = optionalElement<HTMLElement>("busy-overlay");
  private readonly message = optionalElement<HTMLElement>("busy-message");
  private readonly progressWrap = optionalElement<HTMLElement>("busy-progress");
  private readonly progressFill = optionalElement<HTMLElement>("busy-progress-fill");
  private readonly progressText = optionalElement<HTMLElement>("busy-progress-text");
  private readonly stepsWrap = optionalElement<HTMLElement>("busy-steps");
  private depth = 0;

  /** 다단계 작업의 단계 칩을 표시한다 — activeIndex 이전은 완료(✓), 이후는 대기. 빈 배열이면 숨김. */
  steps(labels: readonly string[], activeIndex: number): void {
    if (!this.stepsWrap) return;
    clearChildren(this.stepsWrap);
    if (labels.length === 0) {
      this.stepsWrap.hidden = true;
      return;
    }
    labels.forEach((label, index) => {
      const chip = document.createElement("span");
      chip.className = index < activeIndex ? "busy-step is-done" : index === activeIndex ? "busy-step is-active" : "busy-step";
      chip.textContent = index < activeIndex ? `✓ ${label}` : label;
      this.stepsWrap!.append(chip);
    });
    this.stepsWrap.hidden = false;
  }

  /** 진행률(0~100)을 오버레이 바에 표시한다. null이면 숨김(불확정 단계). */
  progress(percent: number | null): void {
    if (!this.progressWrap || !this.progressFill) return;
    if (percent === null || !Number.isFinite(percent)) {
      this.progressWrap.hidden = true;
      return;
    }
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.progressWrap.hidden = false;
    this.progressFill.style.width = `${clamped}%`;
    if (this.progressText) this.progressText.textContent = `${clamped}%`;
  }

  show(message: string): void {
    this.depth += 1;
    // 새 작업이 오버레이를 처음 띄울 때만 이전 진행률을 지운다(중첩 단계는 바를 유지).
    if (this.depth === 1) this.progress(null);
    if (this.message) this.message.textContent = message;
    if (this.overlay) this.overlay.hidden = false;
  }

  hide(): void {
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) {
      if (this.overlay) this.overlay.hidden = true;
      this.progress(null);
      this.steps([], 0);
    }
  }

  async during<T>(message: string, task: () => Promise<T>): Promise<T> {
    this.show(message);
    try {
      return await task();
    } finally {
      this.hide();
    }
  }
}

export function toast(message: string, level: LogLevel = "info", timeoutMs = 3200): void {
  const region = optionalElement<HTMLElement>("toast-region");
  if (!region) return;
  const item = document.createElement("div");
  item.className = `toast toast-${level}`;
  item.setAttribute("role", level === "error" ? "alert" : "status");
  item.textContent = message;
  // 긴 경고를 다 읽기 전에 사라지는 것을 보완(UX 감사 C-4) — 클릭으로 즉시 닫을 수 있게 한다.
  item.title = "클릭하여 닫기";
  item.addEventListener("click", () => item.remove());
  region.append(item);
  setTimeout(() => item.remove(), timeoutMs);
}

// Premiere 26.3 UXP can leave stale children behind after replaceChildren();
// remove explicitly when the host DOM supports it, and fall back for mock DOMs.
export function clearChildren(target: HTMLElement): void {
  if (typeof target.removeChild === "function") {
    while (target.firstChild) target.removeChild(target.firstChild);
    return;
  }
  target.replaceChildren();
}

export function renderEmptyState(target: HTMLElement, title: string, detail = ""): void {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state compact-empty-state";
  const icon = document.createElement("span");
  icon.className = "empty-state-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "◇";
  const heading = document.createElement("strong");
  heading.textContent = title;
  wrapper.append(icon, heading);
  if (detail) {
    const paragraph = document.createElement("p");
    paragraph.textContent = detail;
    wrapper.append(paragraph);
  }
  // Premiere 26.3 UXP can leave stale children behind after replaceChildren().
  while (target.firstChild) target.removeChild(target.firstChild);
  target.append(wrapper);
}
