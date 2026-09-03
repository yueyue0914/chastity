import { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert, ShowerHead } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/lock/countdown";
import { PenaltyHistory } from "@/components/lock/penalty-history";
import { PhraseConfirmDialog } from "@/components/lock/phrase-confirm-dialog";
import { PhotoVerify } from "@/components/lock/photo-verify";
import { VaultDial } from "@/components/lock/vault-dial";
import { formatDateTimeZh, formatDurationZh } from "@/lib/format-time";
import { completeLockTask, listLockTasks } from "@/lib/lock-server";
import {
  canUseEmergency,
  canWearerEnd,
  computeHygienePenaltyMs,
  hygieneOvertimeMs,
  hygieneRemainingMs,
  isFrozen,
  isHygieneActive,
  isMinLockMet,
  isTimerExpired,
  minLockEndsAt,
  remainingMs,
  type LockRecord,
  type LockTask,
} from "@/lib/lock-types";

type ActiveLockProps = {
  lock: LockRecord;
  now: number;
  busy?: boolean;
  lastPenaltyMs?: number | null;
  onEnd: (phrase: string) => Promise<void> | void;
  onEmergency: (phrase: string) => Promise<void>;
  onStartHygiene: () => Promise<void>;
  onEndHygiene: () => Promise<void>;
  onPhotoSubmit: (dataUrl: string) => Promise<void>;
  onLockUpdate?: (lock: LockRecord | null) => void;
};

