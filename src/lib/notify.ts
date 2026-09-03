const NOTIFIED_KEY = "yue-lock:notified:";

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notifyLockReady(lockId: string, title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const flag = NOTIFIED_KEY + lockId;
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    // ignore
  }
  try {
    new Notification(title, { body, tag: `yue-lock-${lockId}` });
  } catch {
    // Some embeds block Notification construction.
  }
}

export function notifyHygieneWarning(lockId: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const flag = NOTIFIED_KEY + "hygiene:" + lockId;
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    // ignore
  }
  try {
    new Notification("月锁 · 清洁即将超时", {
      body,
      tag: `yue-lock-hygiene-${lockId}`,
    });
  } catch {
    // ignore
  }
}

export function clearHygieneNotifyFlag(lockId: string) {
  try {
    sessionStorage.removeItem(NOTIFIED_KEY + "hygiene:" + lockId);
  } catch {
    // ignore
  }
}
