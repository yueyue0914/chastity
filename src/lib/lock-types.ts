export type LockStatus = "active" | "ended" | "emergency_ended";

export type HygienePenaltyMode = "fixed" | "multiplier";

export type LockOptions = {
  allowEmergency: boolean;
  allowHygiene: boolean;
  /** Max temporary unlock for hygiene, in ms. */
  hygieneMaxMs: number;
  /** How overtime is converted into added lock time. */
  hygienePenaltyMode: HygienePenaltyMode;
  /** Fixed duration added once when overtime occurs (mode = fixed). */
  hygienePenaltyFixedMs: number;
  /** Overtime × this multiplier is added (mode = multiplier). */
  hygienePenaltyMultiplier: number;
  notifyExpiry: boolean;
};

export type LockRecord = {
  id: string;
  wearerToken: string;
  keyholderToken: string;
  startedAt: number;
  durationMs: number;
  endsAt: number;
  allowEmergency: boolean;
  allowHygiene: boolean;
  hygieneMaxMs: number;
  hygienePenaltyMode: HygienePenaltyMode;
  hygienePenaltyFixedMs: number;
  hygienePenaltyMultiplier: number;
  notifyExpiry: boolean;
  /** When set, hygiene temporary unlock is in progress. */
  hygieneStartedAt: number | null;
  status: LockStatus;
};

export type CreateLockInput = {
  durationMs: number;
} & LockOptions;

export const DEFAULT_HYGIENE_MAX_MS = 15 * 60_000;
export const DEFAULT_HYGIENE_PENALTY_FIXED_MS = 15 * 60_000;
export const DEFAULT_HYGIENE_PENALTY_MULTIPLIER = 1;
export const MIN_DURATION_MS = 60_000;
export const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
export const LOCK_STORAGE_KEY = "yue-lock:v3";

function isPenaltyMode(value: unknown): value is HygienePenaltyMode {
  return value === "fixed" || value === "multiplier";
}

export function isLockRecord(value: unknown): value is LockRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.wearerToken === "string" &&
    typeof r.keyholderToken === "string" &&
    typeof r.startedAt === "number" &&
    typeof r.durationMs === "number" &&
    typeof r.endsAt === "number" &&
    typeof r.allowEmergency === "boolean" &&
    typeof r.allowHygiene === "boolean" &&
    typeof r.hygieneMaxMs === "number" &&
    isPenaltyMode(r.hygienePenaltyMode) &&
    typeof r.hygienePenaltyFixedMs === "number" &&
    typeof r.hygienePenaltyMultiplier === "number" &&
    typeof r.notifyExpiry === "boolean" &&
    (r.hygieneStartedAt === null || typeof r.hygieneStartedAt === "number") &&
    (r.status === "active" ||
      r.status === "ended" ||
      r.status === "emergency_ended")
  );
}

export function isLockReady(lock: LockRecord, now: number): boolean {
  return lock.status === "active" && now >= lock.endsAt;
}

export function remainingMs(lock: LockRecord, now: number): number {
  if (lock.status !== "active") return 0;
  return Math.max(0, lock.endsAt - now);
}

export function isHygieneActive(lock: LockRecord): boolean {
  return lock.status === "active" && lock.hygieneStartedAt != null;
}

export function hygieneElapsedMs(lock: LockRecord, now: number): number {
  if (lock.hygieneStartedAt == null) return 0;
  return Math.max(0, now - lock.hygieneStartedAt);
}

export function hygieneRemainingMs(lock: LockRecord, now: number): number {
  if (lock.hygieneStartedAt == null) return 0;
  return Math.max(0, lock.hygieneMaxMs - hygieneElapsedMs(lock, now));
}

export function hygieneOvertimeMs(lock: LockRecord, now: number): number {
  if (lock.hygieneStartedAt == null) return 0;
  return Math.max(0, hygieneElapsedMs(lock, now) - lock.hygieneMaxMs);
}

/** Penalty duration to add when ending a hygiene session with overtime. */
export function computeHygienePenaltyMs(
  lock: Pick<
    LockRecord,
    "hygienePenaltyMode" | "hygienePenaltyFixedMs" | "hygienePenaltyMultiplier"
  >,
  overtimeMs: number,
): number {
  if (overtimeMs <= 0) return 0;
  if (lock.hygienePenaltyMode === "fixed") {
    return Math.max(0, lock.hygienePenaltyFixedMs);
  }
  const mult = Math.max(0, lock.hygienePenaltyMultiplier);
  return Math.round(overtimeMs * mult);
}

export function describeHygienePenalty(
  lock: Pick<
    LockRecord,
    | "hygienePenaltyMode"
    | "hygienePenaltyFixedMs"
    | "hygienePenaltyMultiplier"
  >,
): string {
  if (lock.hygienePenaltyMode === "fixed") {
    return `固定加时`;
  }
  const m = lock.hygienePenaltyMultiplier;
  const label = Number.isInteger(m) ? `${m}` : m.toFixed(1);
  return `${label}× 倍率`;
}

export function clampDurationMs(durationMs: number): number {
  return Math.max(MIN_DURATION_MS, Math.min(durationMs, MAX_DURATION_MS));
}

export function clampHygienePenaltyMultiplier(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_HYGIENE_PENALTY_MULTIPLIER;
  return Math.max(0.5, Math.min(value, 10));
}

export function clampHygienePenaltyFixedMs(value: number): number {
  return Math.max(60_000, Math.min(value, 7 * 24 * 60 * 60_000));
}
