import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0] || "用户",
          callbackURL: "/",
        });
        if (res.error) throw new Error(res.error.message || "注册失败");
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (res.error) throw new Error(res.error.message || "登录失败");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <p className="text-xs tracking-widest text-muted">Yue Lock</p>
      <h1 className="font-display mt-2 text-4xl tracking-tight text-fg">登录月锁</h1>
      <p className="mt-2 text-sm text-muted">
        登录后可在个人资料中选择佩戴者或钥匙管理者身份。
      </p>

      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">登录功能未开启。</p>
      ) : (
        <div className="mt-8 space-y-6">
          <form onSubmit={(e) => void submitEmail(e)} className="space-y-3">
            {mode === "signup" ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="显示名称"
                className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none shadow-[var(--shadow-border)]"
              />
            ) : null}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none shadow-[var(--shadow-border)]"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少 8 位）"
              className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none shadow-[var(--shadow-border)]"
            />
            {error ? (
              <p className="text-sm text-warn" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "请稍候…" : mode === "signup" ? "注册并登录" : "邮箱登录"}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-center text-sm text-muted underline-offset-2 hover:underline"
            onClick={() =>
              setMode((m) => (m === "signin" ? "signup" : "signin"))
            }
          >
            {mode === "signin" ? "没有账号？注册" : "已有账号？登录"}
          </button>

          <div className="relative py-2 text-center text-xs text-subtle">
            <span className="bg-bg px-2">或使用社交账号</span>
          </div>

          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
              >
                使用 {p.label} 继续
              </Button>
            ))}
          </div>

          <p className="text-center text-xs text-subtle">
            自建服务器请优先使用邮箱注册。Google / X 依赖 Grok 平台注入配置。
          </p>
        </div>
      )}

      <Link to="/" className="mt-10 text-center text-sm text-muted hover:text-fg">
        返回首页
      </Link>
    </main>
  );
}
