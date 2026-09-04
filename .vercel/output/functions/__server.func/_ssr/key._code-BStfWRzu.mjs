import { o as __toESM } from "../_runtime.mjs";
import { a as hygieneRemainingMs, i as hygieneOvertimeMs, l as remainingMs, o as isHygieneActive, s as isLockReady } from "./lock-types-DsF-B3mr.mjs";
import { d as require_jsx_runtime, f as require_react } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as ShowerHead, o as LockOpen, s as KeyRound } from "../_libs/lucide-react.mjs";
import { n as Route } from "./router-C2-c-c6O.mjs";
import { S as unlockLock, _ as formatDurationZh, a as AlertDialogDescription, b as keyholderAddTime, c as AlertDialogTitle, d as VaultDial, g as formatDateTimeZh, h as endHygiene, i as AlertDialogContent, l as Button, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as Countdown, v as getLockByKeyholder, x as startHygiene } from "./lock-server-C7Ycw-UB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/key._code-BStfWRzu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ADD_PRESETS = [
	{
		label: "+15 分",
		ms: 9e5
	},
	{
		label: "+1 时",
		ms: 36e5
	},
	{
		label: "+6 时",
		ms: 216e5
	},
	{
		label: "+1 天",
		ms: 864e5
	}
];
function KeyholderPanel({ code }) {
	const [lock, setLock] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [unlockOpen, setUnlockOpen] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)(null);
	async function load() {
		try {
			const remote = await getLockByKeyholder({ data: { token: code } });
			setLock(remote);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载失败");
		} finally {
			setLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		load();
		const id = window.setInterval(() => void load(), 4e3);
		return () => window.clearInterval(id);
	}, [code]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, []);
	async function run(action, okMsg) {
		setBusy(true);
		setMessage(null);
		try {
			const next = await action();
			setLock(next.status === "active" ? next : null);
			if (okMsg) setMessage(okMsg);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "操作失败");
		} finally {
			setBusy(false);
		}
	}
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-center text-sm text-muted",
		children: "加载中…"
	}) });
	if (!lock || lock.status !== "active") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto size-36",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VaultDial, {
				progress: 0,
				open: true
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 text-center font-display text-2xl text-fg",
			children: "无进行中锁定"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-center text-sm text-muted",
			children: "链接无效，或锁定已结束"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				variant: "secondary",
				className: "w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					children: "返回月锁"
				})
			})
		})
	] });
	const ready = isLockReady(lock, now);
	const hygiene = isHygieneActive(lock);
	const remaining = remainingMs(lock, now);
	const overtime = hygieneOvertimeMs(lock, now);
	const hygieneLeft = hygieneRemainingMs(lock, now);
	const progress = lock.durationMs > 0 ? remaining / lock.durationMs : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mb-6 flex items-end justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-center gap-1.5 text-xs tracking-widest text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "size-3.5" }), " 钥匙持有人"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-1 text-3xl tracking-tight text-fg",
				children: "远程管锁"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "rounded-full px-3 py-1 text-xs text-muted shadow-[var(--shadow-border)]",
				children: hygiene ? overtime > 0 ? "清洁超时" : "清洁中" : ready ? "已到期" : "锁定中"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto size-44",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VaultDial, {
				progress: ready || hygiene ? 0 : progress,
				open: ready || hygiene
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 space-y-3",
			children: hygiene ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-sm text-muted",
				children: overtime > 0 ? `已超时 ${formatDurationZh(overtime)}` : `清洁剩余 ${formatDurationZh(hygieneLeft)}`
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Countdown, { remainingMs: overtime > 0 ? overtime : hygieneLeft })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-sm text-muted",
				children: "剩余时间"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Countdown, { remainingMs: remaining })] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
			className: "mt-6 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "解锁时间",
					value: formatDateTimeZh(lock.endsAt)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "锁定时长",
					value: formatDurationZh(lock.durationMs)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "卫生清洁",
					value: lock.allowHygiene ? `最长 ${formatDurationZh(lock.hygieneMaxMs)}` : "未允许"
				})
			]
		}),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-center text-sm text-warn",
			role: "alert",
			children: error
		}) : null,
		message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-center text-sm text-muted",
			role: "status",
			children: message
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-wide text-muted",
					children: "增加时间"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-4 gap-2",
					children: ADD_PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "chip",
						variant: "secondary",
						className: "px-1 text-xs",
						disabled: busy,
						onClick: () => void run(() => keyholderAddTime({ data: {
							token: code,
							addMs: p.ms
						} }), `已增加 ${p.label.replace("+", "")}`),
						children: p.label
					}, p.label))
				}),
				lock.allowHygiene ? hygiene ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "secondary",
					className: "w-full",
					disabled: busy,
					onClick: () => void run(() => endHygiene({ data: {
						token: code,
						role: "keyholder"
					} }), overtime > 0 ? "已结束清洁并结算罚时" : "已结束清洁"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowerHead, { className: "size-4" }), "结束清洁"]
				}) : !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "secondary",
					className: "w-full",
					disabled: busy,
					onClick: () => void run(() => startHygiene({ data: {
						token: code,
						role: "keyholder"
					} }), "已批准卫生清洁"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowerHead, { className: "size-4" }), "批准卫生清洁"]
				}) : null : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "lg",
					className: "w-full",
					disabled: busy,
					onClick: () => setUnlockOpen(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "size-4" }), "开锁结束"]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
			open: unlockOpen,
			onOpenChange: setUnlockOpen,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "确认开锁？" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "将立即结束对方的锁定。此操作不可撤销。" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "取消" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
				onClick: () => {
					setUnlockOpen(false);
					run(() => unlockLock({ data: {
						token: code,
						mode: "keyholder"
					} }), "已开锁");
				},
				children: "确认开锁"
			})] })] })
		})
	] });
}
function Shell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "mx-auto flex h-dvh w-full max-w-md flex-col overflow-y-auto bg-bg px-6 pt-8 text-fg",
		children
	});
}
function Row({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "shrink-0 text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "text-right text-sm text-fg",
			children: value
		})]
	});
}
function KeyholderPage() {
	const { code } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyholderPanel, { code });
}
//#endregion
export { KeyholderPage as component };
