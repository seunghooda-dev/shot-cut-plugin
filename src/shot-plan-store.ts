// 자동 컷 생성 시 숏폼별 샷 초점 계획을 영속 저장하는 모듈(컷별 수동 조정의 근거 데이터)
import type { FocalSpan } from "./shot-focus";

const SHOT_PLAN_KEY = "shortflow.shotPlans.v1";
export const MAX_SHOT_PLANS = 40;
const MAX_SPANS_PER_PLAN = 64;

export interface ShotPlanRecord {
  /** 생성된 숏폼 시퀀스 이름(고유 키). */
  sequenceName: string;
  createdAt: string;
  segment: { start: number; end: number; title: string };
  /** 마지막으로 적용된 초점 스팬(보정 패스가 돌았으면 보정 후 값, 조정 후엔 조정값). */
  spans: FocalSpan[];
  /** 생성 시점의 초점 스팬 — "원본으로 복원"의 기준. 조정으로 변하지 않는다. */
  originalSpans: FocalSpan[];
  target: { width: number; height: number };
  source: { width: number; height: number };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeSpan(value: unknown): FocalSpan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const start = finiteNumber(record.start);
  const end = finiteNumber(record.end);
  const x = finiteNumber(record.x);
  const y = finiteNumber(record.y);
  if (start === null || end === null || x === null || y === null || end <= start) return null;
  const zoom = finiteNumber(record.zoom);
  return {
    start,
    end,
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    ...(zoom !== null && zoom > 1.01 ? { zoom: Math.min(2, zoom) } : {}),
    ...(record.transition === "cut" || record.transition === "pan" ? { transition: record.transition } : {}),
  };
}

function normalizeDims(value: unknown): { width: number; height: number } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const width = finiteNumber(record.width);
  const height = finiteNumber(record.height);
  if (width === null || height === null || width <= 0 || height <= 0) return null;
  return { width, height };
}

function normalizeShotPlan(value: unknown): ShotPlanRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sequenceName = typeof record.sequenceName === "string" ? record.sequenceName.trim() : "";
  if (!sequenceName) return null;
  const target = normalizeDims(record.target);
  const source = normalizeDims(record.source);
  if (!target || !source) return null;
  const segmentRecord = record.segment && typeof record.segment === "object"
    ? record.segment as Record<string, unknown>
    : null;
  const segStart = finiteNumber(segmentRecord?.start);
  const segEnd = finiteNumber(segmentRecord?.end);
  if (segStart === null || segEnd === null || segEnd <= segStart) return null;
  const normalizeSpanList = (input: unknown): FocalSpan[] => {
    const raw = Array.isArray(input) ? input : [];
    const out: FocalSpan[] = [];
    for (const item of raw) {
      const span = normalizeSpan(item);
      if (span) out.push(span);
      if (out.length >= MAX_SPANS_PER_PLAN) break;
    }
    return out;
  };
  const spans = normalizeSpanList(record.spans);
  if (spans.length === 0) return null;
  const originalSpans = normalizeSpanList(record.originalSpans);
  return {
    sequenceName: sequenceName.slice(0, 120),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    segment: {
      start: segStart,
      end: segEnd,
      title: typeof segmentRecord?.title === "string" ? (segmentRecord.title as string).slice(0, 80) : "",
    },
    spans,
    originalSpans: originalSpans.length > 0 ? originalSpans : spans.map((span) => ({ ...span })),
    target,
    source,
  };
}

export function normalizeShotPlans(value: unknown): ShotPlanRecord[] {
  const raw = Array.isArray(value) ? value : [];
  const out: ShotPlanRecord[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const plan = normalizeShotPlan(item);
    if (!plan || seen.has(plan.sequenceName)) continue;
    seen.add(plan.sequenceName);
    out.push(plan);
    if (out.length >= MAX_SHOT_PLANS) break;
  }
  return out;
}

export function loadShotPlans(storage: Storage = localStorage): ShotPlanRecord[] {
  try {
    const raw = storage.getItem(SHOT_PLAN_KEY);
    return raw ? normalizeShotPlans(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

export function saveShotPlans(plans: ShotPlanRecord[], storage: Storage = localStorage): ShotPlanRecord[] {
  const normalized = normalizeShotPlans(plans);
  storage.setItem(SHOT_PLAN_KEY, JSON.stringify(normalized));
  return normalized;
}

/** 같은 시퀀스 이름은 교체(최신을 앞에), 상한을 넘으면 오래된 것부터 버린다. */
export function upsertShotPlan(plan: ShotPlanRecord, storage: Storage = localStorage): ShotPlanRecord[] {
  const rest = loadShotPlans(storage).filter((item) => item.sequenceName !== plan.sequenceName);
  return saveShotPlans([plan, ...rest], storage);
}

/** 조정 재적용 후 스팬만 갱신한다(다음 조정의 기준이 마지막 적용값이 되도록). */
export function updateShotPlanSpans(
  sequenceName: string,
  spans: FocalSpan[],
  storage: Storage = localStorage,
): ShotPlanRecord[] {
  const plans = loadShotPlans(storage);
  const target = plans.find((item) => item.sequenceName === sequenceName);
  if (!target) return plans;
  return saveShotPlans(
    plans.map((item) => (item.sequenceName === sequenceName ? { ...item, spans } : item)),
    storage,
  );
}

export function removeShotPlan(sequenceName: string, storage: Storage = localStorage): ShotPlanRecord[] {
  return saveShotPlans(loadShotPlans(storage).filter((item) => item.sequenceName !== sequenceName), storage);
}

/** 프로젝트에 더 이상 없는 시퀀스의 계획을 정리한다. */
export function pruneShotPlans(existingNames: readonly string[], storage: Storage = localStorage): ShotPlanRecord[] {
  const names = new Set(existingNames);
  return saveShotPlans(loadShotPlans(storage).filter((item) => names.has(item.sequenceName)), storage);
}
