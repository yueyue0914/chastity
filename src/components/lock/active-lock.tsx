import { useMemo, useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert, ShowerHead } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/lock/countdown";
import { PenaltyHistory } from "@/components/lock/penalty-history";
import { PhraseConfirmDialog } from "@/components/lock/phrase-confirm-dialog";
import { VaultDial } from "@/components/lock/vault-dial";
import { formatDateTimeZh, formatDurationZh } from "@/lib/format-time";
import {
  canUseEmergency,
  computeHygienePenaltyMs,
  hygieneOvertimeMs,
  hygieneRemainingMs,
  isHygieneActive,
  isLockReady,
  remainingMs,
  type LockRecord,
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
}: ActiveLockProps) {
  const remaining = remainingMs(lock, now);
  const ready = isLockReady(lock, now);
  const hygiene = isHygieneActive(lock);
  const hygieneLeft = hygieneRemainingMs(lock, now);
  const overtime = hygieneOvertimeMs(lock, now);
  const pendingPenalty = computeHygienePenaltyMs(lock, overtime);
  const progress = lock.durationMs > 0 ? remaining / lock.durationMs : 0;
  const emergencyGate = canUseEmergency(lock, now);
  const [endOpen, setEndOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const historyKey = `${lock.endsAt}-${lock.durationMs}-${lastPenaltyMs ?? 0}-${lock.emergencyUseCount}`;

  const keyUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/key/${lock.keyholderToken}`;
  }, [lock.keyholderToken]);

  async function copyKeyLink() {
    try {
      await navigator.clipboard.writeText(keyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  const emergencyLimitLabel =
    lock.emergencyLimitMode === "cooldown_24h"
      ? "24 小时冷却"
      : lock.emergencyLimitMode === "once_penalty"
        ? `仅一次 · 永久记 ${formatDurationZh(lock.emergencyPenaltyMs)}`
        : "不限次数";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
        <div className="view-enter mx-auto size-48">
          <VaultDial
            progress={ready || hygiene ? 0 : progress}
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
                已超时 {formatDurationZh(overtime)} · 结束时将加罚{" "}
                {formatDurationZh(pendingPenalty)}（
                {lock.hygienePenaltyMode === "fixed"
                  ? "固定加时"
                  : `${lock.hygienePenaltyMultiplier}×`}
                ）并写入永久历史
              </p>
            ) : (
              <p className="text-sm text-muted">
                剩余清洁时间 {formatDurationZh(hygieneLeft)}
              </p>
            )}
            <Countdown remainingMs={overtime > 0 ? overtime : hygieneLeft} />
          </div>
        ) : ready ? (
          <div className="view-enter stagger-2 space-y-2 text-center">
            <p className="font-display text-3xl tracking-tight text-fg">已到期</p>
            <p className="text-sm text-muted">须完整输入宣言才能结束</p>
          </div>
        ) : (
          <div className="view-enter stagger-2 space-y-3">
            <p className="text-center text-sm tracking-wide text-muted">剩余时间</p>
            <Countdown remainingMs={remaining} />
          </div>
        )}

        {lastPenaltyMs && lastPenaltyMs > 0 ? (
          <p className="text-center text-sm text-warn" role="status">
            清洁超时，已加罚 {formatDurationZh(lastPenaltyMs)}（已记入历史）
          </p>
        ) : null}

        <dl className="view-enter stagger-3 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
          <Row label="解锁时间" value={formatDateTimeZh(lock.endsAt)} />
          <Row label="锁定时长" value={formatDurationZh(lock.durationMs)} />
          <Row label="开始于" value={formatDateTimeZh(lock.startedAt)} />
          <Row
            label="紧急解锁"
            value={lock.allowEmergency ? emergencyLimitLabel : "未开启"}
          />
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
              {ready ? "输入宣言结束" : "到期后可结束"}
            </Button>
            {lock.allowHygiene && !ready ? (
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
        description="请完整输入创建时设定的宣言，一字不差后才能结束。"
        phrase={lock.endPhrase}
        confirmLabel="确认结束"
        busy={busy}
        onConfirm={async (phrase) => {
          await onEnd(phrase);
          setEndOpen(false);
        }}
      />

      <PhraseConfirmDialog
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        title="确认紧急解锁"
        description={
          lock.emergencyLimitMode === "once_penalty"
            ? `将立即结束锁定，并永久记录惩罚 ${formatDurationZh(lock.emergencyPenaltyMs)}（不可清除）。须完整输入宣言。`
            : lock.emergencyLimitMode === "cooldown_24h"
              ? "将立即结束锁定，之后 24 小时内不可再次紧急解锁。须完整输入宣言。"
              : "将立即结束锁定。须完整输入宣言。"
        }
        phrase={lock.endPhrase}
        confirmLabel="确认紧急解锁"
        busy={busy}
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
