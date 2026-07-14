// 프레임 샘플들의 인물 감지 점을 컷 초점(focal)으로 종합하는 순수 판단 로직
export interface SubjectPoint {
  x: number;
  y: number;
  confidence: number;
}

export interface SubjectFocalOptions {
  // 이 미만 confidence 샘플은 버린다(인물 없음/불확실).
  minConfidence: number;
  // 샘플 간 x 편차가 이 이하면 같은 인물 위치로 보고 평균, 넘으면 카메라 교차로 보고 절충.
  agreementSpread: number;
}

export const DEFAULT_SUBJECT_FOCAL_OPTIONS: Readonly<SubjectFocalOptions> = Object.freeze({
  minConfidence: 0.3,
  agreementSpread: 0.2,
});

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * 여러 프레임의 인물 감지 점을 하나의 초점으로 종합한다. 결정적 순수 함수.
 * - 유효(유한·confidence≥min) 샘플만 사용, 없으면 null(호출부는 슬라이더 초점 폴백).
 * - x 편차 ≤ agreementSpread → 평균(안정된 인물 위치).
 * - 편차 초과 → 카메라 교차로 판단, x=0.5 절충(어느 샷에서도 최악을 피함). y는 평균 유지.
 */
export function resolveSubjectFocal(
  points: readonly SubjectPoint[],
  options?: Partial<SubjectFocalOptions>,
): { x: number; y: number } | null {
  const minConfidence = typeof options?.minConfidence === "number" && Number.isFinite(options.minConfidence)
    ? clamp01(options.minConfidence)
    : DEFAULT_SUBJECT_FOCAL_OPTIONS.minConfidence;
  const agreementSpread = typeof options?.agreementSpread === "number" && Number.isFinite(options.agreementSpread)
    ? Math.max(0, options.agreementSpread)
    : DEFAULT_SUBJECT_FOCAL_OPTIONS.agreementSpread;

  const valid = (Array.isArray(points) ? points : [])
    .filter((point) => point
      && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.confidence)
      && point.confidence >= minConfidence)
    .map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) }));
  if (valid.length === 0) return null;

  const xs = valid.map((point) => point.x);
  const spread = Math.max(...xs) - Math.min(...xs);
  const meanY = valid.reduce((sum, point) => sum + point.y, 0) / valid.length;
  if (spread <= agreementSpread) {
    const meanX = xs.reduce((sum, x) => sum + x, 0) / valid.length;
    return { x: round3(meanX), y: round3(meanY) };
  }
  return { x: 0.5, y: round3(meanY) };
}
