import "../_runtime.mjs";
import { a as Overlay2, c as Title2, d as require_jsx_runtime, f as require_react, i as Description2, l as Slot, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium select-none transition-[color,background-color,box-shadow,transform,opacity] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg shadow-[var(--shadow-border)] hover:bg-accent/90",
			secondary: "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-surface",
			ghost: "bg-transparent text-fg hover:bg-surface",
			muted: "bg-surface-2 text-muted hover:text-fg"
		},
		size: {
			default: "h-11 rounded-lg px-5",
			sm: "h-9 rounded-md px-3 text-xs",
			lg: "h-12 rounded-lg px-6",
			icon: "size-11 rounded-lg",
			chip: "h-10 rounded-md px-3 text-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		"data-slot": "button",
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
function AlertDialog({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2, {
		"data-slot": "alert-dialog",
		...props
	});
}
function AlertDialogPortal({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, {
		"data-slot": "alert-dialog-portal",
		...props
	});
}
function AlertDialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
		"data-slot": "alert-dialog-overlay",
		className: cn("fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props
	});
}
function AlertDialogContent({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		"data-slot": "alert-dialog-content",
		className: cn("fixed top-1/2 left-4 right-4 z-50 mx-auto grid max-w-sm -translate-y-1/2 gap-4 rounded-xl bg-surface p-6 text-fg shadow-[var(--shadow-border)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props
	})] });
}
function AlertDialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-slot": "alert-dialog-header",
		className: cn("flex flex-col gap-2 text-left", className),
		...props
	});
}
function AlertDialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-slot": "alert-dialog-footer",
		className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
		...props
	});
}
function AlertDialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
		"data-slot": "alert-dialog-title",
		className: cn("font-display text-xl font-medium tracking-tight text-fg", className),
		...props
	});
}
function AlertDialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
		"data-slot": "alert-dialog-description",
		className: cn("text-sm leading-normal text-muted text-pretty", className),
		...props
	});
}
function AlertDialogAction({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
		className: cn(buttonVariants(), className),
		...props
	});
}
function AlertDialogCancel({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
		className: cn(buttonVariants({ variant: "outline" }), className),
		...props
	});
}
function splitRemaining(ms) {
	const totalSeconds = Math.max(0, Math.floor(ms / 1e3));
	return {
		days: Math.floor(totalSeconds / 86400),
		hours: Math.floor(totalSeconds % 86400 / 3600),
		minutes: Math.floor(totalSeconds % 3600 / 60),
		seconds: totalSeconds % 60,
		totalSeconds
	};
}
function pad2(n) {
	return n.toString().padStart(2, "0");
}
function formatDurationZh(ms) {
	const { days, hours, minutes } = splitRemaining(ms);
	const parts = [];
	if (days) parts.push(`${days} 天`);
	if (hours) parts.push(`${hours} 小时`);
	if (minutes) parts.push(`${minutes} 分钟`);
	if (parts.length === 0) {
		const seconds = Math.max(0, Math.floor(ms / 1e3));
		if (seconds > 0) return `${seconds} 秒`;
		return "0 分钟";
	}
	return parts.join(" ");
}
function formatDateTimeZh(ts) {
	return new Intl.DateTimeFormat("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}).format(ts);
}
function durationFromParts(days, hours, minutes) {
	return ((days * 24 + hours) * 60 + minutes) * 60 * 1e3;
}
var UNITS = [
	{
		key: "days",
		label: "天"
	},
	{
		key: "hours",
		label: "时"
	},
	{
		key: "minutes",
		label: "分"
	},
	{
		key: "seconds",
		label: "秒"
	}
];
function Countdown({ remainingMs }) {
	const parts = splitRemaining(remainingMs);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "sr-only",
		"aria-live": "polite",
		children: [
			"剩余 ",
			parts.days,
			" 天 ",
			parts.hours,
			" 时 ",
			parts.minutes,
			" 分 ",
			parts.seconds,
			" 秒"
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-4 gap-2",
		children: UNITS.map((unit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center rounded-lg bg-surface px-1 py-3 shadow-[var(--shadow-border)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-display text-3xl leading-none tracking-tight text-fg tabular-nums",
				children: pad2(parts[unit.key])
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-2 text-xs tracking-wide text-muted",
				children: unit.label
			})]
		}, unit.key))
	})] });
}
var TICKS = Array.from({ length: 60 }, (_, i) => i);
function VaultDial({ progress, open }) {
	const clamped = Math.min(1, Math.max(0, progress));
	const radius = 74;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - clamped);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 200 200",
		className: "size-full text-fg",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "100",
				cy: "100",
				r: "92",
				fill: "none",
				stroke: "currentColor",
				strokeOpacity: "0.08",
				strokeWidth: "1"
			}),
			TICKS.map((i) => {
				const major = i % 5 === 0;
				const angle = i / 60 * 360;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "100",
					y1: major ? 12 : 15,
					x2: "100",
					y2: major ? 22 : 19,
					transform: `rotate(${angle} 100 100)`,
					stroke: "currentColor",
					strokeWidth: major ? 1.4 : .7,
					strokeOpacity: major ? .42 : .16,
					strokeLinecap: "round"
				}, i);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "100",
				cy: "100",
				r: radius,
				fill: "none",
				stroke: "currentColor",
				strokeOpacity: "0.08",
				strokeWidth: "3.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "100",
				cy: "100",
				r: radius,
				fill: "none",
				stroke: "var(--color-accent)",
				strokeWidth: "3.5",
				strokeLinecap: "round",
				strokeDasharray: circumference,
				strokeDashoffset: offset,
				transform: "rotate(-90 100 100)",
				className: "transition-[stroke-dashoffset] duration-[var(--motion-fast)] ease-linear"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "100",
				cy: "100",
				r: "54",
				fill: "var(--color-surface)",
				stroke: "currentColor",
				strokeOpacity: "0.12",
				strokeWidth: "1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {
				className: open ? "shackle shackle-open" : "shackle",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M86 96 V84 a14 14 0 0 1 28 0 V96",
					fill: "none",
					stroke: "var(--color-accent)",
					strokeWidth: "6",
					strokeLinecap: "round"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "78",
				y: "94",
				width: "44",
				height: "42",
				rx: "8",
				fill: "var(--color-surface-2)",
				stroke: "var(--color-accent)",
				strokeWidth: "2.2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "100",
				cy: "111",
				r: "4.2",
				fill: "var(--color-accent)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "98.4",
				y: "114",
				width: "3.2",
				height: "9",
				rx: "1.4",
				fill: "var(--color-accent)"
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function requireToken(token) {
	const t = token.trim();
	if (t.length < 8 || t.length > 64) throw new Error("无效令牌");
	return t;
}
var createLockSession = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("6acf5e69baa4554d4739810037439276292b15a4f582f189b9ef038cd85917b9"));
var getLockByWearer = createServerFn({ method: "GET" }).validator((input) => ({ token: requireToken(input.token) })).handler(createSsrRpc("d83011a9539f70567155d14a76736e50e3056f2853f37cc156a9e9ce041f8ad7"));
var getLockByKeyholder = createServerFn({ method: "GET" }).validator((input) => ({ token: requireToken(input.token) })).handler(createSsrRpc("9355962f03a88467c0da0eeb61ba24a5575010aa0c6ac0a6db3733d8ce9661a7"));
var keyholderAddTime = createServerFn({ method: "POST" }).validator((input) => {
	const addMs = Number(input.addMs);
	if (!Number.isFinite(addMs) || addMs <= 0 || addMs > 2592e6) throw new Error("加时无效");
	return {
		token: requireToken(input.token),
		addMs
	};
}).handler(createSsrRpc("ef38349cb74bafaa215ed9e73874a0feb82f24d2f028d6a7f3c54381bb1766c6"));
var unlockLock = createServerFn({ method: "POST" }).validator((input) => ({
	token: requireToken(input.token),
	mode: input.mode
})).handler(createSsrRpc("1d6e829f751f9cef738608588620249a94fd1408da0cb42fc2e257b66aa163f9"));
var startHygiene = createServerFn({ method: "POST" }).validator((input) => ({
	token: requireToken(input.token),
	role: input.role
})).handler(createSsrRpc("d455b087b01b39567d2e9644d2cc15051f9f2a646fb8764a5ef90f7c26871fe6"));
var endHygiene = createServerFn({ method: "POST" }).validator((input) => ({
	token: requireToken(input.token),
	role: input.role
})).handler(createSsrRpc("ce61c7057be7e235a30ac96aecd309dfa93b7a7881633f0beba634411994b009"));
//#endregion
export { unlockLock as S, formatDurationZh as _, AlertDialogDescription as a, keyholderAddTime as b, AlertDialogTitle as c, VaultDial as d, cn as f, formatDateTimeZh as g, endHygiene as h, AlertDialogContent as i, Button as l, durationFromParts as m, AlertDialogAction as n, AlertDialogFooter as o, createLockSession as p, AlertDialogCancel as r, AlertDialogHeader as s, AlertDialog as t, Countdown as u, getLockByKeyholder as v, startHygiene as x, getLockByWearer as y };
