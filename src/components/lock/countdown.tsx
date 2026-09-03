import { pad2, splitRemaining } from "@/lib/format-time";

const UNITS = [
  { key: "days", label: "天" },
  { key: "hours", label: "时" },
  { key: "minutes", label: "分" },
  { key: "seconds", label: "秒" },
] as const;

export function Countdown({ remainingMs }: { remainingMs: number }) {
  const parts = splitRemaining(remainingMs);

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        剩余 {parts.days} 天 {parts.hours} 时 {parts.minutes} 分 {parts.seconds} 秒
      </p>
      <div className="grid grid-cols-4 gap-2">
        {UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex flex-col items-center rounded-lg bg-surface px-1 py-3 shadow-[var(--shadow-border)]"
          >
            <span className="font-display text-3xl leading-none tracking-tight text-fg tabular-nums">
              {pad2(parts[unit.key])}
            </span>
            <span className="mt-2 text-xs tracking-wide text-muted">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
