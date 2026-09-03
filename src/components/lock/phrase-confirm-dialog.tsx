import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { phrasesMatch } from "@/lib/lock-types";
import { cn } from "@/lib/utils";

type PhraseConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  phrase: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: (phrase: string) => void | Promise<void>;
};

export function PhraseConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  phrase,
  confirmLabel,
  busy,
  onConfirm,
}: PhraseConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const matched = phrasesMatch(phrase, typed);

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm leading-relaxed text-fg shadow-[var(--shadow-border)]">
            {phrase}
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs tracking-wide text-muted">
              请完整输入以上宣言（须一字不差）
            </span>
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              rows={3}
              spellCheck={false}
              autoComplete="off"
              className={cn(
                "w-full resize-none rounded-lg bg-surface px-3 py-2 text-sm text-fg outline-none shadow-[var(--shadow-border)] focus-visible:ring-2 focus-visible:ring-ring",
                typed.length > 0 && !matched && "ring-1 ring-warn",
              )}
              placeholder="在此逐字输入…"
            />
          </label>
          {typed.length > 0 && !matched ? (
            <p className="text-xs text-warn">尚未完全匹配</p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
          <Button
            type="button"
            disabled={!matched || busy}
            onClick={() => void onConfirm(typed)}
          >
            {busy ? "处理中…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
