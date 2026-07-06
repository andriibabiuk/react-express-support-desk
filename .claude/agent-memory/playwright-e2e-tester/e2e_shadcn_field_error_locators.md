---
name: e2e-shadcn-field-error-locators
description: How to locate per-field vs form-level validation errors in this repo's shadcn Nova Field/FieldError forms
metadata:
  type: reference
---

shadcn Nova's `FieldError` (`client/src/components/ui/field.tsx`) always renders `role="alert"`, but a form can have several alerts at once (one per invalid field, plus an optional root/server error), so `page.getByRole('alert')` alone is ambiguous. Pattern used in `e2e/pages/LoginPage.ts`, worth reusing for any future form (ticket forms, etc.) built with the same Field/Controller pattern:

- Per-field error: the `FieldError` sits inside that field's own `<Field data-slot="field">` wrapper alongside the label/input. Scope with `page.locator('[data-slot="field"]').filter({ has: fieldInputLocator }).getByRole('alert')`.
- Root/form-level error (react-hook-form's `errors.root`, e.g. an auth failure): rendered as a bare `<FieldError>` directly inside `<FieldGroup data-slot="field-group">`, *not* wrapped in a per-field `[data-slot="field"]` div — so it's the only `role="alert"` that's a direct child: `page.locator('[data-slot="field-group"] > [role="alert"]')`.

Also: `Input` (`ui/input.tsx`) renders a plain native `<input>` with the `FieldLabel`'s `htmlFor` correctly wired to the input `id` (both set to `field.name` from react-hook-form's Controller), so `page.getByLabel('Email')` / `getByLabel('Password')` work reliably without needing `data-testid`.

See also [[e2e_pom_structure]].
