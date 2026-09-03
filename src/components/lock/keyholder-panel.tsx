import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Camera,
  KeyRound,
  Snowflake,
  ShowerHead,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimKeyholderLock } from "@/lib/lock-account-server";
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
import { PenaltyHistory } from "@/components/lock/penalty-history";
import { VaultDial } from "@/components/lock/vault-dial";
import { formatDateTimeZh, formatDurationZh } from "@/lib/format-time";
import {
  completeLockTask,
  endHygiene,
  getLockByKeyholder,
  keyholderAddTime,
  keyholderCreateTask,
  keyholderRequestPhoto,
  keyholderSetFreeze,
  keyholderSetMinLock,
  keyholderSubTime,
  listLockTasks,
  startHygiene,
  unlockLock,
} from "@/lib/lock-server";
import {
  computeHygienePenaltyMs,
  hygieneOvertimeMs,
  hygieneRemainingMs,
  isFrozen,
  isHygieneActive,
  isTimerExpired,
  minLockEndsAt,
  remainingMs,
  type LockRecord,
  type LockTask,
} from "@/lib/lock-types";

const ADD_PRESETS = [
  { label: "+15 分", ms: 15 * 60_000 },
  { label: "+1 时", ms: 60 * 60_000 },
  { label: "+6 时", ms: 6 * 60 * 60_000 },
  { label: "+1 天", ms: 24 * 60 * 60_000 },
] as const;

const SUB_PRESETS = [
  { label: "-15 分", ms: 15 * 60_000 },
  { label: "-1 时", ms: 60 * 60_000 },
  { label: "-6 时", ms: 6 * 60 * 60_000 },
] as const;

const MIN_LOCK_PRESETS = [
  { label: "最低=时长", ms: -1 },
  { label: "最低 1 时", ms: 60 * 60_000 },
  { label: "最低 6 时", ms: 6 * 60 * 60_000 },
  { label: "最低 1 天", ms: 24 * 60 * 60_000 },
] as const;

