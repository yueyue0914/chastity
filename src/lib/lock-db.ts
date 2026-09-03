import { getSql } from "@/lib/db";
import {
  DEFAULT_EMERGENCY_PENALTY_MS,
  DEFAULT_HYGIENE_MAX_MS,
  DEFAULT_HYGIENE_PENALTY_FIXED_MS,
  DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
  DEFAULT_OBEDIENCE_INTERVAL_MS,
  DEFAULT_OBEDIENCE_PHRASE,
  type EmergencyLimitMode,
  type HygienePenaltyMode,
  type LockEvent,
  type LockEventKind,
  type LockRecord,
  type LockStatus,
  type LockTask,
  type TaskRewardType,
  type TaskStatus,
} from "@/lib/lock-types";

export type LockRow = {
  id: string;
  wearer_token: string;
  keyholder_token: string;
  started_at: string | Date;
  duration_ms: number | string;
  ends_at: string | Date;
  allow_emergency: boolean;
  emergency_limit_mode: string | null;
  emergency_penalty_ms: number | string | null;
  emergency_last_used_at: string | Date | null;
  emergency_use_count: number | string | null;
  allow_hygiene: boolean;
  hygiene_max_ms: number | string;
  hygiene_penalty_mode: string | null;
  hygiene_penalty_fixed_ms: number | string | null;
  hygiene_penalty_multiplier: number | string | null;
  end_phrase: string | null;
  notify_expiry: boolean;
  hygiene_started_at: string | Date | null;
  frozen_at: string | Date | null;
  min_lock_ms: number | string | null;
  photo_request_active: boolean | null;
  photo_submitted_at: string | Date | null;
  photo_thumb: string | null;
  obedience_enabled: boolean | null;
  obedience_interval_ms: number | string | null;
  obedience_phrase: string | null;
  last_client_now: number | string | null;
  integrity_penalty_count: number | string | null;
  session_nonce: string | null;
  status: LockStatus;
};

type EventRow = {
  id: string;
  lock_id: string;
  kind: string;
  amount_ms: number | string;
  detail: string;
  created_at: string | Date;
};

type TaskRow = {
  id: string;
  lock_id: string;
  title: string;
  reward_type: string;
  reward_ms: number | string;
  status: string;
  created_at: string | Date;
  completed_at: string | Date | null;
};

