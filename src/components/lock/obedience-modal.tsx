import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_OBEDIENCE_PHRASE } from "@/lib/lock-types";
import { cn } from "@/lib/utils";

type ObedienceModalProps = {
  open: boolean;
  phrase: string;
  onDismiss: () => void;
};

export function ObedienceModal({ open, phrase, onDismiss }: ObedienceModalProps) {
  const [typed, setTyped] = useState("");
  const target = phrase || DEFAULT_OBEDIENCE_PHRASE;
  const ok = typed === target;

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 text-fg shadow-[var(--shadow-border)]">
        <p className="text-xs tracking-widest text-muted">服从强化</p>
        <h2 className="font-display mt-2 text-2xl tracking-tight">确认提示</h2>
        <p className="mt-3 text-sm text-muted">
          请输入短句后继续。忽略提示会被视为不服从。
        </p>
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-center text-sm">
          {target}
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={cn(
            "mt-3 w-full rounded-lg bg-bg px-3 py-2 text-sm outline-none shadow-[var(--shadow-border)] focus-visible:ring-2 focus-visible:ring-ring",
          )}
          placeholder="输入短句"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          className="mt-4 w-full"
          size="lg"
          disabled={!ok}
          onClick={onDismiss}
        >
          确认服从
        </Button>
      </div>
    </div>
  );
}
