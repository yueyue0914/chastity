import { useEffect, useState } from "react";
import { formatDateTimeZh, formatDurationZh } from "@/lib/format-time";
import { listLockEvents } from "@/lib/lock-server";
import type { LockEvent } from "@/lib/lock-types";

const KIND_LABEL: Record<string, string> = {
  started: "开始锁定",
  hygiene_penalty: "清洁超时惩罚",
  emergency: "紧急解锁",
  emergency_penalty: "紧急永久惩罚",
  ended: "到期结束",
  keyholder_unlock: "钥匙开锁",
  keyholder_add_time: "钥匙加时",
  keyholder_sub_time: "钥匙减时",
  freeze: "冻结",
  unfreeze: "解冻",
  force_hygiene: "强制清洁",
  photo_request: "要求拍照",
  photo_submit: "提交拍照",
  task_created: "发布任务",
  task_done: "完成任务",
  integrity_penalty: "完整性惩罚",
  min_lock_set: "最低锁定",
};

type PenaltyHistoryProps = {
  token: string;
  role: "wearer" | "keyholder";
  refreshKey?: string | number;
};

export function PenaltyHistory({ token, role, refreshKey }: PenaltyHistoryProps) {
  const [events, setEvents] = useState<LockEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listLockEvents({ data: { token, role } });
        if (!cancelled) setEvents(rows);
      } catch {
        if (!cancelled) setEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, role, refreshKey]);

  if (events.length === 0) return null;

  return (
    <section className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
      <h2 className="text-sm font-medium tracking-wide text-muted">
        惩罚与事件历史
      </h2>
      <p className="text-xs text-subtle">
        记录存于服务端，清除本机数据无法抹掉
      </p>
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-fg">
                {KIND_LABEL[ev.kind] ?? ev.kind}
              </span>
              {ev.amountMs > 0 ? (
                <span className="text-sm text-warn tabular-nums">
                  +{formatDurationZh(ev.amountMs)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted">{ev.detail}</p>
            <p className="mt-1 text-xs text-subtle">
              {formatDateTimeZh(ev.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
