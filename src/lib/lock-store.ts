import { create } from "zustand";
import {
  createLockSession,
  endHygiene,
  getLockByWearer,
  startHygiene,
  unlockLock,
} from "@/lib/lock-server";
import {
  isLockRecord,
  LOCK_STORAGE_KEY,
  type CreateLockInput,
  type LockRecord,
} from "@/lib/lock-types";
import { ensureNotifyPermission } from "@/lib/notify";

type LockState = {
  lock: LockRecord | null;
  syncError: string | null;
  busy: boolean;
  hydrate: () => void;
  startLock: (input: CreateLockInput) => Promise<void>;
  refresh: () => Promise<void>;
  endByExpiry: () => Promise<boolean>;
  emergencyUnlock: () => Promise<boolean>;
  beginHygiene: () => Promise<void>;
  finishHygiene: () => Promise<{ penaltyMs: number }>;
  clearLocal: () => void;
};

function readLock(): LockRecord | null {
  try {
    const raw = window.localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLockRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLock(lock: LockRecord | null) {
  try {
    if (lock && lock.status === "active") {
      window.localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(lock));
    } else {
      window.localStorage.removeItem(LOCK_STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export const useLockStore = create<LockState>((set, get) => ({
  lock: null,
  syncError: null,
  busy: false,
  hydrate: () => {
    set({ lock: readLock() });
  },
  startLock: async (input) => {
    set({ busy: true, syncError: null });
    try {
      if (input.notifyExpiry) {
        await ensureNotifyPermission();
      }
      const lock = await createLockSession({ data: input });
      writeLock(lock);
      set({ lock, busy: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      set({ busy: false, syncError: message });
      throw err;
    }
  },
  refresh: async () => {
    const { lock } = get();
    if (!lock || lock.status !== "active") return;
    try {
      const remote = await getLockByWearer({ data: { token: lock.wearerToken } });
      if (!remote || remote.status !== "active") {
        writeLock(null);
        set({ lock: null, syncError: null });
        return;
      }
      writeLock(remote);
      set({ lock: remote, syncError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "同步失败";
      set({ syncError: message });
    }
  },
  endByExpiry: async () => {
    const { lock } = get();
    if (!lock) return false;
    if (Date.now() < lock.endsAt) return false;
    set({ busy: true });
    try {
      await unlockLock({
        data: { token: lock.wearerToken, mode: "expiry" },
      });
      writeLock(null);
      set({ lock: null, busy: false });
      return true;
    } catch {
      set({ busy: false });
      return false;
    }
  },
  emergencyUnlock: async () => {
    const { lock } = get();
    if (!lock?.allowEmergency) return false;
    set({ busy: true });
    try {
      await unlockLock({
        data: { token: lock.wearerToken, mode: "emergency" },
      });
      writeLock(null);
      set({ lock: null, busy: false });
      return true;
    } catch {
      set({ busy: false });
      return false;
    }
  },
  beginHygiene: async () => {
    const { lock } = get();
    if (!lock?.allowHygiene) return;
    set({ busy: true, syncError: null });
    try {
      const next = await startHygiene({
        data: { token: lock.wearerToken, role: "wearer" },
      });
      writeLock(next);
      set({ lock: next, busy: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法开始清洁";
      set({ busy: false, syncError: message });
      throw err;
    }
  },
  finishHygiene: async () => {
    const { lock } = get();
    if (!lock?.hygieneStartedAt) return { penaltyMs: 0 };
    const beforeEnds = lock.endsAt;
    set({ busy: true, syncError: null });
    try {
      const next = await endHygiene({
        data: { token: lock.wearerToken, role: "wearer" },
      });
      writeLock(next);
      set({ lock: next, busy: false });
      return { penaltyMs: Math.max(0, next.endsAt - beforeEnds) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法结束清洁";
      set({ busy: false, syncError: message });
      throw err;
    }
  },
  clearLocal: () => {
    writeLock(null);
    set({ lock: null });
  },
}));
