import { o as __toESM } from "../_runtime.mjs";
import { a as hygieneRemainingMs, c as isLockRecord, i as hygieneOvertimeMs, l as remainingMs, n as LOCK_STORAGE_KEY, o as isHygieneActive, s as isLockReady, t as DEFAULT_HYGIENE_MAX_MS } from "./lock-types-DsF-B3mr.mjs";
import { d as require_jsx_runtime, f as require_react } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as Minus, c as Copy, i as Plus, l as Check, n as ShowerHead, r as ShieldAlert, s as KeyRound } from "../_libs/lucide-react.mjs";
import { S as unlockLock, _ as formatDurationZh, a as AlertDialogDescription, c as AlertDialogTitle, d as VaultDial, f as cn, g as formatDateTimeZh, h as endHygiene, i as AlertDialogContent, l as Button, m as durationFromParts, n as AlertDialogAction, o as AlertDialogFooter, p as createLockSession, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as Countdown, x as startHygiene, y as getLockByWearer } from "./lock-server-C7Ycw-UB.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DvsGBppt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ActiveLock({ lock, now, busy, lastPenaltyMs, onEnd, onEmergency, onStartHygiene, onEndHygiene }) {
	const remaining = remainingMs(lock, now);
	const ready = isLockReady(lock, now);
	const hygiene = isHygieneActive(lock);
	const hygieneLeft = hygieneRemainingMs(lock, now);
	const overtime = hygieneOvertimeMs(lock, now);
	const progress = lock.durationMs > 0 ? remaining / lock.durationMs : 0;
	const [emergencyOpen, setEmergencyOpen] = (0, import_react.useState)(false);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const keyUrl = (0, import_react.useMemo)(() => {
		if (typeof window === "undefined") return "";
		return `${window.location.origin}/key/${lock.keyholderToken}`;
	}, [lock.keyholderToken]);
	async function copyKeyLink() {
		try {
			await navigator.clipboard.writeText(keyUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "view-enter mx-auto size-48",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VaultDial, {
							progress: ready || hygiene ? 0 : progress,
							open: ready || hygiene
						})
					}),
					hygiene ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "view-enter stagger-2 space-y-3 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-2xl tracking-tight text-fg",
								children: "卫生清洁中"
							}),
							overtime > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-warn",
								children: [
									"已超时 ",
									formatDurationZh(overtime),
									" · 结束时将 1:1 加罚时"
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: ["剩余清洁时间 ", formatDurationZh(hygieneLeft)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Countdown, { remainingMs: overtime > 0 ? overtime : hygieneLeft })
						]
					}) : ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "view-enter stagger-2 space-y-2 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl tracking-tight text-fg",
							children: "已到期"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "可以结束这次锁定"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "view-enter stagger-2 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-center text-sm tracking-wide text-muted",
							children: "剩余时间"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Countdown, { remainingMs: remaining })]
					}),
					lastPenaltyMs && lastPenaltyMs > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-center text-sm text-warn",
						role: "status",
						children: ["清洁超时，已加罚 ", formatDurationZh(lastPenaltyMs)]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "view-enter stagger-3 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]",
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
								label: "开始于",
								value: formatDateTimeZh(lock.startedAt)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "紧急解锁",
								value: lock.allowEmergency ? "已开启" : "未开启"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "卫生清洁",
								value: lock.allowHygiene ? `最长 ${formatDurationZh(lock.hygieneMaxMs)}` : "未允许"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "view-enter stagger-4 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 text-sm text-fg",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "size-4 text-muted" }), "钥匙持有人链接"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "break-all text-xs leading-relaxed text-muted",
								children: keyUrl
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								className: "w-full",
								onClick: () => void copyKeyLink(),
								children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), " 已复制"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), " 复制链接"] })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: "持有人可远程加时、开锁，或协助结束清洁"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "shrink-0 space-y-2 border-t border-border bg-bg px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
				children: hygiene ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "lg",
					className: "w-full",
					disabled: busy,
					onClick: () => void onEndHygiene(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowerHead, { className: "size-4" }), busy ? "处理中…" : overtime > 0 ? "结束清洁并接受罚时" : "结束清洁"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "lg",
						className: "w-full",
						disabled: !ready || busy,
						onClick: onEnd,
						children: ready ? "结束锁定" : "到期后可结束"
					}),
					lock.allowHygiene && !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						className: "w-full",
						disabled: busy,
						onClick: () => void onStartHygiene(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowerHead, { className: "size-4" }), "开始卫生清洁"]
					}) : null,
					lock.allowEmergency && !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "outline",
						className: "w-full text-warn",
						disabled: busy,
						onClick: () => setEmergencyOpen(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "size-4" }), "紧急解锁"]
					}) : null
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: emergencyOpen,
				onOpenChange: setEmergencyOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "确认紧急解锁？" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "将立即结束本次锁定。仅在真正需要时使用。" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "取消" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => {
						setEmergencyOpen(false);
						onEmergency();
					},
					children: "确认紧急解锁"
				})] })] })
			})
		]
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
var PRESETS = [
	{
		label: "15 分",
		days: 0,
		hours: 0,
		minutes: 15
	},
	{
		label: "1 时",
		days: 0,
		hours: 1,
		minutes: 0
	},
	{
		label: "6 时",
		days: 0,
		hours: 6,
		minutes: 0
	},
	{
		label: "12 时",
		days: 0,
		hours: 12,
		minutes: 0
	},
	{
		label: "1 天",
		days: 1,
		hours: 0,
		minutes: 0
	},
	{
		label: "3 天",
		days: 3,
		hours: 0,
		minutes: 0
	},
	{
		label: "7 天",
		days: 7,
		hours: 0,
		minutes: 0
	},
	{
		label: "30 天",
		days: 30,
		hours: 0,
		minutes: 0
	}
];
var HYGIENE_PRESETS = [
	{
		label: "清洁 5 分",
		ms: 3e5
	},
	{
		label: "清洁 10 分",
		ms: 6e5
	},
	{
		label: "清洁 15 分",
		ms: 9e5
	},
	{
		label: "清洁 30 分",
		ms: 18e5
	}
];
function CreateLock({ onStart, busy, error }) {
	const [days, setDays] = (0, import_react.useState)(0);
	const [hours, setHours] = (0, import_react.useState)(1);
	const [minutes, setMinutes] = (0, import_react.useState)(0);
	const [allowEmergency, setAllowEmergency] = (0, import_react.useState)(true);
	const [allowHygiene, setAllowHygiene] = (0, import_react.useState)(false);
	const [hygieneMaxMs, setHygieneMaxMs] = (0, import_react.useState)(DEFAULT_HYGIENE_MAX_MS);
	const [notifyExpiry, setNotifyExpiry] = (0, import_react.useState)(true);
	const [confirmOpen, setConfirmOpen] = (0, import_react.useState)(false);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 3e4);
		return () => window.clearInterval(id);
	}, []);
	const durationMs = durationFromParts(days, hours, minutes);
	const valid = durationMs >= 6e4;
	const unlockAt = (0, import_react.useMemo)(() => now + durationMs, [now, durationMs]);
	function applyPreset(preset) {
		setDays(preset.days);
		setHours(preset.hours);
		setMinutes(preset.minutes);
	}
	const selectedKey = `${days}-${hours}-${minutes}`;
	async function confirmStart() {
		await onStart({
			durationMs,
			allowEmergency,
			allowHygiene,
			hygieneMaxMs: allowHygiene ? hygieneMaxMs : DEFAULT_HYGIENE_MAX_MS,
			notifyExpiry
		});
		setConfirmOpen(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "view-enter mx-auto size-36",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VaultDial, {
							progress: 0,
							open: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "view-enter stagger-2 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium tracking-wide text-muted",
							children: "快捷时长"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-4 gap-2",
							children: PRESETS.map((preset) => {
								const active = `${preset.days}-${preset.hours}-${preset.minutes}` === selectedKey;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									size: "chip",
									variant: active ? "default" : "secondary",
									className: "px-1 text-xs whitespace-nowrap",
									"aria-pressed": active,
									onClick: () => applyPreset(preset),
									children: preset.label
								}, preset.label);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "view-enter stagger-3 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium tracking-wide text-muted",
							children: "自定义"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
									label: "天",
									value: days,
									min: 0,
									max: 365,
									onChange: setDays
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
									label: "时",
									value: hours,
									min: 0,
									max: 23,
									onChange: setHours
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
									label: "分",
									value: minutes,
									min: 0,
									max: 59,
									onChange: setMinutes
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "view-enter stagger-4 space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-sm font-medium tracking-wide text-muted",
								children: "规则"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
										label: "紧急解锁",
										description: "佩戴者可提前结束（仍会记录）",
										checked: allowEmergency,
										onChange: setAllowEmergency
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
										label: "卫生清洁",
										description: "允许限时临时开锁；超时 1:1 加罚时",
										checked: allowHygiene,
										onChange: setAllowHygiene
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
										label: "到期通知",
										description: "到期时发送浏览器通知",
										checked: notifyExpiry,
										onChange: setNotifyExpiry
									})
								]
							}),
							allowHygiene ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs tracking-wide text-muted",
										children: "最大清洁开锁时间"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-4 gap-2",
										children: HYGIENE_PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											size: "chip",
											variant: hygieneMaxMs === p.ms ? "default" : "secondary",
											className: "px-1 text-xs",
											"aria-pressed": hygieneMaxMs === p.ms,
											onClick: () => setHygieneMaxMs(p.ms),
											children: p.label
										}, p.label))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-subtle",
										children: "超时部分将按 1:1 加回锁定时间"
									})
								]
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm text-muted",
						children: valid ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							"将于 ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg",
								children: formatDateTimeZh(unlockAt)
							}),
							" ",
							"解锁"
						] }) : "请至少设定 1 分钟"
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm text-warn",
						role: "alert",
						children: error
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "shrink-0 border-t border-border bg-bg px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "lg",
					className: "w-full",
					disabled: !valid || busy,
					onClick: () => setConfirmOpen(true),
					children: busy ? "创建中…" : "开始锁定"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-center text-xs text-subtle",
					children: "开始后将生成钥匙链接，供持有人远程管锁"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: confirmOpen,
				onOpenChange: setConfirmOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "确认开始锁定" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"本次时长 ",
					formatDurationZh(durationMs),
					"，将于",
					" ",
					formatDateTimeZh(Date.now() + durationMs),
					" 解锁。",
					allowHygiene ? ` 允许卫生清洁，最长 ${formatDurationZh(hygieneMaxMs)}，超时按 1:1 加罚时。` : " 不允许卫生清洁。",
					allowEmergency ? " 已开启紧急解锁。" : " 未开启紧急解锁。"
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
					disabled: busy,
					children: "返回"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					disabled: busy,
					onClick: () => void confirmStart(),
					children: "开始锁定"
				})] })] })
			})
		]
	});
}
function ToggleRow({ label, description, checked, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		role: "switch",
		"aria-checked": checked,
		onClick: () => onChange(!checked),
		className: "flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-border)] transition-colors duration-[var(--motion-quick)] hover:bg-surface-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-sm text-fg",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-0.5 block text-xs text-muted",
			children: description
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-[var(--motion-quick)]", checked ? "bg-accent" : "bg-surface-2 shadow-[var(--shadow-border)]"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-bg transition-transform duration-[var(--motion-quick)]", checked && "translate-x-5 bg-accent-fg") })
		})]
	});
}
function Stepper({ label, value, min, max, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs tracking-wide text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full items-center justify-between gap-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cn("flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-[var(--motion-quick)] hover:bg-surface-2", value <= min && "opacity-30"),
					disabled: value <= min,
					onClick: () => onChange(Math.max(min, value - 1)),
					"aria-label": `减少${label}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-display min-w-8 text-center text-2xl leading-none tabular-nums",
					children: value
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cn("flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-[var(--motion-quick)] hover:bg-surface-2", value >= max && "opacity-30"),
					disabled: value >= max,
					onClick: () => onChange(Math.min(max, value + 1)),
					"aria-label": `增加${label}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
				})
			]
		})]
	});
}
var NOTIFIED_KEY = "yue-lock:notified:";
async function ensureNotifyPermission() {
	if (typeof window === "undefined" || !("Notification" in window)) return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	return await Notification.requestPermission() === "granted";
}
function notifyLockReady(lockId, title, body) {
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;
	const flag = NOTIFIED_KEY + lockId;
	try {
		if (sessionStorage.getItem(flag)) return;
		sessionStorage.setItem(flag, "1");
	} catch {}
	try {
		new Notification(title, {
			body,
			tag: `yue-lock-${lockId}`
		});
	} catch {}
}
function notifyHygieneWarning(lockId, body) {
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;
	const flag = NOTIFIED_KEY + "hygiene:" + lockId;
	try {
		if (sessionStorage.getItem(flag)) return;
		sessionStorage.setItem(flag, "1");
	} catch {}
	try {
		new Notification("月锁 · 清洁即将超时", {
			body,
			tag: `yue-lock-hygiene-${lockId}`
		});
	} catch {}
}
function clearHygieneNotifyFlag(lockId) {
	try {
		sessionStorage.removeItem(NOTIFIED_KEY + "hygiene:" + lockId);
	} catch {}
}
function readLock() {
	try {
		const raw = window.localStorage.getItem(LOCK_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return isLockRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}
function writeLock(lock) {
	try {
		if (lock && lock.status === "active") window.localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(lock));
		else window.localStorage.removeItem(LOCK_STORAGE_KEY);
	} catch {}
}
var useLockStore = create((set, get) => ({
	lock: null,
	syncError: null,
	busy: false,
	hydrate: () => {
		set({ lock: readLock() });
	},
	startLock: async (input) => {
		set({
			busy: true,
			syncError: null
		});
		try {
			if (input.notifyExpiry) await ensureNotifyPermission();
			const lock = await createLockSession({ data: input });
			writeLock(lock);
			set({
				lock,
				busy: false
			});
		} catch (err) {
			set({
				busy: false,
				syncError: err instanceof Error ? err.message : "创建失败"
			});
			throw err;
		}
	},
	refresh: async () => {
		const { lock } = get();
		if (!lock || lock.status !== "active") return;
		try {
			const remote = await getLockByWearer({ data: { token: lock.wearerToken } });
			if (!remote || remote.status !== "active") {
				writeLock(null);
				set({
					lock: null,
					syncError: null
				});
				return;
			}
			writeLock(remote);
			set({
				lock: remote,
				syncError: null
			});
		} catch (err) {
			set({ syncError: err instanceof Error ? err.message : "同步失败" });
		}
	},
	endByExpiry: async () => {
		const { lock } = get();
		if (!lock) return false;
		if (Date.now() < lock.endsAt) return false;
		set({ busy: true });
		try {
			await unlockLock({ data: {
				token: lock.wearerToken,
				mode: "expiry"
			} });
			writeLock(null);
			set({
				lock: null,
				busy: false
			});
			return true;
		} catch {
			set({ busy: false });
			return false;
		}
	},
	emergencyUnlock: async () => {
		const { lock } = get();
		if (!lock?.allowEmergency) return false;
		set({ busy: true });
		try {
			await unlockLock({ data: {
				token: lock.wearerToken,
				mode: "emergency"
			} });
			writeLock(null);
			set({
				lock: null,
				busy: false
			});
			return true;
		} catch {
			set({ busy: false });
			return false;
		}
	},
	beginHygiene: async () => {
		const { lock } = get();
		if (!lock?.allowHygiene) return;
		set({
			busy: true,
			syncError: null
		});
		try {
			const next = await startHygiene({ data: {
				token: lock.wearerToken,
				role: "wearer"
			} });
			writeLock(next);
			set({
				lock: next,
				busy: false
			});
		} catch (err) {
			set({
				busy: false,
				syncError: err instanceof Error ? err.message : "无法开始清洁"
			});
			throw err;
		}
	},
	finishHygiene: async () => {
		const { lock } = get();
		if (!lock?.hygieneStartedAt) return { penaltyMs: 0 };
		const beforeEnds = lock.endsAt;
		set({
			busy: true,
			syncError: null
		});
		try {
			const next = await endHygiene({ data: {
				token: lock.wearerToken,
				role: "wearer"
			} });
			writeLock(next);
			set({
				lock: next,
				busy: false
			});
			return { penaltyMs: Math.max(0, next.endsAt - beforeEnds) };
		} catch (err) {
			set({
				busy: false,
				syncError: err instanceof Error ? err.message : "无法结束清洁"
			});
			throw err;
		}
	},
	clearLocal: () => {
		writeLock(null);
		set({ lock: null });
	}
}));
function LockApp() {
	const lock = useLockStore((s) => s.lock);
	const hydrate = useLockStore((s) => s.hydrate);
	const startLock = useLockStore((s) => s.startLock);
	const endByExpiry = useLockStore((s) => s.endByExpiry);
	const emergencyUnlock = useLockStore((s) => s.emergencyUnlock);
	const beginHygiene = useLockStore((s) => s.beginHygiene);
	const finishHygiene = useLockStore((s) => s.finishHygiene);
	const refresh = useLockStore((s) => s.refresh);
	const busy = useLockStore((s) => s.busy);
	const syncError = useLockStore((s) => s.syncError);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [lastPenaltyMs, setLastPenaltyMs] = (0, import_react.useState)(null);
	const notifiedReady = (0, import_react.useRef)(null);
	(0, import_react.useLayoutEffect)(() => {
		hydrate();
	}, [hydrate]);
	(0, import_react.useEffect)(() => {
		if (!lock) return;
		setNow(Date.now());
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, [lock]);
	(0, import_react.useEffect)(() => {
		if (!lock || lock.status !== "active") return;
		refresh();
		const id = window.setInterval(() => void refresh(), 4e3);
		return () => window.clearInterval(id);
	}, [
		lock?.id,
		lock?.status,
		refresh
	]);
	(0, import_react.useEffect)(() => {
		if (!lock || !lock.notifyExpiry) return;
		if (!isLockReady(lock, now)) return;
		if (notifiedReady.current === lock.id) return;
		notifiedReady.current = lock.id;
		notifyLockReady(lock.id, "月锁 · 已到期", "锁定时间已到，可以结束了。");
	}, [lock, now]);
	(0, import_react.useEffect)(() => {
		if (!lock || !isHygieneActive(lock)) {
			if (lock) clearHygieneNotifyFlag(lock.id);
			return;
		}
		const left = hygieneRemainingMs(lock, now);
		if (left > 0 && left <= 6e4) notifyHygieneWarning(lock.id, `清洁将在约 ${Math.ceil(left / 1e3)} 秒后超时，超时将按 1:1 加罚时。`);
	}, [lock, now]);
	const ready = lock ? isLockReady(lock, now) : false;
	const hygiene = lock ? isHygieneActive(lock) : false;
	const status = !lock ? "未锁定" : hygiene ? hygieneOvertimeMs(lock, now) > 0 ? "清洁超时" : "清洁中" : ready ? "已到期" : "锁定中";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-end justify-between px-6 pt-8 pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-widest text-muted",
					children: "Yue Lock"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display mt-1 text-4xl tracking-tight text-fg",
					children: "月锁"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full px-3 py-1 text-xs tracking-wide text-muted shadow-[var(--shadow-border)]",
					children: status
				})]
			}),
			syncError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 pb-2 text-center text-xs text-warn",
				role: "status",
				children: syncError
			}) : null,
			lock ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActiveLock, {
				lock,
				now,
				busy,
				lastPenaltyMs,
				onEnd: () => void endByExpiry(),
				onEmergency: async () => {
					await emergencyUnlock();
				},
				onStartHygiene: async () => {
					setLastPenaltyMs(null);
					await beginHygiene();
				},
				onEndHygiene: async () => {
					const { penaltyMs } = await finishHygiene();
					setLastPenaltyMs(penaltyMs > 0 ? penaltyMs : null);
				}
			}, lock.id + (ready ? "-ready" : hygiene ? "-hygiene" : "-locked")) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateLock, {
				busy,
				error: syncError,
				onStart: async (input) => {
					setLastPenaltyMs(null);
					await startLock(input);
				}
			}, "create")
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "h-dvh overflow-hidden bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockApp, {})
	});
}
//#endregion
export { Home as component };
