import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import {
  canUseEmergency,
  clampDurationMs,
  clampEmergencyPenaltyMs,
  clampHygienePenaltyFixedMs,
  clampHygienePenaltyMultiplier,
  computeHygienePenaltyMs,
  DEFAULT_EMERGENCY_PENALTY_MS,
  DEFAULT_END_PHRASE,
  DEFAULT_HYGIENE_MAX_MS,
  DEFAULT_HYGIENE_PENALTY_FIXED_MS,
  DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
  normalizeEndPhrase,
  phrasesMatch,
  type EmergencyLimitMode,
  type HygienePenaltyMode,
  type LockEvent,
  type LockEventKind,
  type LockRecord,
  type LockStatus,
} from "@/lib/lock-types";

type LockRow = {
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

function toMs(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

function toNum(value: number | string | null | undefined, fallback = 0): number {
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

function rowToLock(row: LockRow): LockRecord {
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
    status: row.status,
  };
}

function rowToEvent(row: EventRow): LockEvent {
  return {
    id: row.id,
    lockId: row.lock_id,
    kind: row.kind as LockEventKind,
    amountMs: toNum(row.amount_ms),
    detail: row.detail,
    createdAt: toMs(row.created_at) ?? Date.now(),
  };
}

function randomToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function requireToken(token: string): string {
  const t = token.trim();
  if (t.length < 8 || t.length > 64) throw new Error("无效令牌");
  return t;
}

async function appendEvent(
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

export const createLockSession = createServerFn({ method: "POST" })
  .validator(
    (input: {
      durationMs: number;
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
    }) => input,
  )
  .handler(async ({ data }): Promise<LockRecord> => {
    const sql = await getSql();
    const now = Date.now();
    const durationMs = clampDurationMs(data.durationMs);
    const hygieneMaxMs = data.allowHygiene
      ? Math.max(
          60_000,
          Math.min(data.hygieneMaxMs || DEFAULT_HYGIENE_MAX_MS, 2 * 60 * 60_000),
        )
      : DEFAULT_HYGIENE_MAX_MS;
    const hygienePenaltyMode: HygienePenaltyMode =
      data.hygienePenaltyMode === "fixed" ? "fixed" : "multiplier";
    const hygienePenaltyFixedMs = clampHygienePenaltyFixedMs(
      data.hygienePenaltyFixedMs || DEFAULT_HYGIENE_PENALTY_FIXED_MS,
    );
    const hygienePenaltyMultiplier = clampHygienePenaltyMultiplier(
      data.hygienePenaltyMultiplier || DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
    );
    const emergencyLimitMode: EmergencyLimitMode =
      data.emergencyLimitMode === "unlimited" ||
      data.emergencyLimitMode === "once_penalty"
        ? data.emergencyLimitMode
        : "cooldown_24h";
    const emergencyPenaltyMs = clampEmergencyPenaltyMs(
      data.emergencyPenaltyMs || DEFAULT_EMERGENCY_PENALTY_MS,
    );
    const endPhrase = normalizeEndPhrase(data.endPhrase || DEFAULT_END_PHRASE);
    if (endPhrase.length < 4) throw new Error("结束宣言至少 4 个字");

    const id = crypto.randomUUID();
    const wearerToken = randomToken();
    const keyholderToken = randomToken();
    const startedAt = new Date(now).toISOString();
    const endsAt = new Date(now + durationMs).toISOString();

    await sql`
      insert into locks (
        id, wearer_token, keyholder_token,
        started_at, duration_ms, ends_at,
        allow_emergency, emergency_limit_mode, emergency_penalty_ms,
        emergency_last_used_at, emergency_use_count,
        allow_hygiene, hygiene_max_ms,
        hygiene_penalty_mode, hygiene_penalty_fixed_ms, hygiene_penalty_multiplier,
        end_phrase, notify_expiry, hygiene_started_at, status
      ) values (
        ${id}, ${wearerToken}, ${keyholderToken},
        ${startedAt}, ${durationMs}, ${endsAt},
        ${data.allowEmergency}, ${emergencyLimitMode}, ${emergencyPenaltyMs},
        null, 0,
        ${data.allowHygiene}, ${hygieneMaxMs},
        ${hygienePenaltyMode}, ${hygienePenaltyFixedMs}, ${hygienePenaltyMultiplier},
        ${endPhrase}, ${data.notifyExpiry}, null, 'active'
      )
    `;

    await appendEvent(id, wearerToken, "started", durationMs, "锁定开始");

    return {
      id,
      wearerToken,
      keyholderToken,
      startedAt: now,
      durationMs,
      endsAt: now + durationMs,
      allowEmergency: data.allowEmergency,
      emergencyLimitMode,
      emergencyPenaltyMs,
      emergencyLastUsedAt: null,
      emergencyUseCount: 0,
      allowHygiene: data.allowHygiene,
      hygieneMaxMs,
      hygienePenaltyMode,
      hygienePenaltyFixedMs,
      hygienePenaltyMultiplier,
      endPhrase,
      notifyExpiry: data.notifyExpiry,
      hygieneStartedAt: null,
      status: "active",
    };
  });

async function fetchByWearer(token: string): Promise<LockRecord | null> {
  const sql = await getSql();
  const rows = await sql<LockRow>`
    select * from locks where wearer_token = ${token} limit 1
  `;
  return rows[0] ? rowToLock(rows[0]) : null;
}

async function fetchByKeyholder(token: string): Promise<LockRecord | null> {
  const sql = await getSql();
  const rows = await sql<LockRow>`
    select * from locks where keyholder_token = ${token} limit 1
  `;
  return rows[0] ? rowToLock(rows[0]) : null;
}

export const getLockByWearer = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => ({
    token: requireToken(input.token),
  }))
  .handler(async ({ data }): Promise<LockRecord | null> => {
    return fetchByWearer(data.token);
  });

export const getLockByKeyholder = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => ({
    token: requireToken(input.token),
  }))
  .handler(async ({ data }): Promise<LockRecord | null> => {
    return fetchByKeyholder(data.token);
  });

export const listLockEvents = createServerFn({ method: "GET" })
  .validator((input: { token: string; role: "wearer" | "keyholder" }) => ({
    token: requireToken(input.token),
    role: input.role,
  }))
  .handler(async ({ data }): Promise<LockEvent[]> => {
    const lock =
      data.role === "keyholder"
        ? await fetchByKeyholder(data.token)
        : await fetchByWearer(data.token);
    if (!lock) return [];
    const sql = await getSql();
    const rows = await sql<EventRow>`
      select id, lock_id, kind, amount_ms, detail, created_at
      from lock_events
      where lock_id = ${lock.id}
      order by created_at desc
      limit 100
    `;
    return rows.map(rowToEvent);
  });

export const keyholderAddTime = createServerFn({ method: "POST" })
  .validator((input: { token: string; addMs: number }) => {
    const addMs = Number(input.addMs);
    if (!Number.isFinite(addMs) || addMs <= 0 || addMs > 30 * 24 * 60 * 60_000) {
      throw new Error("加时无效");
    }
    return { token: requireToken(input.token), addMs };
  })
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await fetchByKeyholder(data.token);
    if (!lock || lock.status !== "active") {
      throw new Error("锁定不存在或已结束");
    }
    const sql = await getSql();
    const nextEnds = lock.endsAt + data.addMs;
    const nextDuration = lock.durationMs + data.addMs;
    await sql`
      update locks
      set ends_at = ${new Date(nextEnds).toISOString()},
          duration_ms = ${nextDuration},
          updated_at = now()
      where keyholder_token = ${data.token} and status = 'active'
    `;
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "keyholder_add_time",
      data.addMs,
      "钥匙持有人加时",
    );
    return { ...lock, endsAt: nextEnds, durationMs: nextDuration };
  });

