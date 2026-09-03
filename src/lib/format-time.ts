export type TimeParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
};

export function splitRemaining(ms: number): TimeParts {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDurationZh(ms: number): string {
  const { days, hours, minutes } = splitRemaining(ms);
  const parts: string[] = [];
  if (days) parts.push(`${days} 天`);
  if (hours) parts.push(`${hours} 小时`);
  if (minutes) parts.push(`${minutes} 分钟`);
  if (parts.length === 0) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    if (seconds > 0) return `${seconds} 秒`;
    return "0 分钟";
  }
  return parts.join(" ");
}

export function formatDateTimeZh(ts: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ts);
}

export function durationFromParts(
  days: number,
  hours: number,
  minutes: number,
): number {
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
}
