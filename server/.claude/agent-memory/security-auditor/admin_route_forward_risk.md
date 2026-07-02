---
name: admin-route-forward-risk
description: AdminRoute client guard has no server-side backing today — watch for this gap once real admin APIs land
metadata:
  type: project
---

`client/src/components/AdminRoute.tsx` checks `session?.user.role !== 'admin'` and redirects — this is a **client-side-only** guard (trivially bypassed by calling the API directly or editing client state). As of 2026-07-02, `/users` (the only route behind `AdminRoute`) is a static page with no data fetching and no backing server route, so there is no active vulnerability yet.

**Why this matters going forward:** `requireAuth` (see [[auth_architecture]]) never checks role, only session presence. The project's `implementation-plan.md` / CLAUDE.md "Not yet implemented" list includes Ticket CRUD and other data models — when admin-only server routes get added (e.g. user management, role changes), each one MUST do its own server-side role check (e.g. `if (req.user.role !== 'admin') return res.status(403)...`), not rely on the client route guard for protection. This is an IDOR/broken-access-control pattern to check for specifically on every future PR that adds a route under an "admin" feature area.

**How to apply:** When re-auditing this repo, grep for new Express routes and confirm any that map to `AdminRoute`-gated client pages (or otherwise imply admin-only data) have an explicit server-side role check, not just `requireAuth`.
