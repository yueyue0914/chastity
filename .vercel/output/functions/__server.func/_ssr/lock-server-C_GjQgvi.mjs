import { r as clampDurationMs, t as DEFAULT_HYGIENE_MAX_MS } from "./lock-types-DsF-B3mr.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lock-server-C_GjQgvi.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var _0002_locks_default = "-- Shared lock sessions for wearer + keyholder remote control.\n-- Access is gated by unguessable tokens (not world-browsable listings).\n\ncreate table if not exists locks (\n  id text primary key,\n  wearer_token text not null unique,\n  keyholder_token text not null unique,\n  started_at timestamptz not null,\n  duration_ms bigint not null,\n  ends_at timestamptz not null,\n  allow_emergency boolean not null default true,\n  allow_hygiene boolean not null default false,\n  hygiene_max_ms bigint not null default 900000,\n  notify_expiry boolean not null default true,\n  hygiene_started_at timestamptz,\n  status text not null default 'active',\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now(),\n  constraint locks_status_check check (status in ('active', 'ended', 'emergency_ended'))\n);\n\ncreate index if not exists locks_wearer_token_idx on locks (wearer_token);\ncreate index if not exists locks_keyholder_token_idx on locks (keyholder_token);\ncreate index if not exists locks_status_idx on locks (status);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_locks.sql": _0002_locks_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
function toMs(value) {
	if (value == null) return null;
	const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
	return Number.isFinite(t) ? t : null;
}
function toNum(value) {
	return typeof value === "number" ? value : Number(value);
}
function rowToLock(row) {
	return {
		id: row.id,
		wearerToken: row.wearer_token,
		keyholderToken: row.keyholder_token,
		startedAt: toMs(row.started_at) ?? Date.now(),
		durationMs: toNum(row.duration_ms),
		endsAt: toMs(row.ends_at) ?? Date.now(),
		allowEmergency: row.allow_emergency,
		allowHygiene: row.allow_hygiene,
		hygieneMaxMs: toNum(row.hygiene_max_ms),
		notifyExpiry: row.notify_expiry,
		hygieneStartedAt: toMs(row.hygiene_started_at),
		status: row.status
	};
}
function randomToken() {
	const bytes = /* @__PURE__ */ new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function requireToken(token) {
	const t = token.trim();
	if (t.length < 8 || t.length > 64) throw new Error("无效令牌");
	return t;
}
var createLockSession_createServerFn_handler = createServerRpc({
	id: "6acf5e69baa4554d4739810037439276292b15a4f582f189b9ef038cd85917b9",
	name: "createLockSession",
	filename: "src/lib/lock-server.ts"
}, (opts) => createLockSession.__executeServer(opts));
var createLockSession = createServerFn({ method: "POST" }).validator((input) => input).handler(createLockSession_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const now = Date.now();
	const durationMs = clampDurationMs(data.durationMs);
	const hygieneMaxMs = data.allowHygiene ? Math.max(6e4, Math.min(data.hygieneMaxMs || 9e5, 72e5)) : DEFAULT_HYGIENE_MAX_MS;
	const id = crypto.randomUUID();
	const wearerToken = randomToken();
	const keyholderToken = randomToken();
	await sql`
      insert into locks (
        id, wearer_token, keyholder_token,
        started_at, duration_ms, ends_at,
        allow_emergency, allow_hygiene, hygiene_max_ms, notify_expiry,
        hygiene_started_at, status
      ) values (
        ${id}, ${wearerToken}, ${keyholderToken},
        ${new Date(now).toISOString()}, ${durationMs}, ${new Date(now + durationMs).toISOString()},
        ${data.allowEmergency}, ${data.allowHygiene}, ${hygieneMaxMs}, ${data.notifyExpiry},
        null, 'active'
      )
    `;
	return {
		id,
		wearerToken,
		keyholderToken,
		startedAt: now,
		durationMs,
		endsAt: now + durationMs,
		allowEmergency: data.allowEmergency,
		allowHygiene: data.allowHygiene,
		hygieneMaxMs,
		notifyExpiry: data.notifyExpiry,
		hygieneStartedAt: null,
		status: "active"
	};
});
async function fetchByWearer(token) {
	const rows = await (await getSql())`
    select * from locks where wearer_token = ${token} limit 1
  `;
	return rows[0] ? rowToLock(rows[0]) : null;
}
async function fetchByKeyholder(token) {
	const rows = await (await getSql())`
    select * from locks where keyholder_token = ${token} limit 1
  `;
	return rows[0] ? rowToLock(rows[0]) : null;
}
var getLockByWearer_createServerFn_handler = createServerRpc({
	id: "d83011a9539f70567155d14a76736e50e3056f2853f37cc156a9e9ce041f8ad7",
	name: "getLockByWearer",
	filename: "src/lib/lock-server.ts"
}, (opts) => getLockByWearer.__executeServer(opts));
var getLockByWearer = createServerFn({ method: "GET" }).validator((input) => ({ token: requireToken(input.token) })).handler(getLockByWearer_createServerFn_handler, async ({ data }) => {
	return fetchByWearer(data.token);
});
var getLockByKeyholder_createServerFn_handler = createServerRpc({
	id: "9355962f03a88467c0da0eeb61ba24a5575010aa0c6ac0a6db3733d8ce9661a7",
	name: "getLockByKeyholder",
	filename: "src/lib/lock-server.ts"
}, (opts) => getLockByKeyholder.__executeServer(opts));
var getLockByKeyholder = createServerFn({ method: "GET" }).validator((input) => ({ token: requireToken(input.token) })).handler(getLockByKeyholder_createServerFn_handler, async ({ data }) => {
	return fetchByKeyholder(data.token);
});
var keyholderAddTime_createServerFn_handler = createServerRpc({
	id: "ef38349cb74bafaa215ed9e73874a0feb82f24d2f028d6a7f3c54381bb1766c6",
	name: "keyholderAddTime",
	filename: "src/lib/lock-server.ts"
}, (opts) => keyholderAddTime.__executeServer(opts));
var keyholderAddTime = createServerFn({ method: "POST" }).validator((input) => {
	const addMs = Number(input.addMs);
	if (!Number.isFinite(addMs) || addMs <= 0 || addMs > 2592e6) throw new Error("加时无效");
	return {
		token: requireToken(input.token),
		addMs
	};
}).handler(keyholderAddTime_createServerFn_handler, async ({ data }) => {
	const lock = await fetchByKeyholder(data.token);
	if (!lock || lock.status !== "active") throw new Error("锁定不存在或已结束");
	const sql = await getSql();
	const nextEnds = lock.endsAt + data.addMs;
	const nextDuration = lock.durationMs + data.addMs;
	await sql`
      update locks
      set ends_at = ${new Date(nextEnds).toISOString()},
          duration_ms = ${nextDuration},
          updated_at = now()
      where keyholder_token = ${data.token} and status = 'active'
    `;
	return {
		...lock,
		endsAt: nextEnds,
		durationMs: nextDuration
	};
});
var unlockLock_createServerFn_handler = createServerRpc({
	id: "1d6e829f751f9cef738608588620249a94fd1408da0cb42fc2e257b66aa163f9",
	name: "unlockLock",
	filename: "src/lib/lock-server.ts"
}, (opts) => unlockLock.__executeServer(opts));
var unlockLock = createServerFn({ method: "POST" }).validator((input) => ({
	token: requireToken(input.token),
	mode: input.mode
})).handler(unlockLock_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const asKeyholder = data.mode === "keyholder";
	const lock = asKeyholder ? await fetchByKeyholder(data.token) : await fetchByWearer(data.token);
	if (!lock || lock.status !== "active") throw new Error("锁定不存在或已结束");
	const now = Date.now();
	if (data.mode === "expiry" && now < lock.endsAt) throw new Error("尚未到期");
	if (data.mode === "emergency" && !lock.allowEmergency) throw new Error("本次锁定未开启紧急解锁");
	const status = data.mode === "emergency" ? "emergency_ended" : "ended";
	if (asKeyholder) await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
      `;
	else await sql`
        update locks
        set status = ${status},
            hygiene_started_at = null,
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
	return {
		...lock,
		status,
		hygieneStartedAt: null
	};
});
var startHygiene_createServerFn_handler = createServerRpc({
	id: "d455b087b01b39567d2e9644d2cc15051f9f2a646fb8764a5ef90f7c26871fe6",
	name: "startHygiene",
	filename: "src/lib/lock-server.ts"
}, (opts) => startHygiene.__executeServer(opts));
var startHygiene = createServerFn({ method: "POST" }).validator((input) => ({
	token: requireToken(input.token),
	role: input.role
})).handler(startHygiene_createServerFn_handler, async ({ data }) => {
	const lock = data.role === "keyholder" ? await fetchByKeyholder(data.token) : await fetchByWearer(data.token);
	if (!lock || lock.status !== "active") throw new Error("锁定不存在或已结束");
	if (!lock.allowHygiene) throw new Error("本次锁定未允许卫生清洁");
	if (lock.hygieneStartedAt != null) return lock;
	const now = Date.now();
	const sql = await getSql();
	const iso = new Date(now).toISOString();
	if (data.role === "keyholder") await sql`
        update locks
        set hygiene_started_at = ${iso}, updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
          and hygiene_started_at is null
      `;
	else await sql`
        update locks
        set hygiene_started_at = ${iso}, updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
          and hygiene_started_at is null
      `;
	return {
		...lock,
		hygieneStartedAt: now
	};
});
var endHygiene_createServerFn_handler = createServerRpc({
	id: "ce61c7057be7e235a30ac96aecd309dfa93b7a7881633f0beba634411994b009",
	name: "endHygiene",
	filename: "src/lib/lock-server.ts"
}, (opts) => endHygiene.__executeServer(opts));
var endHygiene = createServerFn({ method: "POST" }).validator((input) => ({
	token: requireToken(input.token),
	role: input.role
})).handler(endHygiene_createServerFn_handler, async ({ data }) => {
	const lock = data.role === "keyholder" ? await fetchByKeyholder(data.token) : await fetchByWearer(data.token);
	if (!lock || lock.status !== "active") throw new Error("锁定不存在或已结束");
	if (lock.hygieneStartedAt == null) return lock;
	const overtime = Math.max(0, Date.now() - lock.hygieneStartedAt - lock.hygieneMaxMs);
	const nextEnds = lock.endsAt + overtime;
	const nextDuration = lock.durationMs + overtime;
	const sql = await getSql();
	if (data.role === "keyholder") await sql`
        update locks
        set hygiene_started_at = null,
            ends_at = ${new Date(nextEnds).toISOString()},
            duration_ms = ${nextDuration},
            updated_at = now()
        where keyholder_token = ${data.token} and status = 'active'
      `;
	else await sql`
        update locks
        set hygiene_started_at = null,
            ends_at = ${new Date(nextEnds).toISOString()},
            duration_ms = ${nextDuration},
            updated_at = now()
        where wearer_token = ${data.token} and status = 'active'
      `;
	return {
		...lock,
		hygieneStartedAt: null,
		endsAt: nextEnds,
		durationMs: nextDuration
	};
});
//#endregion
export { createLockSession_createServerFn_handler, endHygiene_createServerFn_handler, getLockByKeyholder_createServerFn_handler, getLockByWearer_createServerFn_handler, keyholderAddTime_createServerFn_handler, startHygiene_createServerFn_handler, unlockLock_createServerFn_handler };
