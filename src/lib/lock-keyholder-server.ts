import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import {
  appendEvent,
  applyTimeDelta,
  requireActiveKeyholder,
  requireActiveWearer,
  requireToken,
  rowToTask,
} from "@/lib/lock-db";
import {
  INTEGRITY_CLOCK_PENALTY_MS,
  type LockRecord,
  type LockTask,
  type TaskRewardType,
} from "@/lib/lock-types";

export const keyholderAddTime = createServerFn({ method: "POST" })
  .validator((input: { token: string; addMs: number }) => {
    const addMs = Number(input.addMs);
    if (!Number.isFinite(addMs) || addMs <= 0 || addMs > 30 * 24 * 60 * 60_000) {
      throw new Error("加时无效");
    }
    return { token: requireToken(input.token), addMs };
  })
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await requireActiveKeyholder(data.token);
    const next = await applyTimeDelta(lock, data.addMs, "keyholder");
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "keyholder_add_time",
      data.addMs,
      "钥匙持有人加时",
    );
    return next;
  });

export const keyholderSubTime = createServerFn({ method: "POST" })
  .validator((input: { token: string; subMs: number }) => {
    const subMs = Number(input.subMs);
    if (!Number.isFinite(subMs) || subMs <= 0 || subMs > 30 * 24 * 60 * 60_000) {
      throw new Error("减时无效");
    }
    return { token: requireToken(input.token), subMs };
  })
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await requireActiveKeyholder(data.token);
    const next = await applyTimeDelta(lock, -data.subMs, "keyholder");
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "keyholder_sub_time",
      data.subMs,
      "钥匙持有人减时",
    );
    return next;
  });

export const keyholderSetFreeze = createServerFn({ method: "POST" })
  .validator((input: { token: string; frozen: boolean }) => ({
    token: requireToken(input.token),
    frozen: Boolean(input.frozen),
  }))
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await requireActiveKeyholder(data.token);
    const sql = await getSql();
    const now = Date.now();

    if (data.frozen) {
      if (lock.frozenAt != null) return lock;
      await sql`
        update locks
        set frozen_at = ${new Date(now).toISOString()}, updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
      `;
      await appendEvent(lock.id, lock.wearerToken, "freeze", 0, "钥匙冻结倒计时");
      return { ...lock, frozenAt: now };
    }

    if (lock.frozenAt == null) return lock;
    const paused = Math.max(0, now - lock.frozenAt);
    const nextEnds = lock.endsAt + paused;
    const nextDuration = lock.durationMs + paused;
    await sql`
      update locks
      set frozen_at = null,
          ends_at = ${new Date(nextEnds).toISOString()},
          duration_ms = ${nextDuration},
          updated_at = now()
      where keyholder_token = ${data.token} and status = 'active'
    `;
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "unfreeze",
      paused,
      "钥匙解除冻结（已补偿暂停时长）",
    );
    return {
      ...lock,
      frozenAt: null,
      endsAt: nextEnds,
      durationMs: nextDuration,
    };
  });

export const keyholderSetMinLock = createServerFn({ method: "POST" })
  .validator((input: { token: string; minLockMs: number }) => {
    const minLockMs = Number(input.minLockMs);
    if (!Number.isFinite(minLockMs) || minLockMs < 0) {
      throw new Error("最低锁定时长无效");
    }
    return {
      token: requireToken(input.token),
      minLockMs: Math.min(minLockMs, 365 * 24 * 60 * 60_000),
    };
  })
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await requireActiveKeyholder(data.token);
    const sql = await getSql();
    await sql`
      update locks
      set min_lock_ms = ${data.minLockMs}, updated_at = now()
      where keyholder_token = ${data.token} and status = 'active'
    `;
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "min_lock_set",
      data.minLockMs,
      "钥匙设定最低锁定时长",
    );
    return { ...lock, minLockMs: data.minLockMs };
  });

export const keyholderRequestPhoto = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => ({
    token: requireToken(input.token),
  }))
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await requireActiveKeyholder(data.token);
    const sql = await getSql();
    await sql`
      update locks
      set photo_request_active = true,
          photo_submitted_at = null,
          photo_thumb = null,
          updated_at = now()
      where keyholder_token = ${data.token} and status = 'active'
    `;
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "photo_request",
      0,
      "钥匙要求拍照验证",
    );
    return {
      ...lock,
      photoRequestActive: true,
      photoSubmittedAt: null,
      photoThumb: null,
    };
  });

