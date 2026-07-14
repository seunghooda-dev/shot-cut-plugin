// 생성된 숏폼의 프레이밍(초점 X/Y·줌)을 컷 단위로 수동 조정·재적용하는 패널 모듈
import { adjustFocalSpans, type FocalSpan } from "./shot-focus";
import {
  loadShotPlans,
  pruneShotPlans,
  removeShotPlan,
  updateShotPlanSpans,
  type ShotPlanRecord,
} from "./shot-plan-store";
import { clearChildren, optionalElement, setText, toast } from "./ui";

export interface AdjustPanelOptions {
  /** 스팬을 시퀀스 키프레임으로 재적용한다(premiere.applyShotFocalAdjustment 주입). */
  applyAdjustment: (
    record: ShotPlanRecord,
    spans: FocalSpan[],
  ) => Promise<{ changed: number; warnings: string[] }>;
  /** 프로젝트의 현재 시퀀스 이름 목록(없어진 시퀀스 계획 정리용). */
  listSequenceNames: () => Promise<string[]>;
  /** 숏폼의 지정 시각(숏폼 로컬 초) 프레임 PNG 바이트(미리보기용). 실패·미지원이면 null. */
  exportPreviewFrame?: (record: ShotPlanRecord, seconds: number) => Promise<Uint8Array | null>;
  runBusy: <T>(message: string, task: () => Promise<T>) => Promise<T>;
  onActivity: (level: "info" | "success" | "warning" | "error", message: string) => void;
}

