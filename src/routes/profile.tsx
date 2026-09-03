import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn, SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfile,
  type UserRole,
} from "@/lib/profile-server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  {
    id: "wearer",
    label: "佩戴者",
    desc: "创建并执行锁定，接受钥匙管理者的远程管锁",
  },
  {
    id: "keyholder",
    label: "钥匙管理者",
    desc: "持有钥匙，远程加时 / 减时 / 任务 / 开锁",
  },
  {
    id: "both",
    label: "两者皆可",
    desc: "同一账号可切换佩戴与管锁场景",
  },
];

function ProfilePage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <ProfileForm />
      </SignedIn>
    </>
  );
}

function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("both");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getMyProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName);
        setRole(p.role);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      });
  }, []);

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const next = await updateMyProfile({ data: { displayName, role } });
      setProfile(next);
      setMessage("已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-muted">账号</p>
          <h1 className="font-display mt-1 text-3xl tracking-tight">个人资料</h1>
        </div>
        <UserButton />
      </div>

      <div className="mt-8 space-y-6">
        <label className="block space-y-2">
          <span className="text-sm text-muted">显示名称</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none shadow-[var(--shadow-border)]"
            placeholder="怎么称呼你"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm text-muted">我的身份</p>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={cn(
                  "w-full rounded-xl px-4 py-3 text-left shadow-[var(--shadow-border)] transition-colors",
                  role === r.id ? "bg-accent text-accent-fg" : "bg-surface text-fg",
                )}
              >
                <span className="block text-sm font-medium">{r.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    role === r.id ? "opacity-80" : "text-muted",
                  )}
                >
                  {r.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-warn">{error}</p> : null}
        {message ? <p className="text-sm text-muted">{message}</p> : null}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={busy || !profile}
          onClick={() => void save()}
        >
          {busy ? "保存中…" : "保存资料"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary">
            <Link to="/">去佩戴端</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/keys">钥匙工作台</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
