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
  /** If true, only the next correct character can be appended (逐字输入). */
  charByChar?: boolean;
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
  charByChar = true,
  onConfirm,
}: PhraseConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const matched = phrasesMatch(phrase, typed);

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  function onType(next: string) {
    if (!charByChar) {
      setTyped(next);
      return;
    }
    // Only allow growing as a correct prefix of the target phrase.
    if (phrase.startsWith(next)) {
      setTyped(next);
      return;
    }
    // Ignore wrong keystrokes; keep current correct prefix.
  }

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
          {charByChar ? (
            <p className="text-xs text-muted">
              进度 {typed.length}/{phrase.length} · 须逐字输入，错字不会写入
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-xs tracking-wide text-muted">
              {charByChar ? "请逐字输入以上文字" : "请完整输入以上宣言（须一字不差）"}
            </span>
            <textarea
              value={typed}
              onChange={(e) => onType(e.target.value)}
              rows={3}
              spellCheck={false}
              autoComplete="off"
              className={cn(
                "w-full resize-none rounded-lg bg-surface px-3 py-2 text-sm text-fg outline-none shadow-[var(--shadow-border)] focus-visible:ring-2 focus-visible:ring-ring",
              )}
              placeholder="在此输入…"
            />
          </label>
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
