---
name: e2e-shared-dialog-component-objects
description: How to model a single React dialog component that drives two modes (e.g. create/edit) or is instantiated once per table row, as Playwright page objects
metadata:
  type: reference
---

Extended the pattern from [[e2e_pom_structure]] for `client/src/pages/UsersPage.tsx`'s CRUD UI (`e2e/users.spec.ts`, added 2026-07-06):

- `client/src/components/UserDialog.tsx` is one Radix `Dialog` component with `mode: 'create' | 'edit'` — same three fields (Name/Email/Password) either way, just a different trigger location (a "New user" button owned by the page vs. a per-row "Edit {name}" icon button owned by the table). Modeled as `e2e/pages/UserDialog.ts`, a component object holding only the dialog's own content locators (`dialog`, `nameInput`, `emailInput`, `passwordInput`, `submitButton`) — it does NOT own the trigger, since the two triggers live in different places. `UsersPage` composes it (`usersPage.userDialog`) and owns `openCreateDialog()` / `openEditDialog(name)` to click whichever trigger applies.
- `client/src/components/DeleteUserDialog.tsx` is a shadcn `AlertDialog` (`role="alertdialog"`, not `"dialog"` — needs `page.getByRole('alertdialog')`, a plain `getByRole('dialog')` won't match it) instantiated once per non-admin row (component returns `null` for `role: admin` rows — no trigger renders at all, not just disabled). Modeled the same way as `e2e/pages/DeleteUserDialog.ts`, composed as `usersPage.deleteUserDialog`.
- Row-level locators (`row(name)`, `editButton(name)`, `deleteButton(name)`) live directly on `UsersPage` rather than a separate `UsersTable` object, since the table isn't reused elsewhere — only extract a component object when the component actually appears in more than one context (like `NavBar`) or is a distinct enough unit that the source file split already implies a natural test boundary (like the two dialogs here).

**Asserting a Radix dialog/alertdialog's title reliably**: don't dig for the title text via `getByRole('heading')` — shadcn Nova's `DialogTitle`/`AlertDialogTitle` use `asChild` to render a plain `<div>` for styling, which is not implicitly a heading role. Instead use Playwright's `toHaveAccessibleName` assertion on the dialog/alertdialog locator itself: `await expect(usersPage.userDialog.dialog).toHaveAccessibleName('Create user')` — Radix wires `aria-labelledby` from the dialog root to the Title's id regardless of what tag the title renders as, so this is robust to the `asChild` swap.

**Row absence after mutation**: use `toHaveCount(0)`, not `toBeHidden()`, when the row is expected to be fully removed from the DOM (soft-deleted, or renamed so the old name no longer matches) — `toBeHidden()` also passes for "not in DOM" so either works, but `toHaveCount(0)` reads more intentionally for "this shouldn't exist anymore" vs. "this exists but is hidden."

**Test data collision gotcha**: when a CRUD flow renames a row (create with name A, then edit to name B) and asserts on `getByRole('row', { name })` (substring match), make sure B is not a superset string of A (e.g. don't do `A` → `${A} Updated`) — otherwise asserting the old name's row is gone via `row(A)` will still match the renamed row since A is a substring of B. Used distinct prefixes (`E2E User ${ts}` → `Updated User ${ts}`) instead.

**Seeded admin's `name` field is fixed, not env-configurable**: `server/prisma/seed.ts` hardcodes `name: 'Admin'` (only email/password come from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`). Useful as a known-good row to assert against without creating fixture data first (e.g. confirming the Delete action is entirely absent for an admin row) — reference it as a local `SEEDED_ADMIN_NAME = 'Admin'` constant with a comment pointing at seed.ts, not as an env-derived constant like `ADMIN_CREDENTIALS`.

See also [[e2e_pom_structure]], [[e2e_shadcn_field_error_locators]].
