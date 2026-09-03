import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
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
import { VaultDial } from "@/components/lock/vault-dial";
import {
  durationFromParts,
  formatDateTimeZh,
  formatDurationZh,
} from "@/lib/format-time";
import {
  DEFAULT_EMERGENCY_PENALTY_MS,
  DEFAULT_END_PHRASE,
  DEFAULT_HYGIENE_MAX_MS,
  DEFAULT_HYGIENE_PENALTY_FIXED_MS,
  DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
  type CreateLockInput,
  type EmergencyLimitMode,
  type HygienePenaltyMode,
} from "@/lib/lock-types";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "15 分", days: 0, hours: 0, minutes: 15 },
  { label: "1 时", days: 0, hours: 1, minutes: 0 },
  { label: "6 时", days: 0, hours: 6, minutes: 0 },
  { label: "12 时", days: 0, hours: 12, minutes: 0 },
  { label: "1 天", days: 1, hours: 0, minutes: 0 },
  { label: "3 天", days: 3, hours: 0, minutes: 0 },
  { label: "7 天", days: 7, hours: 0, minutes: 0 },
  { label: "30 天", days: 30, hours: 0, minutes: 0 },
] as const;

const HYGIENE_PRESETS = [
  { label: "清洁 5 分", ms: 5 * 60_000 },
  { label: "清洁 10 分", ms: 10 * 60_000 },
  { label: "清洁 15 分", ms: 15 * 60_000 },
  { label: "清洁 30 分", ms: 30 * 60_000 },
] as const;

const FIXED_PENALTY_PRESETS = [
  { label: "罚 1 时", ms: 60 * 60_000 },
  { label: "罚 6 时", ms: 6 * 60 * 60_000 },
  { label: "罚 1 天", ms: 24 * 60 * 60_000 },
  { label: "罚 3 天", ms: 3 * 24 * 60 * 60_000 },
] as const;

const MULTIPLIER_PRESETS = [
  { label: "2×", value: 2 },
  { label: "3×", value: 3 },
  { label: "5×", value: 5 },
  { label: "10×", value: 10 },
] as const;

const EMERGENCY_PENALTY_PRESETS = [
  { label: "记 1 天", ms: 24 * 60 * 60_000 },
  { label: "记 3 天", ms: 3 * 24 * 60 * 60_000 },
  { label: "记 7 天", ms: 7 * 24 * 60 * 60_000 },
  { label: "记 30 天", ms: 30 * 24 * 60 * 60_000 },
] as const;

type CreateLockProps = {
  onStart: (input: CreateLockInput) => Promise<void>;
  busy?: boolean;
  error?: string | null;
};

