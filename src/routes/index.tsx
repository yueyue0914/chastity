import { createFileRoute } from "@tanstack/react-router";
import { LockApp } from "@/components/lock/lock-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="h-dvh overflow-hidden bg-bg text-fg">
      <LockApp />
    </main>
  );
}