export const wearerSubmitPhoto = createServerFn({ method: "POST" })
  .validator((input: { token: string; thumbDataUrl: string }) => {
    const thumb = input.thumbDataUrl;
    if (typeof thumb !== "string" || !thumb.startsWith("data:image/")) {
      throw new Error("无效图片");
    }
    if (thumb.length > 120_000) throw new Error("图片过大，请降低质量后重试");
    return { token: requireToken(input.token), thumbDataUrl: thumb };
  })
  .handler(async ({ data }): Promise<LockRecord> => {
    const lock = await requireActiveWearer(data.token);
    if (!lock.photoRequestActive) throw new Error("当前没有拍照验证要求");
    const sql = await getSql();
    const now = Date.now();
    await sql`
      update locks
      set photo_request_active = false,
          photo_submitted_at = ${new Date(now).toISOString()},
          photo_thumb = ${data.thumbDataUrl},
          updated_at = now()
      where wearer_token = ${data.token} and status = 'active'
    `;
    await appendEvent(lock.id, lock.wearerToken, "photo_submit", 0, "已提交拍照验证");
    return {
      ...lock,
      photoRequestActive: false,
      photoSubmittedAt: now,
      photoThumb: data.thumbDataUrl,
    };
  });

export const keyholderCreateTask = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      title: string;
      rewardType: TaskRewardType;
      rewardMs: number;
    }) => {
      const title = input.title.trim();
      if (title.length < 2 || title.length > 120) throw new Error("任务标题无效");
      const rewardType: TaskRewardType =
        input.rewardType === "unlock" ? "unlock" : "reduce";
      const rewardMs =
        rewardType === "unlock"
          ? 0
          : Math.max(60_000, Math.min(Number(input.rewardMs) || 0, 7 * 24 * 60 * 60_000));
      return {
        token: requireToken(input.token),
        title,
        rewardType,
        rewardMs,
      };
    },
  )
  .handler(async ({ data }): Promise<LockTask> => {
    const lock = await requireActiveKeyholder(data.token);
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into lock_tasks (id, lock_id, title, reward_type, reward_ms, status)
      values (
        ${id}, ${lock.id}, ${data.title}, ${data.rewardType}, ${data.rewardMs}, 'open'
      )
    `;
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "task_created",
      data.rewardMs,
      `任务：${data.title}`,
    );
    return {
      id,
      lockId: lock.id,
      title: data.title,
      rewardType: data.rewardType,
      rewardMs: data.rewardMs,
      status: "open",
      createdAt: Date.now(),
      completedAt: null,
    };
  });

export const listLockTasks = createServerFn({ method: "GET" })
  .validator((input: { token: string; role: "wearer" | "keyholder" }) => ({
    token: requireToken(input.token),
    role: input.role,
  }))
  .handler(async ({ data }): Promise<LockTask[]> => {
    const lock =
      data.role === "keyholder"
        ? await requireActiveKeyholder(data.token).catch(() => null)
        : await requireActiveWearer(data.token).catch(() => null);
    if (!lock) {
      // ended lock: still try fetch for history view
      const { fetchByKeyholder, fetchByWearer } = await import("@/lib/lock-db");
      const ended =
        data.role === "keyholder"
          ? await fetchByKeyholder(data.token)
          : await fetchByWearer(data.token);
      if (!ended) return [];
      const sql = await getSql();
      const rows = await sql`
        select * from lock_tasks where lock_id = ${ended.id}
        order by created_at desc limit 50
      `;
      return rows.map((r) =>
        rowToTask(
          r as {
            id: string;
            lock_id: string;
            title: string;
            reward_type: string;
            reward_ms: number | string;
            status: string;
            created_at: string | Date;
            completed_at: string | Date | null;
          },
        ),
      );
    }
    const sql = await getSql();
    const rows = await sql`
      select * from lock_tasks where lock_id = ${lock.id}
      order by created_at desc limit 50
    `;
    return rows.map((r) =>
      rowToTask(
        r as {
          id: string;
          lock_id: string;
          title: string;
          reward_type: string;
          reward_ms: number | string;
          status: string;
          created_at: string | Date;
          completed_at: string | Date | null;
        },
      ),
    );
  });

export const completeLockTask = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      role: "wearer" | "keyholder";
      taskId: string;
    }) => ({
      token: requireToken(input.token),
      role: input.role,
      taskId: input.taskId.trim(),
    }),
  )
  .handler(async ({ data }): Promise<{ lock: LockRecord; task: LockTask }> => {
    const lock =
      data.role === "keyholder"
        ? await requireActiveKeyholder(data.token)
        : await requireActiveWearer(data.token);
    const sql = await getSql();
    const rows = await sql`
      select * from lock_tasks
      where id = ${data.taskId} and lock_id = ${lock.id} and status = 'open'
      limit 1
    `;
    const row = rows[0] as
      | {
          id: string;
          lock_id: string;
          title: string;
          reward_type: string;
          reward_ms: number | string;
          status: string;
          created_at: string | Date;
          completed_at: string | Date | null;
        }
      | undefined;
    if (!row) throw new Error("任务不存在或已完成");

    const task = rowToTask(row);
    const now = Date.now();
    await sql`
      update lock_tasks
      set status = 'done', completed_at = ${new Date(now).toISOString()}
      where id = ${task.id}
    `;

    let nextLock = lock;
    if (task.rewardType === "unlock") {
      await sql`
        update locks
        set status = 'ended', hygiene_started_at = null, frozen_at = null, updated_at = now()
        where id = ${lock.id} and status = 'active'
      `;
      nextLock = { ...lock, status: "ended", hygieneStartedAt: null, frozenAt: null };
      await appendEvent(
        lock.id,
        lock.wearerToken,
        "task_done",
        0,
        `完成解锁任务：${task.title}`,
      );
    } else if (data.role === "keyholder") {
      nextLock = await applyTimeDelta(lock, -task.rewardMs, "keyholder");
      await appendEvent(
        lock.id,
        lock.wearerToken,
        "task_done",
        task.rewardMs,
        `完成减时任务：${task.title}`,
      );
    } else {
      const nextEnds = Math.max(Date.now() + 60_000, lock.endsAt - task.rewardMs);
      const added = nextEnds - lock.endsAt;
      const nextDuration = Math.max(60_000, lock.durationMs + added);
      await sql`
        update locks
        set ends_at = ${new Date(nextEnds).toISOString()},
            duration_ms = ${nextDuration},
            updated_at = now()
        where id = ${lock.id} and status = 'active'
      `;
      nextLock = { ...lock, endsAt: nextEnds, durationMs: nextDuration };
      await appendEvent(
        lock.id,
        lock.wearerToken,
        "task_done",
        task.rewardMs,
        `完成减时任务：${task.title}`,
      );
    }
    return {
      lock: nextLock,
      task: { ...task, status: "done", completedAt: now },
    };
  });

export const syncLockIntegrity = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      clientNow: number;
      localEndsAt: number;
      sessionNonce: string;
    }) => ({
      token: requireToken(input.token),
      clientNow: Number(input.clientNow),
      localEndsAt: Number(input.localEndsAt),
      sessionNonce: String(input.sessionNonce || ""),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ lock: LockRecord; penalties: string[] }> => {
      const lock = await requireActiveWearer(data.token);
      const sql = await getSql();
      const penalties: string[] = [];
      let next = { ...lock };
      const serverNow = Date.now();

      // Clock rollback vs last seen client time
      if (
        lock.lastClientNow != null &&
        data.clientNow < lock.lastClientNow - 30_000
      ) {
        next = await applyIntegrityPenalty(
          next,
          INTEGRITY_CLOCK_PENALTY_MS,
          "检测到系统时间回拨，加罚 1 小时",
        );
        penalties.push("时间回拨");
      }

      // Local endsAt suspiciously earlier than server (tamper)
      if (
        Number.isFinite(data.localEndsAt) &&
        data.localEndsAt + 120_000 < lock.endsAt
      ) {
        next = await applyIntegrityPenalty(
          next,
          INTEGRITY_CLOCK_PENALTY_MS,
          "本地结束时间异常偏早，会话完整性惩罚 +1 小时",
        );
        penalties.push("本地状态篡改");
      }

      // Session nonce mismatch
      if (lock.sessionNonce && data.sessionNonce && data.sessionNonce !== lock.sessionNonce) {
        next = await applyIntegrityPenalty(
          next,
          INTEGRITY_CLOCK_PENALTY_MS,
          "会话完整性校验失败，延长锁定 1 小时",
        );
        penalties.push("会话 nonce 异常");
      }

      const clientNowSafe = Math.min(
        Math.max(data.clientNow, 0),
        serverNow + 60_000,
      );
      await sql`
        update locks
        set last_client_now = ${clientNowSafe},
            integrity_penalty_count = ${next.integrityPenaltyCount},
            ends_at = ${new Date(next.endsAt).toISOString()},
            duration_ms = ${next.durationMs},
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;

      return {
        lock: { ...next, lastClientNow: clientNowSafe },
        penalties,
      };
    },
  );

async function applyIntegrityPenalty(
  lock: LockRecord,
  amountMs: number,
  detail: string,
): Promise<LockRecord> {
  const sql = await getSql();
  const nextEnds = lock.endsAt + amountMs;
  const nextDuration = lock.durationMs + amountMs;
  const count = lock.integrityPenaltyCount + 1;
  await sql`
    update locks
    set ends_at = ${new Date(nextEnds).toISOString()},
        duration_ms = ${nextDuration},
        integrity_penalty_count = ${count},
        updated_at = now()
    where id = ${lock.id} and status = 'active'
  `;
  await appendEvent(
    lock.id,
    lock.wearerToken,
    "integrity_penalty",
    amountMs,
    detail,
  );
  return {
    ...lock,
    endsAt: nextEnds,
    durationMs: nextDuration,
    integrityPenaltyCount: count,
  };
}
