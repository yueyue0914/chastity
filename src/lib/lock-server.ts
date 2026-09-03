import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import {
  appendEvent,
  fetchByKeyholder,
  fetchByWearer,
  randomToken,
  requireToken,
  rowToEvent,
} from "@/lib/lock-db";
import {
  canUseEmergency,
  canWearerEnd,
  clampDurationMs,
  clampEmergencyPenaltyMs,
  clampHygienePenaltyFixedMs,
  clampHygienePenaltyMultiplier,
  clampMinLockMs,
  computeHygienePenaltyMs,
  DEFAULT_EMERGENCY_PENALTY_MS,
  DEFAULT_END_PHRASE,
  DEFAULT_HYGIENE_MAX_MS,
  DEFAULT_HYGIENE_PENALTY_FIXED_MS,
  DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
  DEFAULT_OBEDIENCE_INTERVAL_MS,
  DEFAULT_OBEDIENCE_PHRASE,
  normalizeEndPhrase,
  phrasesMatch,
  type EmergencyLimitMode,
  type HygienePenaltyMode,
  type LockEvent,
  type LockRecord,
  type LockStatus,
} from "@/lib/lock-types";

export {
  keyholderAddTime,
  keyholderSubTime,
  keyholderSetFreeze,
  keyholderSetMinLock,
  keyholderRequestPhoto,
  wearerSubmitPhoto,
  keyholderCreateTask,
  listLockTasks,
  completeLockTask,
  syncLockIntegrity,
} from "@/lib/lock-keyholder-server";

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
      minLockMs: number;
      obedienceEnabled: boolean;
      obedienceIntervalMs: number;
      obediencePhrase: string;
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
    const minLockMs = clampMinLockMs(data.minLockMs || 0, durationMs);
    const obedienceIntervalMs = Math.max(
      60_000,
      Math.min(
        data.obedienceIntervalMs || DEFAULT_OBEDIENCE_INTERVAL_MS,
        24 * 60 * 60_000,
      ),
    );
    const obediencePhrase =
      normalizeEndPhrase(data.obediencePhrase || DEFAULT_OBEDIENCE_PHRASE) ||
      DEFAULT_OBEDIENCE_PHRASE;

    const id = crypto.randomUUID();
    const wearerToken = randomToken();
    const keyholderToken = randomToken();
    const sessionNonce = randomToken();
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
        end_phrase, notify_expiry, hygiene_started_at,
        frozen_at, min_lock_ms, photo_request_active,
        obedience_enabled, obedience_interval_ms, obedience_phrase,
        last_client_now, integrity_penalty_count, session_nonce, status
      ) values (
        ${id}, ${wearerToken}, ${keyholderToken},
        ${startedAt}, ${durationMs}, ${endsAt},
        ${data.allowEmergency}, ${emergencyLimitMode}, ${emergencyPenaltyMs},
        null, 0,
        ${data.allowHygiene}, ${hygieneMaxMs},
        ${hygienePenaltyMode}, ${hygienePenaltyFixedMs}, ${hygienePenaltyMultiplier},
        ${endPhrase}, ${data.notifyExpiry}, null,
        null, ${minLockMs}, false,
        ${data.obedienceEnabled !== false}, ${obedienceIntervalMs}, ${obediencePhrase},
        ${now}, 0, ${sessionNonce}, 'active'
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
      frozenAt: null,
      minLockMs,
      photoRequestActive: false,
      photoSubmittedAt: null,
      photoThumb: null,
      obedienceEnabled: data.obedienceEnabled !== false,
      obedienceIntervalMs,
      obediencePhrase,
      lastClientNow: now,
      integrityPenaltyCount: 0,
      sessionNonce,
      status: "active",
    };
  });

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
    const rows = await sql`
      select id, lock_id, kind, amount_ms, detail, created_at
      from lock_events
      where lock_id = ${lock.id}
      order by created_at desc
      limit 100
    `;
    return rows.map((r) =>
      rowToEvent(
        r as {
          id: string;
          lock_id: string;
          kind: string;
          amount_ms: number | string;
          detail: string;
          created_at: string | Date;
        },
      ),
    );
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
    if (data.mode === "expiry") {
      if (!canWearerEnd(lock, now)) {
        if (lock.frozenAt != null) throw new Error("锁定已冻结，无法自行结束");
        if (now < lock.endsAt) throw new Error("尚未到期");
        throw new Error("未达到钥匙设定的最低锁定时长，无法自行结束");
      }
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
            frozen_at = null,
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
            frozen_at = null,
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
            frozen_at = null,
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
      await appendEvent(lock.id, lock.wearerToken, "ended", 0, "到期结束");
    }

    return {
      ...lock,
      status,
      hygieneStartedAt: null,
      frozenAt: null,
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
    if (!lock.allowHygiene && data.role === "wearer") {
      throw new Error("本次锁定未允许卫生清洁");
    }
    if (lock.hygieneStartedAt != null) return lock;
    if (lock.frozenAt != null) throw new Error("冻结中无法开始清洁");

    const now = Date.now();
    const sql = await getSql();
    const iso = new Date(now).toISOString();
    if (data.role === "keyholder") {
      await sql`
        update locks
        set hygiene_started_at = ${iso},
            allow_hygiene = true,
            updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
          and hygiene_started_at is null
      `;
      await appendEvent(
        lock.id,
        lock.wearerToken,
        "force_hygiene",
        0,
        "钥匙强制开始清洁",
      );
    } else {
      await sql`
        update locks
        set hygiene_started_at = ${iso}, updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
          and hygiene_started_at is null
      `;
    }
    return { ...lock, hygieneStartedAt: now, allowHygiene: true };
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
    if (lock.hygieneStartedAt == null) return lock;

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
