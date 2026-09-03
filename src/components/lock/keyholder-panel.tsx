import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound, ShowerHead, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Countdown } from "@/components/lock/countdown";
import { VaultDial } from "@/components/lock/vault-dial";
import { formatDateTimeZh, formatDurationZh } from "@/lib/format-time";
import {
  endHygiene,
  getLockByKeyholder,
  keyholderAddTime,
  startHygiene,
  unlockLock,
} from "@/lib/lock-server";
import {
  computeHygienePenaltyMs,
  hygieneOvertimeMs,
  hygieneRemainingMs,
  isHygieneActive,
  isLockReady,
  remainingMs,
  type LockRecord,
} from "@/lib/lock-types";
const ADD_PRESETS = [
  { label: "+15 分", ms: 15 * 60_000 },
  { label: "+1 时", ms: 60 * 60_000 },
  { label: "+6 时", ms: 6 * 60 * 60_000 },
  { label: "+1 天", ms: 24 * 60 * 60_000 },
] as const;

type KeyholderPanelProps = {
  code: string;
};

export function KeyholderPanel({ code }: KeyholderPanelProps) {
  const [lock, setLock] = useState<LockRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const remote = await getLockByKeyholder({ data: { token: code } });
      setLock(remote);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [code]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  async function run(action: () => Promise<LockRecord>, okMsg?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await action();
      setLock(next.status === "active" ? next : null);
      if (okMsg) setMessage(okMsg);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-sm text-muted">加载中…</p>
      </Shell>
    );
  }

  if (!lock || lock.status !== "active") {
    return (
      <Shell>
        <div className="mx-auto size-36">
          <VaultDial progress={0} open />
        </div>
        <p className="mt-6 text-center font-display text-2xl text-fg">无进行中锁定</p>
        <p className="mt-2 text-center text-sm text-muted">
          链接无效，或锁定已结束
        </p>
        <div className="mt-8">
          <Button asChild variant="secondary" className="w-full">
            <Link to="/">返回月锁</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const ready = isLockReady(lock, now);
  const hygiene = isHygieneActive(lock);
  const remaining = remainingMs(lock, now);
  const overtime = hygieneOvertimeMs(lock, now);
  const hygieneLeft = hygieneRemainingMs(lock, now);
  const pendingPenalty = computeHygienePenaltyMs(lock, overtime);
  const progress = lock.durationMs > 0 ? remaining / lock.durationMs : 0;

  return (
    <Shell>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs tracking-widest text-muted">
            <KeyRound className="size-3.5" /> 钥匙持有人
          </p>
          <h1 className="font-display mt-1 text-3xl tracking-tight text-fg">远程管锁</h1>
        </div>
        <span className="rounded-full px-3 py-1 text-xs text-muted shadow-[var(--shadow-border)]">
          {hygiene ? (overtime > 0 ? "清洁超时" : "清洁中") : ready ? "已到期" : "锁定中"}
        </span>
      </header>

      <div className="mx-auto size-44">
        <VaultDial progress={ready || hygiene ? 0 : progress} open={ready || hygiene} />
      </div>

      <div className="mt-6 space-y-3">
        {hygiene ? (
          <>
            <p className="text-center text-sm text-muted">
              {overtime > 0
                ? `已超时 ${formatDurationZh(overtime)} · 将加罚 ${formatDurationZh(pendingPenalty)}`
                : `清洁剩余 ${formatDurationZh(hygieneLeft)}`}
            </p>
            <Countdown remainingMs={overtime > 0 ? overtime : hygieneLeft} />
          </>
        ) : (
          <>
            <p className="text-center text-sm text-muted">剩余时间</p>
            <Countdown remainingMs={remaining} />
          </>
        )}
      </div>

      <dl className="mt-6 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
        <Row label="解锁时间" value={formatDateTimeZh(lock.endsAt)} />
        <Row label="锁定时长" value={formatDurationZh(lock.durationMs)} />
        <Row
          label="卫生清洁"
          value={
            lock.allowHygiene
              ? `最长 ${formatDurationZh(lock.hygieneMaxMs)}`
              : "未允许"
          }
        />
        {lock.allowHygiene ? (
          <Row
            label="超时惩罚"
            value={
              lock.hygienePenaltyMode === "fixed"
                ? `固定 ${formatDurationZh(lock.hygienePenaltyFixedMs)}`
                : `${lock.hygienePenaltyMultiplier}× 超时`
            }
          />
        ) : null}
      </dl>
      {error ? (
        <p className="mt-3 text-center text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-center text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-xs tracking-wide text-muted">增加时间</p>
        <div className="grid grid-cols-4 gap-2">
          {ADD_PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              size="chip"
              variant="secondary"
              className="px-1 text-xs"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    keyholderAddTime({
                      data: { token: code, addMs: p.ms },
                    }),
                  `已增加 ${p.label.replace("+", "")}`,
                )
              }
            >
              {p.label}
            </Button>
          ))}
        </div>

        {lock.allowHygiene ? (
          hygiene ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() =>
                void run(
                  () => endHygiene({ data: { token: code, role: "keyholder" } }),
                  overtime > 0 ? "已结束清洁并结算罚时" : "已结束清洁",
                )
              }
            >
              <ShowerHead className="size-4" />
              结束清洁
            </Button>
          ) : !ready ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    startHygiene({ data: { token: code, role: "keyholder" } }),
                  "已批准卫生清洁",
                )
              }
            >
              <ShowerHead className="size-4" />
              批准卫生清洁
            </Button>
          ) : null
        ) : null}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => setUnlockOpen(true)}
        >
          <Unlock className="size-4" />
          开锁结束
        </Button>
      </div>

      <AlertDialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认开锁？</AlertDialogTitle>
            <AlertDialogDescription>
              将立即结束对方的锁定。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setUnlockOpen(false);
                void run(
                  () =>
                    unlockLock({
                      data: { token: code, mode: "keyholder" },
                    }),
                  "已开锁",
                );
              }}
            >
              确认开锁
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-y-auto bg-bg px-6 pt-8 text-fg">
      {children}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm text-fg">{value}</dd>
    </div>
  );
}