export const unlockLock = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      mode: "keyholder" | "emergency" | "expiry";
      phrase?: string;
    }) => ({
      token: requireToken(input.token),
      mode: input.mode,
      phrase: typeof input.phrase === "string" ? input.phrase : "",
    }),
  )
  .handler(async ({ data }): Promise<LockRecord> => {
    const sql = await getSql();
    const asKeyholder = data.mode === "keyholder";
    const lock = asKeyholder
      ? await fetchByKeyholder(data.token)
      : await fetchByWearer(data.token);

    if (!lock || lock.status !== "active") {
      throw new Error("锁定不存在或已结束");
    }

    const now = Date.now();
    if (data.mode === "expiry" && now < lock.endsAt) {
      throw new Error("尚未到期");
    }
    if (data.mode === "emergency") {
      const gate = canUseEmergency(lock, now);
      if (!gate.ok) throw new Error(gate.reason || "无法紧急解锁");
    }

    if (!asKeyholder && lock.endPhrase) {
      if (!phrasesMatch(lock.endPhrase, data.phrase)) {
        throw new Error("宣言不完整或不正确，无法结束");
      }
    }

    const status: LockStatus =
      data.mode === "emergency" ? "emergency_ended" : "ended";

    if (data.mode === "emergency") {
      await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            emergency_last_used_at = ${new Date(now).toISOString()},
            emergency_use_count = ${lock.emergencyUseCount + 1},
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
      await appendEvent(lock.id, lock.wearerToken, "emergency", 0, "紧急解锁");
      if (lock.emergencyLimitMode === "once_penalty") {
        await appendEvent(
          lock.id,
          lock.wearerToken,
          "emergency_penalty",
          lock.emergencyPenaltyMs,
          "紧急解锁永久惩罚记录（不可清除）",
        );
      }
    } else if (asKeyholder) {
      await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
      `;
      await appendEvent(
        lock.id,
        lock.wearerToken,
        "keyholder_unlock",
        0,
        "钥匙持有人开锁",
      );
    } else {
      await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
      await appendEvent(lock.id, lock.wearerToken, "ended", 0, "到期结束");
    }

    return {
      ...lock,
      status,
      hygieneStartedAt: null,
      emergencyLastUsedAt:
        data.mode === "emergency" ? now : lock.emergencyLastUsedAt,
      emergencyUseCount:
        data.mode === "emergency"
          ? lock.emergencyUseCount + 1
          : lock.emergencyUseCount,
    };
  });

export const startHygiene = createServerFn({ method: "POST" })
  .validator(
    (input: { token: string; role: "wearer" | "keyholder" }) => ({
      token: requireToken(input.token),
      role: input.role,
    }),
  )
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock =
      data.role === "keyholder"
        ? await fetchByKeyholder(data.token)
        : await fetchByWearer(data.token);
    if (!lock || lock.status !== "active") {
      throw new Error("锁定不存在或已结束");
    }
    if (!lock.allowHygiene) {
      throw new Error("本次锁定未允许卫生清洁");
    }
    if (lock.hygieneStartedAt != null) {
      return lock;
    }
    const now = Date.now();
    const sql = await getSql();
    const iso = new Date(now).toISOString();
    if (data.role === "keyholder") {
      await sql`
        update locks
        set hygiene_started_at = ${iso}, updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
          and hygiene_started_at is null
      `;
    } else {
      await sql`
        update locks
        set hygiene_started_at = ${iso}, updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
          and hygiene_started_at is null
      `;
    }
    return { ...lock, hygieneStartedAt: now };
  });

export const endHygiene = createServerFn({ method: "POST" })
  .validator(
    (input: { token: string; role: "wearer" | "keyholder" }) => ({
      token: requireToken(input.token),
      role: input.role,
    }),
  )
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock =
      data.role === "keyholder"
        ? await fetchByKeyholder(data.token)
        : await fetchByWearer(data.token);
    if (!lock || lock.status !== "active") {
      throw new Error("锁定不存在或已结束");
    }
    if (lock.hygieneStartedAt == null) {
      return lock;
    }

    const now = Date.now();
    const overtime = Math.max(
      0,
      now - lock.hygieneStartedAt - lock.hygieneMaxMs,
    );
    const penalty = computeHygienePenaltyMs(lock, overtime);
    const nextEnds = lock.endsAt + penalty;
    const nextDuration = lock.durationMs + penalty;
    const sql = await getSql();

    if (data.role === "keyholder") {
      await sql`
        update locks
        set hygiene_started_at = null,
            ends_at = ${new Date(nextEnds).toISOString()},
            duration_ms = ${nextDuration},
            updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
      `;
    } else {
      await sql`
        update locks
        set hygiene_started_at = null,
            ends_at = ${new Date(nextEnds).toISOString()},
            duration_ms = ${nextDuration},
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
    }

    if (penalty > 0) {
      const rule =
        lock.hygienePenaltyMode === "fixed"
          ? `固定 ${lock.hygienePenaltyFixedMs}ms`
          : `${lock.hygienePenaltyMultiplier}× 超时`;
      await appendEvent(
        lock.id,
        lock.wearerToken,
        "hygiene_penalty",
        penalty,
        `清洁超时惩罚（${rule}，超时 ${overtime}ms）· 服务端永久记录`,
      );
    }

    return {
      ...lock,
      hygieneStartedAt: null,
      endsAt: nextEnds,
      durationMs: nextDuration,
    };
  });
