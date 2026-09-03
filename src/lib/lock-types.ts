export type LockStatus = "active" | "ended" | "emergency_ended";
export type HygienePenaltyMode = "fixed" | "multiplier";
export type EmergencyLimitMode = "unlimited" | "cooldown_24h" | "once_penalty";
export type TaskRewardType = "reduce" | "unlock";
export type TaskStatus = "open" | "done";

export type LockEventKind =
  | "started"
  | "hygiene_penalty"
  | "emergency"
  | "emergency_penalty"
  | "ended"
  | "keyholder_unlock"
  | "keyholder_claim"
  | "keyholder_add_time"
  | "keyholder_sub_time"
  | "freeze"
  | "unfreeze"
  | "force_hygiene"
  | "photo_request"
  | "photo_submit"
  | "task_created"
  | "task_done"
  | "integrity_penalty"
  | "min_lock_set";

export type LockEvent = {
  id: string;
  lockId: string;
  kind: LockEventKind;
  amountMs: number;
  detail: string;
  createdAt: number;
};

export type LockTask = {
  id: string;
  lockId: string;
  title: string;
  rewardType: TaskRewardType;
  rewardMs: number;
  status: TaskStatus;
  createdAt: number;
  completedAt: number | null;
};

export type LockOptions = {
  allowEmergency: boolean;
  emergencyLimitMode: EmergencyLimitMode;
  emergencyPenaltyMs: number;
  allowHygiene: boolean;
  hygieneMaxMs: number;
  hygienePenaltyMode: HygienePenaltyMode;
  hygienePenaltyFixedMs: number;
  hygienePenaltyMultiplier: number;
  endPhrase: string;
  notifyExpiry: boolean;
  minLockMs: number;
  obedienceEnabled: boolean;
  obedienceIntervalMs: number;
  obediencePhrase: string;
};

export type LockRecord = {
  id: string;
  wearerToken: string;
  keyholderToken: string;
  startedAt: number;
  durationMs: number;
  endsAt: number;
  allowEmergency: boolean;
  emergencyLimitMode: EmergencyLimitMode;
  emergencyPenaltyMs: number;
  emergencyLastUsedAt: number | null;
  emergencyUseCount: number;
  allowHygiene: boolean;
  hygieneMaxMs: number;
  hygienePenaltyMode: HygienePenaltyMode;
  hygienePenaltyFixedMs: number;
  hygienePenaltyMultiplier: number;
  endPhrase: string;
  notifyExpiry: boolean;
  hygieneStartedAt: number | null;
  frozenAt: number | null;
  minLockMs: number;
  photoRequestActive: boolean;
  photoSubmittedAt: number | null;
  photoThumb: string | null;
  obedienceEnabled: boolean;
  obedienceIntervalMs: number;
  obediencePhrase: string;
  lastClientNow: number | null;
  integrityPenaltyCount: number;
  sessionNonce: string;
  status: LockStatus;
};

export type CreateLockInput = {
  durationMs: number;
} & LockOptions;

export const DEFAULT_HYGIENE_MAX_MS = 15 * 60_000;
export const DEFAULT_HYGIENE_PENALTY_FIXED_MS = 60 * 60_000;
export const DEFAULT_HYGIENE_PENALTY_MULTIPLIER = 2;
export const DEFAULT_EMERGENCY_PENALTY_MS = 24 * 60 * 60_000;
export const DEFAULT_END_PHRASE = "我是主人的无面锁屌latex性偶";
export const DEFAULT_OBEDIENCE_PHRASE = "服从主人";
export const DEFAULT_OBEDIENCE_INTERVAL_MS = 30 * 60_000;
export const INTEGRITY_CLOCK_PENALTY_MS = 60 * 60_000;
export const MIN_DURATION_MS = 60_000;
export const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
export const LOCK_STORAGE_KEY = "yue-lock:v5";
export const HISTORY_TOKEN_KEY = "yue-lock:history-tokens:v1";
export const CLOCK_GUARD_KEY = "yue-lock:clock-guard:v1";

function isPenaltyMode(value: unknown): value is HygienePenaltyMode {
  return value === "fixed" || value === "multiplier";
}

