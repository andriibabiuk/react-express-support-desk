---
name: auth-architecture
description: Verified better-auth/Express/Prisma auth setup in this repo — what's confirmed safe and the trust boundaries in play
metadata:
  type: project
---

Verified as of 2026-07-02 (better-auth ^1.6.x, actual installed 1.6.23):

- `server/src/lib/auth.ts` config: `basePath: '/api/auth'`, `trustedOrigins: [process.env.CLIENT_URL!]`, `emailAndPassword.disableSignUp: true`, `user.additionalFields.role` with `input: false, required: true, defaultValue: 'agent'`.
- Confirmed via context7 (better-auth v1.6.11 docs, `concepts/typescript.mdx`): `input: false` on `additionalFields` is the documented, correct pattern to prevent a field from being client-settable "during registration and other operations" (i.e. also blocks it via `/update-user`). Combined with `disableSignUp: true` blocking `/sign-up/email` entirely, there is currently **no path for a client to set/escalate their own `role`**. This is sound — do not re-flag as a finding unless a new custom endpoint writes `role` directly via Prisma bypassing better-auth's user-update API.
- `server/index.ts` mounts `app.all('/api/auth/{*any}', toNodeHandler(auth))` **before** `express.json()`. Confirmed via context7 (better-auth Express integration docs) this is the *required* order — mounting `express.json()` first is documented to break better-auth (client gets stuck "pending"). Not a bug, don't re-flag.
- `requireAuth` (`server/src/middleware/require-auth.ts`) only checks session presence via `auth.api.getSession`, never role. No route currently in `index.ts` needs role-based authz (only `/api/me`, `/api/health`). See [[admin_route_forward_risk]] for the pattern to watch as admin APIs get built.
- Cookie defaults confirmed via context7 (better-auth `reference/security.mdx`): `sameSite=Lax`, `secure` on HTTPS, `httpOnly` by default; `trustedOrigins` is the CSRF/open-redirect control. Good defaults for current same-origin dev-proxy setup.
- Found and reported (2026-07-02): `/api/me` leaks the raw session token in its JSON body because it does `res.json({ user: req.user, session: req.session })` and `req.session` (from `auth.api.getSession`) includes a `token: string` field per better-auth's `Session` type (confirmed in `node_modules/.bun/better-auth@1.6.23.../dist/api/routes/session.d.mts`). This defeats httpOnly cookie protection if XSS is ever introduced elsewhere. Check whether this has been fixed (route should only return whitelisted session fields, never `token`) before re-auditing this route.
- `seed.ts` uses `ctx.password.hash` (better-auth's own hasher) and `ctx.internalAdapter` — correct pattern, not custom crypto. No hardcoded secrets; throws loudly if `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` unset.
- No env-var validation layer exists anywhere in `server/src` — `process.env.CLIENT_URL!` and `process.env.DATABASE_URL` are used with non-null assertions and no runtime check. Low-severity but recurring pattern; flag if it grows.
- No `cors` middleware is registered in Express (the `cors` npm package appears only as a transitive dep in `bun.lock`, unused). Fine today because Vite dev-proxies same-origin; will need explicit CORS (credentialed, restricted to `trustedOrigins`) plus `sameSite: 'none', secure: true` cookie attrs before client/server ever deploy to different origins (see CLAUDE.md "Not yet implemented" — Docker/deployment phase not started yet).
