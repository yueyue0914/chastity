import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { formatDateTimeZh, formatDurationZh } from "@/lib/format-time";
import { listMyKeyholderLocks, type ManagedLockSummary } from "@/lib/lock-account-server";

export const Route = createFileRoute("/keys")({ component: KeysPage });

function KeysPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <KeysDashboard />
      </SignedIn>
    </>
  );
}

function KeysDashboard() {
  const [locks, setLocks] = useState<ManagedLockSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState("");

  useEffect(() => {
    void listMyKeyholderLocks()
      .then(setLocks)
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs tracking-widest text-muted">
            <KeyRound className="size-3.5" /> 钥匙管理者
          </p>
          <h1 className="font-display mt-1 text-3xl tracking-tight">工作台</h1>
        </div>
        <UserButton />
      </div>

      <p className="mt-3 text-sm text-muted">
        登录账号绑定的锁定会出现在这里。也可粘贴佩戴者发来的钥匙链接认领。
      </p>

      <div className="mt-6 space-y-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
        <p className="text-xs text-muted">认领钥匙链接</p>
        <input
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="粘贴 /key/xxxx 链接或令牌"
          className="w-full rounded-lg bg-bg px-3 py-2 text-sm outline-none shadow-[var(--shadow-border)]"
        />
        <Button
          type="button"
          className="w-full"
          disabled={!invite.trim()}
          onClick={() => {
            const raw = invite.trim();
            const match = raw.match(/\/key\/([a-f0-9]+)/i);
            const code = match?.[1] || raw.replace(/[^a-f0-9]/gi, "");
            if (code.length >= 8) window.location.href = `/key/${code}`;
          }}
        >
          打开并认领
        </Button>
      </div>

      {error ? <p className="mt-4 text-sm text-warn">{error}</p> : null}

      <ul className="mt-6 space-y-3">
        {locks.length === 0 ? (
          <li className="text-sm text-muted">暂无绑定的锁定</li>
        ) : (
          locks.map((l) => (
            <li
              key={l.id}
              className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-fg">
                  {l.status === "active" ? "进行中" : "已结束"}
                </span>
                <span className="text-xs text-muted">
                  {formatDurationZh(l.durationMs)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                解锁时间 {formatDateTimeZh(l.endsAt)}
              </p>
              {l.status === "active" ? (
                <Button asChild variant="secondary" className="mt-3 w-full" size="chip">
                  <Link to="/key/$code" params={{ code: l.keyholderToken }}>
                    进入管锁
                  </Link>
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Button asChild variant="secondary">
          <Link to="/">佩戴端</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/profile">个人资料</Link>
        </Button>
      </div>
    </main>
  );
}
