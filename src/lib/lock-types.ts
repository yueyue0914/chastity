export type LockStatus = "active" | "ended" | "emergency_ended";

export type HygienePenaltyMode = "fixed" | "multiplier";

/** How wearer emergency unlock is limited for this session. */
export type EmergencyLimitMode = "unlimited" | "cooldown_24h" | "once_penalty";

export type LockEventKind =
  | "started"
  | "hygiene_penalty"
  | "emergency"
  | "emergency_penalty"
  | "ended"
  | "keyholder_unlock"
  | "keyholder_add_time";

export type LockEvent = {
  id: string;
  lockId: string;
  kind: LockEventKind;
  amountMs: number;
  detail: string;
  createdAt: number;
};

export type LockOptions = {
  allowEmergency: boolean;
  emergencyLimitMode: EmergencyLimitMode;
  /** Permanent penalty recorded when using once_penalty emergency. */
  emergencyPenaltyMs: number;
  allowHygiene: boolean;
  hygieneMaxMs: number;
  hygienePenaltyMode: HygienePenaltyMode;
  hygienePenaltyFixedMs: number;
  hygienePenaltyMultiplier: number;
  /** Exact phrase required to confirm ending (empty = no phrase gate). */
  endPhrase: string;
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
export const MIN_DURATION_MS = 60_000;
export const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
export const LOCK_STORAGE_KEY = "yue-lock:v4";
export const HISTORY_TOKEN_KEY = "yue-lock:history-tokens:v1";

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
