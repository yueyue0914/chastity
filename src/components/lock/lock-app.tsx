import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActiveLock } from "@/components/lock/active-lock";
import { CreateLock } from "@/components/lock/create-lock";
import {
  hygieneOvertimeMs,
  hygieneRemainingMs,
  isHygieneActive,
  isLockReady,
} from "@/lib/lock-types";
import { useLockStore } from "@/lib/lock-store";
import {
  clearHygieneNotifyFlag,
  notifyHygieneWarning,
  notifyLockReady,
} from "@/lib/notify";

export function LockApp() {
  const lock = useLockStore((s) => s.lock);
  const hydrate = useLockStore((s) => s.hydrate);
  const startLock = useLockStore((s) => s.startLock);
  const endByExpiry = useLockStore((s) => s.endByExpiry);
  const emergencyUnlock = useLockStore((s) => s.emergencyUnlock);
  const beginHygiene = useLockStore((s) => s.beginHygiene);
  const finishHygiene = useLockStore((s) => s.finishHygiene);
  const refresh = useLockStore((s) => s.refresh);
  const busy = useLockStore((s) => s.busy);
  const syncError = useLockStore((s) => s.syncError);
  const [now, setNow] = useState(() => Date.now());
  const [lastPenaltyMs, setLastPenaltyMs] = useState<number | null>(null);
  const notifiedReady = useRef<string | null>(null);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!lock) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [lock]);

  useEffect(() => {
    if (!lock || lock.status !== "active") return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [lock?.id, lock?.status, refresh]);

  useEffect(() => {
    if (!lock || !lock.notifyExpiry) return;
    if (!isLockReady(lock, now)) return;
    if (notifiedReady.current === lock.id) return;
    notifiedReady.current = lock.id;
    notifyLockReady(lock.id, "月锁 · 已到期", "锁定时间已到，可以结束了。");
  }, [lock, now]);

  useEffect(() => {
    if (!lock || !isHygieneActive(lock)) {
      if (lock) clearHygieneNotifyFlag(lock.id);
      return;
    }
    const left = hygieneRemainingMs(lock, now);
    if (left > 0 && left <= 60_000) {
      notifyHygieneWarning(
        lock.id,
        `清洁将在约 ${Math.ceil(left / 1000)} 秒后超时，超时将按创建时设定规则加罚时。`,
      );
    }
  }, [lock, now]);

  const ready = lock ? isLockReady(lock, now) : false;
  const hygiene = lock ? isHygieneActive(lock) : false;
  const status = !lock
    ? "未锁定"
    : hygiene
      ? hygieneOvertimeMs(lock, now) > 0
        ? "清洁超时"
        : "清洁中"
      : ready
        ? "已到期"
        : "锁定中";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <header className="flex shrink-0 items-end justify-between px-6 pt-8 pb-4">
        <div>
          <p className="text-xs tracking-widest text-muted">Yue Lock</p>
          <h1 className="font-display mt-1 text-4xl tracking-tight text-fg">月锁</h1>
        </div>
        <span className="rounded-full px-3 py-1 text-xs tracking-wide text-muted shadow-[var(--shadow-border)]">
          {status}
        </span>
      </header>

      {syncError ? (
        <p className="px-6 pb-2 text-center text-xs text-warn" role="status">
          {syncError}
        </p>
      ) : null}

      {lock ? (
        <ActiveLock
          key={lock.id + (ready ? "-ready" : hygiene ? "-hygiene" : "-locked")}
          lock={lock}
          now={now}
          busy={busy}
          lastPenaltyMs={lastPenaltyMs}
          onEnd={() => void endByExpiry()}
          onEmergency={async () => {
            await emergencyUnlock();
          }}
          onStartHygiene={async () => {
            setLastPenaltyMs(null);
            await beginHygiene();
          }}
          onEndHygiene={async () => {
            const { penaltyMs } = await finishHygiene();
            setLastPenaltyMs(penaltyMs > 0 ? penaltyMs : null);
          }}
        />
      ) : (
        <CreateLock
          key="create"
          busy={busy}
          error={syncError}
          onStart={async (input) => {
            setLastPenaltyMs(null);
            await startLock(input);
          }}
        />
      )}
    </div>
  );
}
