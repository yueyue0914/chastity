import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import {
  clampDurationMs,
  clampHygienePenaltyFixedMs,
  clampHygienePenaltyMultiplier,
  computeHygienePenaltyMs,
  DEFAULT_HYGIENE_MAX_MS,
  DEFAULT_HYGIENE_PENALTY_FIXED_MS,
  DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
  type HygienePenaltyMode,
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
  allow_hygiene: boolean;
  hygiene_max_ms: number | string;
  hygiene_penalty_mode: string | null;
  hygiene_penalty_fixed_ms: number | string | null;
  hygiene_penalty_multiplier: number | string | null;
  notify_expiry: boolean;
  hygiene_started_at: string | Date | null;
  status: LockStatus;
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

function rowToLock(row: LockRow): LockRecord {
  return {
    id: row.id,
    wearerToken: row.wearer_token,
    keyholderToken: row.keyholder_token,
    startedAt: toMs(row.started_at) ?? Date.now(),
    durationMs: toNum(row.duration_ms),
    endsAt: toMs(row.ends_at) ?? Date.now(),
    allowEmergency: row.allow_emergency,
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
    notifyExpiry: row.notify_expiry,
    hygieneStartedAt: toMs(row.hygiene_started_at),
    status: row.status,
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

export const createLockSession = createServerFn({ method: "POST" })
  .validator(
    (input: {
      durationMs: number;
      allowEmergency: boolean;
      allowHygiene: boolean;
      hygieneMaxMs: number;
      hygienePenaltyMode: HygienePenaltyMode;
      hygienePenaltyFixedMs: number;
      hygienePenaltyMultiplier: number;
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
    const id = crypto.randomUUID();
    const wearerToken = randomToken();
    const keyholderToken = randomToken();
    const startedAt = new Date(now).toISOString();
    const endsAt = new Date(now + durationMs).toISOString();

    await sql`
      insert into locks (
        id, wearer_token, keyholder_token,
        started_at, duration_ms, ends_at,
        allow_emergency, allow_hygiene, hygiene_max_ms,
        hygiene_penalty_mode, hygiene_penalty_fixed_ms, hygiene_penalty_multiplier,
        notify_expiry, hygiene_started_at, status
      ) values (
        ${id}, ${wearerToken}, ${keyholderToken},
        ${startedAt}, ${durationMs}, ${endsAt},
        ${data.allowEmergency}, ${data.allowHygiene}, ${hygieneMaxMs},
        ${hygienePenaltyMode}, ${hygienePenaltyFixedMs}, ${hygienePenaltyMultiplier},
        ${data.notifyExpiry}, null, 'active'
      )
    `;

    return {
      id,
      wearerToken,
      keyholderToken,
      startedAt: now,
      durationMs,
      endsAt: now + durationMs,
      allowEmergency: data.allowEmergency,
      allowHygiene: data.allowHygiene,
      hygieneMaxMs,
      hygienePenaltyMode,
      hygienePenaltyFixedMs,
      hygienePenaltyMultiplier,
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
    return { ...lock, endsAt: nextEnds, durationMs: nextDuration };
  });

export const unlockLock = createServerFn({ method: "POST" })
  .validator(
    (input: { token: string; mode: "keyholder" | "emergency" | "expiry" }) => ({
      token: requireToken(input.token),
      mode: input.mode,
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
    if (data.mode === "emergency" && !lock.allowEmergency) {
      throw new Error("本次锁定未开启紧急解锁");
    }

    const status: LockStatus =
      data.mode === "emergency" ? "emergency_ended" : "ended";

    if (asKeyholder) {
      await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
      `;
    } else {
      await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
    }

    return { ...lock, status, hygieneStartedAt: null };
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

    return {
      ...lock,
      hygieneStartedAt: null,
      endsAt: nextEnds,
      durationMs: nextDuration,
    };
  });