function isEmergencyLimitMode(value: unknown): value is EmergencyLimitMode {
  return (
    value === "unlimited" ||
    value === "cooldown_24h" ||
    value === "once_penalty"
  );
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
    isEmergencyLimitMode(r.emergencyLimitMode) &&
    typeof r.emergencyPenaltyMs === "number" &&
    (r.emergencyLastUsedAt === null || typeof r.emergencyLastUsedAt === "number") &&
    typeof r.emergencyUseCount === "number" &&
    typeof r.allowHygiene === "boolean" &&
    typeof r.hygieneMaxMs === "number" &&
    isPenaltyMode(r.hygienePenaltyMode) &&
    typeof r.hygienePenaltyFixedMs === "number" &&
    typeof r.hygienePenaltyMultiplier === "number" &&
    typeof r.endPhrase === "string" &&
    typeof r.notifyExpiry === "boolean" &&
    (r.hygieneStartedAt === null || typeof r.hygieneStartedAt === "number") &&
    (r.frozenAt === null || typeof r.frozenAt === "number") &&
    typeof r.minLockMs === "number" &&
    typeof r.photoRequestActive === "boolean" &&
    (r.photoSubmittedAt === null || typeof r.photoSubmittedAt === "number") &&
    (r.photoThumb === null || typeof r.photoThumb === "string") &&
    typeof r.obedienceEnabled === "boolean" &&
    typeof r.obedienceIntervalMs === "number" &&
    typeof r.obediencePhrase === "string" &&
    (r.lastClientNow === null || typeof r.lastClientNow === "number") &&
    typeof r.integrityPenaltyCount === "number" &&
    typeof r.sessionNonce === "string" &&
    (r.status === "active" ||
      r.status === "ended" ||
      r.status === "emergency_ended")
  );
}

/** Wall-clock used for countdown while frozen. */
export function effectiveNow(lock: LockRecord, now: number): number {
  if (lock.frozenAt != null) return lock.frozenAt;
  return now;
}

export function isFrozen(lock: LockRecord): boolean {
  return lock.status === "active" && lock.frozenAt != null;
}

export function remainingMs(lock: LockRecord, now: number): number {
  if (lock.status !== "active") return 0;
  return Math.max(0, lock.endsAt - effectiveNow(lock, now));
}

export function isTimerExpired(lock: LockRecord, now: number): boolean {
  return lock.status === "active" && effectiveNow(lock, now) >= lock.endsAt;
}

export function minLockEndsAt(lock: LockRecord): number {
  return lock.startedAt + Math.max(0, lock.minLockMs);
}

export function isMinLockMet(lock: LockRecord, now: number): boolean {
  return now >= minLockEndsAt(lock);
}

/** Wearer may self-end only when timer done, min lock met, and not frozen. */
export function canWearerEnd(lock: LockRecord, now: number): boolean {
  return (
    isTimerExpired(lock, now) &&
    isMinLockMet(lock, now) &&
    !isFrozen(lock)
  );
}

/** @deprecated use canWearerEnd / isTimerExpired */
export function isLockReady(lock: LockRecord, now: number): boolean {
  return canWearerEnd(lock, now);
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

export function canUseEmergency(
  lock: Pick<
    LockRecord,
    | "allowEmergency"
    | "emergencyLimitMode"
    | "emergencyLastUsedAt"
    | "emergencyUseCount"
  >,
  now: number,
): { ok: boolean; reason?: string } {
  if (!lock.allowEmergency) {
    return { ok: false, reason: "本次锁定未开启紧急解锁" };
  }
  if (lock.emergencyLimitMode === "once_penalty") {
    if (lock.emergencyUseCount >= 1) {
      return { ok: false, reason: "紧急解锁仅可使用一次，且已永久记入惩罚历史" };
    }
    return { ok: true };
  }
  if (lock.emergencyLimitMode === "cooldown_24h") {
    if (
      lock.emergencyLastUsedAt != null &&
      now - lock.emergencyLastUsedAt < 24 * 60 * 60_000
    ) {
      const left = 24 * 60 * 60_000 - (now - lock.emergencyLastUsedAt);
      const hours = Math.ceil(left / 3_600_000);
      return { ok: false, reason: `紧急解锁冷却中，约 ${hours} 小时后可用` };
    }
    return { ok: true };
  }
  return { ok: true };
}

export function phrasesMatch(expected: string, typed: string): boolean {
  return expected.length > 0 && typed === expected;
}

export function clampDurationMs(durationMs: number): number {
  return Math.max(MIN_DURATION_MS, Math.min(durationMs, MAX_DURATION_MS));
}

export function clampHygienePenaltyMultiplier(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_HYGIENE_PENALTY_MULTIPLIER;
  return Math.max(0.5, Math.min(value, 10));
}

export function clampHygienePenaltyFixedMs(value: number): number {
  return Math.max(60_000, Math.min(value, 30 * 24 * 60 * 60_000));
}

export function clampEmergencyPenaltyMs(value: number): number {
  return Math.max(60_000, Math.min(value, 365 * 24 * 60 * 60_000));
}

export function normalizeEndPhrase(value: string): string {
  return value.replace(/\r\n/g, "\n").trimEnd();
}

export function clampMinLockMs(value: number, durationMs: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.max(0, value), Math.max(durationMs, MAX_DURATION_MS));
}