export function CreateLock({ onStart, busy, error }: CreateLockProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [allowEmergency, setAllowEmergency] = useState(true);
  const [emergencyLimitMode, setEmergencyLimitMode] =
    useState<EmergencyLimitMode>("cooldown_24h");
  const [emergencyPenaltyMs, setEmergencyPenaltyMs] = useState(
    DEFAULT_EMERGENCY_PENALTY_MS,
  );
  const [allowHygiene, setAllowHygiene] = useState(false);
  const [hygieneMaxMs, setHygieneMaxMs] = useState(DEFAULT_HYGIENE_MAX_MS);
  const [hygienePenaltyMode, setHygienePenaltyMode] =
    useState<HygienePenaltyMode>("multiplier");
  const [hygienePenaltyFixedMs, setHygienePenaltyFixedMs] = useState(
    DEFAULT_HYGIENE_PENALTY_FIXED_MS,
  );
  const [hygienePenaltyMultiplier, setHygienePenaltyMultiplier] = useState(
    DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
  );
  const [endPhrase, setEndPhrase] = useState(DEFAULT_END_PHRASE);
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const durationMs = durationFromParts(days, hours, minutes);
  const phraseOk = endPhrase.trim().length >= 4;
  const valid = durationMs >= 60_000 && phraseOk;
  const unlockAt = useMemo(() => now + durationMs, [now, durationMs]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setDays(preset.days);
    setHours(preset.hours);
    setMinutes(preset.minutes);
  }

  const selectedKey = `${days}-${hours}-${minutes}`;

  async function confirmStart() {
    await onStart({
      durationMs,
      allowEmergency,
      emergencyLimitMode,
      emergencyPenaltyMs,
      allowHygiene,
      hygieneMaxMs: allowHygiene ? hygieneMaxMs : DEFAULT_HYGIENE_MAX_MS,
      hygienePenaltyMode,
      hygienePenaltyFixedMs: allowHygiene
        ? hygienePenaltyFixedMs
        : DEFAULT_HYGIENE_PENALTY_FIXED_MS,
      hygienePenaltyMultiplier: allowHygiene
        ? hygienePenaltyMultiplier
        : DEFAULT_HYGIENE_PENALTY_MULTIPLIER,
      endPhrase,
      notifyExpiry,
    });
    setConfirmOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-4">
        <div className="view-enter mx-auto size-36">
          <VaultDial progress={0} open />
        </div>

        <section className="view-enter stagger-2 space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted">
            快捷时长
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => {
              const key = `${preset.days}-${preset.hours}-${preset.minutes}`;
              const active = key === selectedKey;
              return (
                <Button
                  key={preset.label}
                  type="button"
                  size="chip"
                  variant={active ? "default" : "secondary"}
                  className="px-1 text-xs whitespace-nowrap"
                  aria-pressed={active}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </section>

        <section className="view-enter stagger-3 space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted">
            自定义
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Stepper label="天" value={days} min={0} max={365} onChange={setDays} />
            <Stepper label="时" value={hours} min={0} max={23} onChange={setHours} />
            <Stepper
              label="分"
              value={minutes}
              min={0}
              max={59}
              onChange={setMinutes}
            />
          </div>
        </section>

        <section className="view-enter stagger-4 space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted">规则</h2>
          <div className="space-y-2">
            <ToggleRow
              label="紧急解锁"
              description="佩戴者可提前结束（受冷却/次数限制）"
              checked={allowEmergency}
              onChange={setAllowEmergency}
            />
            <ToggleRow
              label="卫生清洁"
              description="允许限时临时开锁，超时按设定规则加罚时"
              checked={allowHygiene}
              onChange={setAllowHygiene}
            />
            <ToggleRow
              label="到期通知"
              description="到期时发送浏览器通知"
              checked={notifyExpiry}
              onChange={setNotifyExpiry}
            />
          </div>

          {allowEmergency ? (
            <div className="space-y-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
              <p className="text-xs tracking-wide text-muted">紧急解锁限制</p>
              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    {
                      mode: "cooldown_24h" as const,
                      label: "24 小时冷却",
                      desc: "用过后需等满 24 小时才能再用",
                    },
                    {
                      mode: "once_penalty" as const,
                      label: "仅一次 + 永久惩罚记录",
                      desc: "整段锁定只能用一次，并写入不可清除历史",
                    },
                    {
                      mode: "unlimited" as const,
                      label: "不限制次数",
                      desc: "仍会记入事件历史",
                    },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.mode}
                    type="button"
                    size="chip"
                    variant={
                      emergencyLimitMode === opt.mode ? "default" : "secondary"
                    }
                    className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left whitespace-normal"
                    aria-pressed={emergencyLimitMode === opt.mode}
                    onClick={() => setEmergencyLimitMode(opt.mode)}
                  >
                    <span className="text-xs font-medium">{opt.label}</span>
                    <span className="text-[11px] opacity-70">{opt.desc}</span>
                  </Button>
                ))}
              </div>
              {emergencyLimitMode === "once_penalty" ? (
                <div className="space-y-2">
                  <p className="text-xs tracking-wide text-muted">
                    永久惩罚记录时长
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {EMERGENCY_PENALTY_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        size="chip"
                        variant={
                          emergencyPenaltyMs === p.ms ? "default" : "secondary"
                        }
                        className="px-1 text-xs"
                        aria-pressed={emergencyPenaltyMs === p.ms}
                        onClick={() => setEmergencyPenaltyMs(p.ms)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
            <p className="text-xs tracking-wide text-muted">结束宣言</p>
            <p className="text-xs text-subtle">
              到期结束或紧急解锁时，必须完整输入此句才能确认
            </p>
            <textarea
              value={endPhrase}
              onChange={(e) => setEndPhrase(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full resize-none rounded-lg bg-bg px-3 py-2 text-sm text-fg outline-none shadow-[var(--shadow-border)] focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={DEFAULT_END_PHRASE}
            />
            {!phraseOk ? (
              <p className="text-xs text-warn">宣言至少 4 个字</p>
            ) : null}
          </div>

          {allowHygiene ? (
            <div className="space-y-4 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
              <div className="space-y-2">
                <p className="text-xs tracking-wide text-muted">最大清洁开锁时间</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {HYGIENE_PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      size="chip"
                      variant={hygieneMaxMs === p.ms ? "default" : "secondary"}
                      className="px-1 text-xs"
                      aria-pressed={hygieneMaxMs === p.ms}
                      onClick={() => setHygieneMaxMs(p.ms)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs tracking-wide text-muted">超时惩罚方式</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="chip"
                    variant={
                      hygienePenaltyMode === "fixed" ? "default" : "secondary"
                    }
                    aria-pressed={hygienePenaltyMode === "fixed"}
                    onClick={() => setHygienePenaltyMode("fixed")}
                  >
                    固定加时
                  </Button>
                  <Button
                    type="button"
                    size="chip"
                    variant={
                      hygienePenaltyMode === "multiplier"
                        ? "default"
                        : "secondary"
                    }
                    aria-pressed={hygienePenaltyMode === "multiplier"}
                    onClick={() => setHygienePenaltyMode("multiplier")}
                  >
                    倍率加时
                  </Button>
                </div>
              </div>

              {hygienePenaltyMode === "fixed" ? (
                <div className="space-y-2">
                  <p className="text-xs tracking-wide text-muted">
                    超时后固定加回
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {FIXED_PENALTY_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        size="chip"
                        variant={
                          hygienePenaltyFixedMs === p.ms
                            ? "default"
                            : "secondary"
                        }
                        className="px-1 text-xs"
                        aria-pressed={hygienePenaltyFixedMs === p.ms}
                        onClick={() => setHygienePenaltyFixedMs(p.ms)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-subtle">
                    一旦超时，不论超时多久，都加回上述固定时长
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs tracking-wide text-muted">
                    超时倍率
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {MULTIPLIER_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        size="chip"
                        variant={
                          hygienePenaltyMultiplier === p.value
                            ? "default"
                            : "secondary"
                        }
                        className="px-1 text-xs"
                        aria-pressed={hygienePenaltyMultiplier === p.value}
                        onClick={() => setHygienePenaltyMultiplier(p.value)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-subtle">
                    实际超时时长 × 倍率，加回锁定时间（如 2×：超时 10 分罚 20 分）
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <p className="text-center text-sm text-muted">
          {valid ? (
            <>
              将于 <span className="text-fg">{formatDateTimeZh(unlockAt)}</span>{" "}
              解锁
            </>
          ) : (
            "请至少设定 1 分钟"
          )}
        </p>

        {error ? (
          <p className="text-center text-sm text-warn" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border bg-bg px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!valid || busy}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? "创建中…" : "开始锁定"}
        </Button>
        <p className="mt-3 text-center text-xs text-subtle">
          开始后将生成钥匙链接，供持有人远程管锁
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认开始锁定</AlertDialogTitle>
            <AlertDialogDescription>
              本次时长 {formatDurationZh(durationMs)}，将于{" "}
              {formatDateTimeZh(Date.now() + durationMs)} 解锁。
              {allowHygiene
                ? ` 允许卫生清洁，最长 ${formatDurationZh(hygieneMaxMs)}。超时惩罚：${
                    hygienePenaltyMode === "fixed"
                      ? `固定加回 ${formatDurationZh(hygienePenaltyFixedMs)}`
                      : `超时 × ${hygienePenaltyMultiplier}`
                  }（写入永久历史）。`
                : " 不允许卫生清洁。"}
              {allowEmergency
                ? ` 紧急解锁：${
                    emergencyLimitMode === "cooldown_24h"
                      ? "24 小时冷却"
                      : emergencyLimitMode === "once_penalty"
                        ? `仅一次并永久记录 ${formatDurationZh(emergencyPenaltyMs)}`
                        : "不限次数"
                  }。`
                : " 未开启紧急解锁。"}
              结束须完整输入宣言。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>返回</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void confirmStart()}>
              开始锁定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-border)] transition-colors duration-[var(--motion-quick)] hover:bg-surface-2"
    >
      <span>
        <span className="block text-sm text-fg">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-[var(--motion-quick)]",
          checked ? "bg-accent" : "bg-surface-2 shadow-[var(--shadow-border)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-bg transition-transform duration-[var(--motion-quick)]",
            checked && "translate-x-5 bg-accent-fg",
          )}
        />
      </span>
    </button>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <span className="text-xs tracking-wide text-muted">{label}</span>
      <div className="flex w-full items-center justify-between gap-1">
        <button
          type="button"
          className={cn(
            "flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-[var(--motion-quick)] hover:bg-surface-2",
            value <= min && "opacity-30",
          )}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`减少${label}`}
        >
          <Minus className="size-4" />
        </button>
        <span className="font-display min-w-8 text-center text-2xl leading-none tabular-nums">
          {value}
        </span>
        <button
          type="button"
          className={cn(
            "flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-[var(--motion-quick)] hover:bg-surface-2",
            value >= max && "opacity-30",
          )}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`增加${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