export function KeyholderPanel({ code }: { code: string }) {
  const { user, isPending } = useCurrentUserState();
  const claimedRef = useRef<string | null>(null);
  const [lock, setLock] = useState<LockRecord | null>(null);
  const [tasks, setTasks] = useState<LockTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskRewardMs, setTaskRewardMs] = useState(30 * 60_000);

  async function load() {
    try {
      const remote = await getLockByKeyholder({ data: { token: code } });
      setLock(remote);
      if (remote) {
        const t = await listLockTasks({
          data: { token: code, role: "keyholder" },
        });
        setTasks(t);
      }
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

  // Signed-in keyholder: bind this lock to the account (once per token).
  useEffect(() => {
    if (isPending || !user) return;
    if (claimedRef.current === code) return;
    claimedRef.current = code;
    void claimKeyholderLock({ data: { token: code } })
      .then((next) => {
        setLock(next);
        setMessage("已绑定到当前账号，可在「钥匙工作台」查看");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "认领失败";
        if (!msg.includes("已被其他")) return;
        setError(msg);
      });
  }, [code, user, isPending]);
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
      await load();
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
        <div className="mt-8">
          <Button asChild variant="secondary" className="w-full">
            <Link to="/">返回月锁</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const frozen = isFrozen(lock);
  const expired = isTimerExpired(lock, now);
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
          {frozen
            ? "已冻结"
            : hygiene
              ? overtime > 0
                ? "清洁超时"
                : "清洁中"
              : expired
                ? "计时到期"
                : "锁定中"}
        </span>
      </header>

      <div className="mx-auto size-44">
        <VaultDial
          progress={expired || hygiene || frozen ? 0 : progress}
          open={expired || hygiene}
        />
      </div>

      <div className="mt-6 space-y-3">
        {hygiene ? (
          <>
            <p className="text-center text-sm text-muted">
              {overtime > 0
                ? `已超时 · 将加罚 ${formatDurationZh(pendingPenalty)}`
                : `清洁剩余 ${formatDurationZh(hygieneLeft)}`}
            </p>
            <Countdown remainingMs={overtime > 0 ? overtime : hygieneLeft} />
          </>
        ) : (
          <>
            <p className="text-center text-sm text-muted">
              {frozen ? "冻结中剩余" : "剩余时间"}
            </p>
            <Countdown remainingMs={remaining} />
          </>
        )}
      </div>

      <dl className="mt-6 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
        <Row label="解锁时间" value={formatDateTimeZh(lock.endsAt)} />
        <Row
          label="最低锁定至"
          value={
            lock.minLockMs > 0
              ? formatDateTimeZh(minLockEndsAt(lock))
              : "未设置"
          }
        />
        <Row label="锁定时长" value={formatDurationZh(lock.durationMs)} />
        {lock.photoThumb ? (
          <div className="pt-1">
            <p className="mb-2 text-sm text-muted">最近拍照验证</p>
            <img
              src={lock.photoThumb}
              alt="验证照片"
              className="w-full rounded-lg"
            />
          </div>
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

      <div className="mt-6 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <section className="space-y-2">
          <p className="text-xs tracking-wide text-muted">加时</p>
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
                    `已加时 ${p.label}`,
                  )
                }
              >
                {p.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs tracking-wide text-muted">减时</p>
          <div className="grid grid-cols-3 gap-2">
            {SUB_PRESETS.map((p) => (
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
                      keyholderSubTime({
                        data: { token: code, subMs: p.ms },
                      }),
                    `已减时 ${p.label}`,
                  )
                }
              >
                {p.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs tracking-wide text-muted">最低锁定时长</p>
          <div className="grid grid-cols-2 gap-2">
            {MIN_LOCK_PRESETS.map((p) => (
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
                      keyholderSetMinLock({
                        data: {
                          token: code,
                          minLockMs: p.ms < 0 ? lock.durationMs : p.ms,
                        },
                      }),
                    "已更新最低锁定时长",
                  )
                }
              >
                {p.label}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  keyholderSetFreeze({
                    data: { token: code, frozen: !frozen },
                  }),
                frozen ? "已解冻" : "已冻结",
              )
            }
          >
            <Snowflake className="size-4" />
            {frozen ? "解冻" : "冻结"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || hygiene}
            onClick={() =>
              void run(
                () => startHygiene({ data: { token: code, role: "keyholder" } }),
                "已强制开始清洁",
              )
            }
          >
            <ShowerHead className="size-4" />
            强制清洁
          </Button>
        </div>

        {hygiene ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() =>
              void run(
                () => endHygiene({ data: { token: code, role: "keyholder" } }),
                "已结束清洁",
              )
            }
          >
            结束清洁
          </Button>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={busy || lock.photoRequestActive}
          onClick={() =>
            void run(
              () => keyholderRequestPhoto({ data: { token: code } }),
              "已要求拍照验证",
            )
          }
        >
          <Camera className="size-4" />
          {lock.photoRequestActive ? "等待拍照中…" : "要求拍照验证"}
        </Button>

        <section className="space-y-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
          <p className="text-xs tracking-wide text-muted">发布任务</p>
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="任务内容，例如：跪姿报数"
            className="w-full rounded-lg bg-bg px-3 py-2 text-sm outline-none shadow-[var(--shadow-border)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="chip"
              variant="secondary"
              disabled={busy || taskTitle.trim().length < 2}
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await keyholderCreateTask({
                      data: {
                        token: code,
                        title: taskTitle,
                        rewardType: "reduce",
                        rewardMs: taskRewardMs,
                      },
                    });
                    setTaskTitle("");
                    setMessage(`已发布减时任务（${formatDurationZh(taskRewardMs)}）`);
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "发布失败");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              减时任务
            </Button>
            <Button
              type="button"
              size="chip"
              variant="secondary"
              disabled={busy || taskTitle.trim().length < 2}
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await keyholderCreateTask({
                      data: {
                        token: code,
                        title: taskTitle,
                        rewardType: "unlock",
                        rewardMs: 0,
                      },
                    });
                    setTaskTitle("");
                    setMessage("已发布解锁任务");
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "发布失败");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              解锁任务
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 60].map((m) => (
              <Button
                key={m}
                type="button"
                size="chip"
                variant={taskRewardMs === m * 60_000 ? "default" : "secondary"}
                className="text-xs"
                onClick={() => setTaskRewardMs(m * 60_000)}
              >
                奖 {m} 分
              </Button>
            ))}
          </div>
          {tasks.length > 0 ? (
            <ul className="space-y-2 pt-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-fg">
                    {t.title}
                    <span className="ml-2 text-xs text-muted">
                      {t.status === "done"
                        ? "已完成"
                        : t.rewardType === "unlock"
                          ? "解锁"
                          : `-${formatDurationZh(t.rewardMs)}`}
                    </span>
                  </span>
                  {t.status === "open" ? (
                    <Button
                      type="button"
                      size="chip"
                      variant="secondary"
                      className="text-xs"
                      disabled={busy}
                      onClick={() =>
                        void (async () => {
                          setBusy(true);
                          try {
                            const res = await completeLockTask({
                              data: {
                                token: code,
                                role: "keyholder",
                                taskId: t.id,
                              },
                            });
                            setLock(
                              res.lock.status === "active" ? res.lock : null,
                            );
                            setMessage("已确认任务完成");
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "失败",
                            );
                          } finally {
                            setBusy(false);
                          }
                        })()
                      }
                    >
                      确认完成
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

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

        <PenaltyHistory
          token={code}
          role="keyholder"
          refreshKey={`${lock.endsAt}-${lock.durationMs}-${tasks.length}`}
        />
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs tracking-widest text-muted">
          <KeyRound className="size-3.5" /> 钥匙端
        </p>
        <div className="flex items-center gap-2">
          <SignedIn>
            <Link to="/keys" className="text-xs text-muted hover:text-fg">
              工作台
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link to="/login" className="text-xs text-muted hover:text-fg">
              登录认领
            </Link>
          </SignedOut>
        </div>
      </div>
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