function sliderValue(id: string, fallback: number): number {
  const input = optionalElement<HTMLInputElement>(id);
  const value = input ? Number(input.value) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

function setSlider(id: string, value: number): void {
  const input = optionalElement<HTMLInputElement>(id);
  if (input) input.value = String(value);
}

function describePlan(plan: ShotPlanRecord): string {
  const seconds = Math.round(plan.segment.end - plan.segment.start);
  return `${plan.sequenceName} · ${plan.spans.length}샷 · ${seconds}초`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.byteLength; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function createAdjustPanel(options: AdjustPanelOptions): { refresh: () => void } {
  let plans: ShotPlanRecord[] = [];
  // 미리보기 경합 가드 — 마지막 요청의 결과만 반영한다.
  let previewToken = 0;

  const selectedPlan = (): ShotPlanRecord | null => {
    const select = optionalElement<HTMLSelectElement>("adjust-plan-select");
    if (!select || !select.value) return null;
    return plans.find((plan) => plan.sequenceName === select.value) ?? null;
  };

  /** 선택한 숏폼의 첫 스팬 중앙 프레임을 미리보기로 그린다(스팬 시각은 원본 기준 → 숏폼 로컬로 변환). */
  const renderPreview = async (): Promise<void> => {
    const image = optionalElement<HTMLImageElement>("adjust-preview");
    if (!image) return;
    const plan = selectedPlan();
    const port = options.exportPreviewFrame;
    previewToken += 1;
    const token = previewToken;
    image.hidden = true;
    if (!plan || !port || plan.spans.length === 0) return;
    const span = plan.spans[0]!;
    const localSeconds = Math.max(0, (span.start + span.end) / 2 - plan.segment.start);
    try {
      const bytes = await port(plan, localSeconds);
      if (token !== previewToken || !bytes || bytes.byteLength === 0) return;
      image.src = `data:image/png;base64,${bytesToBase64(bytes)}`;
      image.hidden = false;
    } catch {
      // 미리보기는 보조 기능 — 실패는 조용히 숨김 유지(일부 시퀀스는 프레임 내보내기가 거부될 수 있다).
    }
  };

  const renderValues = (): void => {
    setText("adjust-dx-value", sliderValue("adjust-dx-input", 0).toFixed(2));
    setText("adjust-dy-value", sliderValue("adjust-dy-input", 0).toFixed(2));
    setText("adjust-zoom-value", `${sliderValue("adjust-zoom-input", 1).toFixed(2)}×`);
  };

  const renderInfo = (): void => {
    const plan = selectedPlan();
    if (!plan) {
      setText("adjust-info", plans.length === 0
        ? "저장된 프레이밍 계획이 없습니다. 자동 컷 생성(추적 모드) 후 사용할 수 있습니다."
        : "조정할 숏폼을 선택해 주세요.");
      return;
    }
    const zooms = plan.spans.filter((span) => typeof span.zoom === "number" && span.zoom > 1.01).length;
    setText(
      "adjust-info",
      `${plan.segment.title || plan.sequenceName} · 샷 ${plan.spans.length}개(펀치인 ${zooms}) · 초점 x ${plan.spans.map((span) => span.x.toFixed(2)).join("→")}`,
    );
  };

  const render = (): void => {
    const select = optionalElement<HTMLSelectElement>("adjust-plan-select");
    if (!select) return;
    const previous = select.value;
    clearChildren(select); // UXP replaceChildren 스테일 버그 회피(§25-b)
    for (const plan of plans) {
      const option = document.createElement("option");
      option.value = plan.sequenceName;
      option.textContent = describePlan(plan);
      select.appendChild(option);
    }
    if (previous && plans.some((plan) => plan.sequenceName === previous)) {
      select.value = previous;
    } else if (plans.length > 0) {
      // UXP는 옵션 재구성 후 value를 자동 선택하지 않을 수 있다 — 첫 계획을 기본 선택.
      select.value = plans[0]!.sequenceName;
    }
    const disabled = plans.length === 0;
    for (const id of ["adjust-apply-btn", "adjust-reset-btn", "adjust-remove-btn"]) {
      const button = optionalElement<HTMLButtonElement>(id);
      if (button) button.disabled = disabled;
    }
    renderValues();
    renderInfo();
    void renderPreview();
  };

  const refresh = (): void => {
    plans = loadShotPlans();
    render();
  };

  /** 프로젝트에 없는 시퀀스의 계획을 정리한 뒤 다시 그린다(실패 시 정리 없이 로드만). */
  const refreshWithPrune = async (): Promise<void> => {
    try {
      const names = await options.listSequenceNames();
      plans = pruneShotPlans(names);
    } catch {
      plans = loadShotPlans();
    }
    render();
  };

  const applySpans = async (plan: ShotPlanRecord, spans: FocalSpan[], label: string): Promise<void> => {
    const result = await options.runBusy(`${label} 키프레임을 재적용하고 있습니다…`, () =>
      options.applyAdjustment(plan, spans));
    result.warnings.forEach((warning) => options.onActivity("warning", warning));
    if (result.changed === 0) {
      toast("적용된 클립이 없습니다. 시퀀스가 비어 있거나 삭제됐을 수 있습니다.", "warning");
      return;
    }
    plans = updateShotPlanSpans(plan.sequenceName, spans);
    render();
    options.onActivity("success", `프레이밍 ${label} · ${plan.sequenceName} (클립 ${result.changed})`);
    toast(`${label}했습니다. 프로그램 모니터에서 확인해 주세요.`, "success");
  };

  const handleApply = async (): Promise<void> => {
    const plan = selectedPlan();
    if (!plan) {
      toast("조정할 숏폼을 먼저 선택해 주세요.", "warning");
      return;
    }
    const adjusted = adjustFocalSpans(plan.spans, {
      dx: sliderValue("adjust-dx-input", 0),
      dy: sliderValue("adjust-dy-input", 0),
      zoomScale: sliderValue("adjust-zoom-input", 1),
    });
    await applySpans(plan, adjusted, "조정");
    setSlider("adjust-dx-input", 0);
    setSlider("adjust-dy-input", 0);
    setSlider("adjust-zoom-input", 1);
    renderValues();
  };

  const handleReset = async (): Promise<void> => {
    const plan = selectedPlan();
    if (!plan) return;
    await applySpans(plan, plan.originalSpans.map((span) => ({ ...span })), "원본 복원");
    setSlider("adjust-dx-input", 0);
    setSlider("adjust-dy-input", 0);
    setSlider("adjust-zoom-input", 1);
    renderValues();
  };

  const handleRemove = (): void => {
    const plan = selectedPlan();
    if (!plan) return;
    plans = removeShotPlan(plan.sequenceName);
    render();
    options.onActivity("info", `프레이밍 계획 삭제 · ${plan.sequenceName}`);
  };

  optionalElement<HTMLButtonElement>("adjust-refresh-btn")?.addEventListener("click", () => {
    void refreshWithPrune();
  });
  optionalElement<HTMLButtonElement>("adjust-apply-btn")?.addEventListener("click", () => {
    void handleApply().catch((error) => {
      options.onActivity("error", `프레이밍 조정 실패: ${error instanceof Error ? error.message : String(error)}`);
      toast("프레이밍 조정에 실패했습니다. 활동 로그를 확인해 주세요.", "error");
    });
  });
  optionalElement<HTMLButtonElement>("adjust-reset-btn")?.addEventListener("click", () => {
    void handleReset().catch((error) => {
      options.onActivity("error", `프레이밍 복원 실패: ${error instanceof Error ? error.message : String(error)}`);
      toast("프레이밍 복원에 실패했습니다. 활동 로그를 확인해 주세요.", "error");
    });
  });
  optionalElement<HTMLButtonElement>("adjust-remove-btn")?.addEventListener("click", handleRemove);
  optionalElement<HTMLSelectElement>("adjust-plan-select")?.addEventListener("change", () => {
    renderInfo();
    void renderPreview();
  });
  for (const id of ["adjust-dx-input", "adjust-dy-input", "adjust-zoom-input"]) {
    optionalElement<HTMLInputElement>(id)?.addEventListener("input", renderValues);
  }

  refresh();
  return { refresh };
}