export function ActiveLock({
  lock,
  now,
  busy,
  lastPenaltyMs,
  onEnd,
  onEmergency,
  onStartHygiene,
  onEndHygiene,
  onPhotoSubmit,
  onLockUpdate,
}: ActiveLockProps) {
  const remaining = remainingMs(lock, now);
  const timerDone = isTimerExpired(lock, now);
  const ready = canWearerEnd(lock, now);
  const frozen = isFrozen(lock);
  const hygiene = isHygieneActive(lock);
  const hygieneLeft = hygieneRemainingMs(lock, now);
  const overtime = hygieneOvertimeMs(lock, now);
  const pendingPenalty = computeHygienePenaltyMs(lock, overtime);
  const progress = lock.durationMs > 0 ? remaining / lock.durationMs : 0;
  const emergencyGate = canUseEmergency(lock, now);
  const [endOpen, setEndOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tasks, setTasks] = useState<LockTask[]>([]);
  const historyKey = `${lock.endsAt}-${lock.durationMs}-${lastPenaltyMs ?? 0}-${lock.integrityPenaltyCount}`;

  const keyUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/key/${lock.keyholderToken}`;
  }, [lock.keyholderToken]);

  useEffect(() => {
    let cancelled = false;
    void listLockTasks({
      data: { token: lock.wearerToken, role: "wearer" },
    }).then((rows) => {
      if (!cancelled) setTasks(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [lock.wearerToken, lock.endsAt, historyKey]);

  async function copyKeyLink() {
    try {
      await navigator.clipboard.writeText(keyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  const endHint = frozen
    ? "冻结中无法结束"
    : timerDone && !isMinLockMet(lock, now)
      ? `计时已到，但需至 ${formatDateTimeZh(minLockEndsAt(lock))} 才可自行结束`
      : ready
        ? "须逐字输入宣言才能结束"
        : "到期后可结束";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
        <div className="view-enter mx-auto size-48">
          <VaultDial
            progress={ready || hygiene || frozen ? 0 : progress}
            open={ready || hygiene}
          />
        </div>

        {hygiene ? (
          <div className="view-enter stagger-2 space-y-3 text-center">
            <p className="font-display text-2xl tracking-tight text-fg">
              卫生清洁中
            </p>
            {overtime > 0 ? (
              <p className="text-sm text-warn">
                已超时 {formatDurationZh(overtime)} · 将加罚{" "}
                {formatDurationZh(pendingPenalty)}
              </p>
            ) : (
              <p className="text-sm text-muted">
                剩余清洁时间 {formatDurationZh(hygieneLeft)}
              </p>
            )}
            <Countdown remainingMs={overtime > 0 ? overtime : hygieneLeft} />
          </div>
        ) : frozen ? (
          <div className="view-enter stagger-2 space-y-2 text-center">
            <p className="font-display text-3xl tracking-tight text-fg">已冻结</p>
            <p className="text-sm text-muted">倒计时暂停，由钥匙持有人解冻</p>
            <Countdown remainingMs={remaining} />
          </div>
        ) : ready ? (
          <div className="view-enter stagger-2 space-y-2 text-center">
            <p className="font-display text-3xl tracking-tight text-fg">可以结束</p>
            <p className="text-sm text-muted">{endHint}</p>
          </div>
        ) : (
          <div className="view-enter stagger-2 space-y-3">
            <p className="text-center text-sm tracking-wide text-muted">
              {timerDone ? "等待最低锁定" : "剩余时间"}
            </p>
            <Countdown remainingMs={remaining} />
            {timerDone && !isMinLockMet(lock, now) ? (
              <p className="text-center text-xs text-warn">{endHint}</p>
            ) : null}
          </div>
        )}

        {lastPenaltyMs && lastPenaltyMs > 0 ? (
          <p className="text-center text-sm text-warn" role="status">
            清洁超时，已加罚 {formatDurationZh(lastPenaltyMs)}
          </p>
        ) : null}

        <dl className="view-enter stagger-3 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
          <Row label="解锁时间" value={formatDateTimeZh(lock.endsAt)} />
          <Row
            label="最低锁定至"
            value={
              lock.minLockMs > 0
                ? formatDateTimeZh(minLockEndsAt(lock))
                : "未额外限制"
            }
          />
          <Row label="锁定时长" value={formatDurationZh(lock.durationMs)} />
          {lock.integrityPenaltyCount > 0 ? (
            <Row
              label="完整性惩罚"
              value={`${lock.integrityPenaltyCount} 次`}
            />
          ) : null}
        </dl>

        {lock.photoRequestActive ? (
          <PhotoVerify busy={busy} onSubmit={onPhotoSubmit} />
        ) : null}

        {tasks.filter((t) => t.status === "open").length > 0 ? (
          <section className="space-y-2 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
            <h2 className="text-sm font-medium text-muted">待完成任务</h2>
            <ul className="space-y-2">
              {tasks
                .filter((t) => t.status === "open")
                .map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-fg">
                      {t.title}
                      <span className="ml-2 text-xs text-muted">
                        {t.rewardType === "unlock"
                          ? "完成可解锁"
                          : `完成减 ${formatDurationZh(t.rewardMs)}`}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="chip"
                      variant="secondary"
                      className="text-xs"
                      disabled={busy}
                      onClick={() =>
                        void (async () => {
                          const res = await completeLockTask({
                            data: {
                              token: lock.wearerToken,
                              role: "wearer",
                              taskId: t.id,
                            },
                          });
                          onLockUpdate?.(
                            res.lock.status === "active" ? res.lock : null,
                          );
                        })()
                      }
                    >
                      完成
                    </Button>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <div className="view-enter stagger-4 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
          <div className="flex items-center gap-2 text-sm text-fg">
            <KeyRound className="size-4 text-muted" />
            钥匙持有人链接
          </div>
          <p className="break-all text-xs leading-relaxed text-muted">{keyUrl}</p>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void copyKeyLink()}
          >
            {copied ? (
              <>
                <Check className="size-4" /> 已复制
              </>
            ) : (
              <>
                <Copy className="size-4" /> 复制链接
              </>
            )}
          </Button>
        </div>

        <PenaltyHistory
          token={lock.wearerToken}
          role="wearer"
          refreshKey={historyKey}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-bg px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {hygiene ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={() => void onEndHygiene()}
          >
            <ShowerHead className="size-4" />
            {busy ? "处理中…" : overtime > 0 ? "结束清洁并接受罚时" : "结束清洁"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!ready || busy}
              onClick={() => setEndOpen(true)}
            >
              {ready ? "逐字输入宣言结束" : endHint}
            </Button>
            {lock.allowHygiene && !ready && !frozen ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => void onStartHygiene()}
              >
                <ShowerHead className="size-4" />
                开始卫生清洁
              </Button>
            ) : null}
            {lock.allowEmergency && !ready ? (
              <Button
                type="button"
                variant="outline"
                className="w-full text-warn"
                disabled={busy || !emergencyGate.ok}
                onClick={() => setEmergencyOpen(true)}
              >
                <ShieldAlert className="size-4" />
                {emergencyGate.ok
                  ? "紧急解锁"
                  : emergencyGate.reason || "紧急解锁不可用"}
              </Button>
            ) : null}
          </>
        )}
      </div>

      <PhraseConfirmDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        title="确认结束锁定"
        description="请逐字输入创建时设定的固定文字，全部正确后才能结束。"
        phrase={lock.endPhrase}
        confirmLabel="确认结束"
        busy={busy}
        charByChar
        onConfirm={async (phrase) => {
          await onEnd(phrase);
          setEndOpen(false);
        }}
      />

      <PhraseConfirmDialog
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        title="确认紧急解锁"
        description="须逐字输入宣言。限制与惩罚规则仍生效。"
        phrase={lock.endPhrase}
        confirmLabel="确认紧急解锁"
        busy={busy}
        charByChar
        onConfirm={async (phrase) => {
          await onEmergency(phrase);
          setEmergencyOpen(false);
        }}
      />
    </div>
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