export function toMs(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

export function toNum(
  value: number | string | null | undefined,
  fallback = 0,
): number {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePenaltyMode(value: string | null | undefined): HygienePenaltyMode {
  return value === "fixed" ? "fixed" : "multiplier";
}

function parseEmergencyMode(value: string | null | undefined): EmergencyLimitMode {
  if (value === "unlimited" || value === "once_penalty") return value;
  return "cooldown_24h";
}

export function rowToLock(row: LockRow): LockRecord {
  return {
    id: row.id,
    wearerToken: row.wearer_token,
    keyholderToken: row.keyholder_token,
    startedAt: toMs(row.started_at) ?? Date.now(),
    durationMs: toNum(row.duration_ms),
    endsAt: toMs(row.ends_at) ?? Date.now(),
    allowEmergency: row.allow_emergency,
    emergencyLimitMode: parseEmergencyMode(row.emergency_limit_mode),
    emergencyPenaltyMs: toNum(row.emergency_penalty_ms, DEFAULT_EMERGENCY_PENALTY_MS),
    emergencyLastUsedAt: toMs(row.emergency_last_used_at),
    emergencyUseCount: toNum(row.emergency_use_count, 0),
    allowHygiene: row.allow_hygiene,
    hygieneMaxMs: toNum(row.hygiene_max_ms, DEFAULT_HYGIENE_MAX_MS),
    hygienePenaltyMode: parsePenaltyMode(row.hygiene_penalty_mode),
    hygienePenaltyFixedMs: toNum(
      row.hygiene_penalty_fixed_ms,
      DEFAULT_HYGIENE_PENALTY_FIXED_MS,
    ),
    hygienePenaltyMultiplier: toNum(
      row.hygiene_penalty_multiplier,
      DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
    ),
    endPhrase: row.end_phrase ?? "",
    notifyExpiry: row.notify_expiry,
    hygieneStartedAt: toMs(row.hygiene_started_at),
    frozenAt: toMs(row.frozen_at),
    minLockMs: toNum(row.min_lock_ms, 0),
    photoRequestActive: Boolean(row.photo_request_active),
    photoSubmittedAt: toMs(row.photo_submitted_at),
    photoThumb: row.photo_thumb ?? null,
    obedienceEnabled: row.obedience_enabled !== false,
    obedienceIntervalMs: toNum(
      row.obedience_interval_ms,
      DEFAULT_OBEDIENCE_INTERVAL_MS,
    ),
    obediencePhrase: row.obedience_phrase || DEFAULT_OBEDIENCE_PHRASE,
    lastClientNow:
      row.last_client_now == null ? null : toNum(row.last_client_now),
    integrityPenaltyCount: toNum(row.integrity_penalty_count, 0),
    sessionNonce: row.session_nonce || "",
    status: row.status,
  };
}

export function rowToEvent(row: EventRow): LockEvent {
  return {
    id: row.id,
    lockId: row.lock_id,
    kind: row.kind as LockEventKind,
    amountMs: toNum(row.amount_ms),
    detail: row.detail,
    createdAt: toMs(row.created_at) ?? Date.now(),
  };
}

export function rowToTask(row: TaskRow): LockTask {
  return {
    id: row.id,
    lockId: row.lock_id,
    title: row.title,
    rewardType: (row.reward_type === "unlock" ? "unlock" : "reduce") as TaskRewardType,
    rewardMs: toNum(row.reward_ms),
    status: (row.status === "done" ? "done" : "open") as TaskStatus,
    createdAt: toMs(row.created_at) ?? Date.now(),
    completedAt: toMs(row.completed_at),
  };
}

export function randomToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function requireToken(token: string): string {
  const t = token.trim();
  if (t.length < 8 || t.length > 64) throw new Error("无效令牌");
  return t;
}

export async function appendEvent(
  lockId: string,
  wearerToken: string,
  kind: LockEventKind,
  amountMs: number,
  detail: string,
) {
  const sql = await getSql();
  await sql`
    insert into lock_events (id, lock_id, wearer_token, kind, amount_ms, detail)
    values (
      ${crypto.randomUUID()},
      ${lockId},
      ${wearerToken},
      ${kind},
      ${amountMs},
      ${detail}
    )
  `;
}

export async function fetchByWearer(token: string): Promise<LockRecord | null> {
  const sql = await getSql();
  const rows = await sql<LockRow>`
    select * from locks where wearer_token = ${token} limit 1
  `;
  return rows[0] ? rowToLock(rows[0]) : null;
}

export async function fetchByKeyholder(token: string): Promise<LockRecord | null> {
  const sql = await getSql();
  const rows = await sql<LockRow>`
    select * from locks where keyholder_token = ${token} limit 1
  `;
  return rows[0] ? rowToLock(rows[0]) : null;
}

export async function requireActiveKeyholder(token: string): Promise<LockRecord> {
  const lock = await fetchByKeyholder(token);
  if (!lock || lock.status !== "active") throw new Error("锁定不存在或已结束");
  return lock;
}

export async function requireActiveWearer(token: string): Promise<LockRecord> {
  const lock = await fetchByWearer(token);
  if (!lock || lock.status !== "active") throw new Error("锁定不存在或已结束");
  return lock;
}

export async function applyTimeDelta(
  lock: LockRecord,
  deltaMs: number,
  by: "keyholder" | "system",
): Promise<LockRecord> {
  const sql = await getSql();
  const nextEnds = Math.max(Date.now() + 60_000, lock.endsAt + deltaMs);
  const added = nextEnds - lock.endsAt;
  const nextDuration = Math.max(60_000, lock.durationMs + added);
  const tokenField =
    by === "keyholder" ? lock.keyholderToken : lock.wearerToken;
  if (by === "keyholder") {
    await sql`
      update locks
      set ends_at = ${new Date(nextEnds).toISOString()},
          duration_ms = ${nextDuration},
          updated_at = now()
      where keyholder_token = ${tokenField} and status = 'active'
    `;
  } else {
    await sql`
      update locks
      set ends_at = ${new Date(nextEnds).toISOString()},
          duration_ms = ${nextDuration},
          updated_at = now()
      where wearer_token = ${tokenField} and status = 'active'
    `;
  }
  return { ...lock, endsAt: nextEnds, durationMs: nextDuration };
}
