import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  appendEvent,
  fetchByKeyholder,
  requireToken,
  rowToLock,
  type LockRow,
} from "@/lib/lock-db";
import type { LockRecord } from "@/lib/lock-types";

export type ManagedLockSummary = {
  id: string;
  keyholderToken: string;
  status: string;
  endsAt: number;
  durationMs: number;
};

/** Bind current user as keyholder when opening an invite link while signed in. */
export const claimKeyholderLock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { token: string }) => ({
    token: requireToken(input.token),
  }))
  .handler(async ({ context, data }): Promise<LockRecord> => {
    const lock = await fetchByKeyholder(data.token);
    if (!lock || lock.status !== "active") {
      throw new Error("锁定不存在或已结束");
    }
    const sql = await getSql();
    const claimed = await sql<{ id: string }>`
      update locks
      set keyholder_user_id = ${context.userId}, updated_at = now()
      where keyholder_token = ${data.token}
        and status = 'active'
        and (keyholder_user_id is null or keyholder_user_id = ${context.userId})
      returning id
    `;
    if (!claimed[0]) {
      throw new Error("这把钥匙已被其他账号认领");
    }
    await appendEvent(
      lock.id,
      lock.wearerToken,
      "keyholder_claim",
      0,
      `钥匙账号已绑定`,
    );
    const next = await fetchByKeyholder(data.token);
    if (!next) throw new Error("锁定不存在或已结束");
    return next;
  });

export const listMyKeyholderLocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ManagedLockSummary[]> => {
    const sql = await getSql();
    const rows = await sql<LockRow>`
      select * from locks
      where keyholder_user_id = ${context.userId}
      order by started_at desc
      limit 40
    `;
    return rows.map((r) => {
      const lock = rowToLock(r);
      return {
        id: lock.id,
        keyholderToken: lock.keyholderToken,
        status: lock.status,
        endsAt: lock.endsAt,
        durationMs: lock.durationMs,
      };
    });
  });

export const listMyWearerLocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ManagedLockSummary[]> => {
    const sql = await getSql();
    const rows = await sql<LockRow>`
      select * from locks
      where wearer_user_id = ${context.userId}
      order by started_at desc
      limit 40
    `;
    return rows.map((r) => {
      const lock = rowToLock(r);
      return {
        id: lock.id,
        keyholderToken: lock.keyholderToken,
        status: lock.status,
        endsAt: lock.endsAt,
        durationMs: lock.durationMs,
      };
    });
  });
