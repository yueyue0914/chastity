import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ActiveLock } from "@/components/lock/active-lock";
import { CreateLock } from "@/components/lock/create-lock";
import { ObedienceModal } from "@/components/lock/obedience-modal";
import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from "@/lib/auth/gates";
import {
  canWearerEnd,
  CLOCK_GUARD_KEY,
  hygieneOvertimeMs,
  hygieneRemainingMs,
  isFrozen,
  isHygieneActive,
  isTimerExpired,
} from "@/lib/lock-types";
import { useLockStore } from "@/lib/lock-store";
import { wearerSubmitPhoto, syncLockIntegrity } from "@/lib/lock-server";
import {
  clearHygieneNotifyFlag,
  notifyHygieneWarning,
  notifyLockReady,
} from "@/lib/notify";

const OBEDIENCE_TS_KEY = "yue-lock:obedience-ts:";

export function LockApp() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <LockAppInner />
      </SignedIn>
    </>
  );
}

function LockAppInner() {
  const lock = useLockStore((s) => s.lock);
  const hydrate = useLockStore((s) => s.hydrate);
  const startLock = useLockStore((s) => s.startLock);
  const endByExpiry = useLockStore((s) => s.endByExpiry);
  const emergencyUnlock = useLockStore((s) => s.emergencyUnlock);
  const beginHygiene = useLockStore((s) => s.beginHygiene);
  const finishHygiene = useLockStore((s) => s.finishHygiene);
  const refresh = useLockStore((s) => s.refresh);
  const setLock = useLockStore((s) => s.setLock);
  const busy = useLockStore((s) => s.busy);
  const syncError = useLockStore((s) => s.syncError);
  const [now, setNow] = useState(() => Date.now());
  const [lastPenaltyMs, setLastPenaltyMs] = useState<number | null>(null);
  const [obedienceOpen, setObedienceOpen] = useState(false);
  const notifiedReady = useRef<string | null>(null);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!lock) return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      const t = Date.now();
      // Local clock rollback guard (also reported to server on sync)
      try {
        const raw = localStorage.getItem(CLOCK_GUARD_KEY);
        const prev = raw ? Number(raw) : t;
        if (Number.isFinite(prev) && t < prev - 30_000) {
          // mark for next integrity sync via last known
        }
        localStorage.setItem(CLOCK_GUARD_KEY, String(Math.max(prev, t)));
      } catch {
        // ignore
      }
      setNow(t);
    }, 250);
    return () => window.clearInterval(id);
  }, [lock]);

  useEffect(() => {
    if (!lock || lock.status !== "active") return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [lock?.id, lock?.status, refresh]);

  // Integrity sync: localStorage + server
  useEffect(() => {
    if (!lock?.id || lock.status !== "active") return;
    const tick = async () => {
      const current = useLockStore.getState().lock;
      if (!current || current.status !== "active") return;
      try {
        const res = await syncLockIntegrity({
          data: {
            token: current.wearerToken,
            clientNow: Date.now(),
            localEndsAt: current.endsAt,
            sessionNonce: current.sessionNonce,
          },
        });
        useLockStore.getState().setLock(res.lock);
        if (res.penalties.length > 0) {
          setLastPenaltyMs(60 * 60_000);
        }
      } catch {
        // keep local; next refresh may recover
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 20_000);
    return () => window.clearInterval(id);
  }, [lock?.id, lock?.status]);

  useEffect(() => {
    if (!lock || !lock.notifyExpiry) return;
    if (!canWearerEnd(lock, now)) return;
    if (notifiedReady.current === lock.id) return;
    notifiedReady.current = lock.id;
    notifyLockReady(lock.id, "月锁 · 可结束", "已满足结束条件，请输入宣言结束。");
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
        `清洁将在约 ${Math.ceil(left / 1000)} 秒后超时。`,
      );
    }
  }, [lock, now]);

  // Obedience prompts
  useEffect(() => {
    if (!lock || !lock.obedienceEnabled || lock.status !== "active") return;
    const key = OBEDIENCE_TS_KEY + lock.id;
    const check = () => {
      try {
        const last = Number(localStorage.getItem(key) || "0");
        if (Date.now() - last >= lock.obedienceIntervalMs) {
          setObedienceOpen(true);
          try {
            if (Notification.permission === "granted") {
              new Notification("月锁 · 服从确认", {
                body: "请回到页面输入短句确认。",
                tag: `obedience-${lock.id}`,
              });
            }
          } catch {
            // ignore
          }
        }
      } catch {
        setObedienceOpen(true);
      }
    };
    check();
    const id = window.setInterval(check, 15_000);
    return () => window.clearInterval(id);
  }, [lock?.id, lock?.obedienceEnabled, lock?.obedienceIntervalMs, lock?.status]);

  const ready = lock ? canWearerEnd(lock, now) : false;
  const hygiene = lock ? isHygieneActive(lock) : false;
  const frozen = lock ? isFrozen(lock) : false;
  const status = !lock
    ? "未锁定"
    : frozen
      ? "已冻结"
      : hygiene
        ? hygieneOvertimeMs(lock, now) > 0
          ? "清洁超时"
          : "清洁中"
        : ready
          ? "可结束"
          : isTimerExpired(lock, now)
            ? "待最低时长"
            : "锁定中";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <header className="flex shrink-0 items-end justify-between gap-3 px-6 pt-8 pb-4">
        <div>
          <p className="text-xs tracking-widest text-muted">Yue Lock</p>
          <h1 className="font-display mt-1 text-4xl tracking-tight text-fg">月锁</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full px-3 py-1 text-xs tracking-wide text-muted shadow-[var(--shadow-border)]">
            {status}
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="text-xs text-muted hover:text-fg"
            >
              资料
            </Link>
            <Link to="/keys" className="text-xs text-muted hover:text-fg">
              钥匙
            </Link>
            <UserButton />
          </div>
        </div>
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
          onEnd={async (phrase) => {
            await endByExpiry(phrase);
          }}
          onEmergency={async (phrase) => {
            await emergencyUnlock(phrase);
          }}
          onStartHygiene={async () => {
            setLastPenaltyMs(null);
            await beginHygiene();
          }}
          onEndHygiene={async () => {
            const { penaltyMs } = await finishHygiene();
            setLastPenaltyMs(penaltyMs > 0 ? penaltyMs : null);
          }}
          onPhotoSubmit={async (dataUrl) => {
            const next = await wearerSubmitPhoto({
              data: { token: lock.wearerToken, thumbDataUrl: dataUrl },
            });
            setLock(next);
          }}
          onLockUpdate={(next) => setLock(next)}
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

      <ObedienceModal
        open={obedienceOpen && !!lock}
        phrase={lock?.obediencePhrase || "服从主人"}
        onDismiss={() => {
          if (lock) {
            try {
              localStorage.setItem(OBEDIENCE_TS_KEY + lock.id, String(Date.now()));
            } catch {
              // ignore
            }
          }
          setObedienceOpen(false);
        }}
      />
    </div>
  );
}
