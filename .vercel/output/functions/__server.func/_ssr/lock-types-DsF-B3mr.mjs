//#region node_modules/.nitro/vite/services/ssr/assets/lock-types-DsF-B3mr.js
var DEFAULT_HYGIENE_MAX_MS = 9e5;
var MIN_DURATION_MS = 6e4;
var MAX_DURATION_MS = 31536e6;
var LOCK_STORAGE_KEY = "yue-lock:v2";
function isLockRecord(value) {
	if (!value || typeof value !== "object") return false;
	const r = value;
	return typeof r.id === "string" && typeof r.wearerToken === "string" && typeof r.keyholderToken === "string" && typeof r.startedAt === "number" && typeof r.durationMs === "number" && typeof r.endsAt === "number" && typeof r.allowEmergency === "boolean" && typeof r.allowHygiene === "boolean" && typeof r.hygieneMaxMs === "number" && typeof r.notifyExpiry === "boolean" && (r.hygieneStartedAt === null || typeof r.hygieneStartedAt === "number") && (r.status === "active" || r.status === "ended" || r.status === "emergency_ended");
}
function isLockReady(lock, now) {
	return lock.status === "active" && now >= lock.endsAt;
}
function remainingMs(lock, now) {
	if (lock.status !== "active") return 0;
	return Math.max(0, lock.endsAt - now);
}
function isHygieneActive(lock) {
	return lock.status === "active" && lock.hygieneStartedAt != null;
}
function hygieneElapsedMs(lock, now) {
	if (lock.hygieneStartedAt == null) return 0;
	return Math.max(0, now - lock.hygieneStartedAt);
}
function hygieneRemainingMs(lock, now) {
	if (lock.hygieneStartedAt == null) return 0;
	return Math.max(0, lock.hygieneMaxMs - hygieneElapsedMs(lock, now));
}
/** Overtime beyond the allowed hygiene window — applied 1:1 as penalty. */
function hygieneOvertimeMs(lock, now) {
	if (lock.hygieneStartedAt == null) return 0;
	return Math.max(0, hygieneElapsedMs(lock, now) - lock.hygieneMaxMs);
}
function clampDurationMs(durationMs) {
	return Math.max(MIN_DURATION_MS, Math.min(durationMs, MAX_DURATION_MS));
}
//#endregion
export { hygieneRemainingMs as a, isLockRecord as c, hygieneOvertimeMs as i, remainingMs as l, LOCK_STORAGE_KEY as n, isHygieneActive as o, clampDurationMs as r, isLockReady as s, DEFAULT_HYGIENE_MAX_MS as t };
