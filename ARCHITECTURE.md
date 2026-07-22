# HomeBakery — architecture notes for AI assistants

Read this before touching anything in `src/services/`, `src/lib/supabase.ts`,
or the Supabase schema/RLS policies. If you're an AI coding assistant working
on this repo, this file tells you what stage the app is at and what NOT to
"helpfully" change.

## Current stage: single-tenant, no auth (intentional, temporary)

There is no login system yet. There is no `owner_id` (or any per-user column)
on any table. RLS policies are currently wide open
(`using (true) with check (true)` for `anon` and `authenticated`).

This is deliberate for now — the app is still being built out feature-by-feature
by a solo developer as the only user. **Do not add authentication, RLS
tightening, or per-user filtering right now unless explicitly asked.** Doing
so without being asked would break the current workflow and is out of scope
until the feature/bug-fixing phase is done.

## Where this is headed: multi-tenant SaaS

The end goal is multiple bakeries using this app, each seeing only their own
data. That will require, in one dedicated pass (not yet started):

1. Supabase Auth (email/password) turned on.
2. An `owner_id uuid references auth.users(id)` column added to every
   business table: `ingredients`, `products`, `product_variants`,
   `recipe_ingredients`, `orders`, `order_items`, `expenses`,
   `inventory_movements`, `settings`.
3. RLS policies rewritten per table from `using (true)` to
   `using (auth.uid() = owner_id)` (and matching `with check`).
4. Every function in `src/services/*.ts` updated to scope its query to the
   current user, e.g. `.eq('owner_id', user.id)` — right now these functions
   query without any owner filter, which is correct for the current
   single-tenant stage but will need to change.
5. New `src/app/(auth)/` route group (`sign-in.tsx`, `sign-up.tsx`), a new
   `src/contexts/AuthContext.tsx`, and a routing guard added to
   `src/app/_layout.tsx` that shows `(auth)` or `(tabs)` depending on session
   state. Session persistence via `AsyncStorage` is already configured in
   `src/lib/supabase.ts` and shouldn't need changes for this.

## One more schema fact worth knowing

The database has no foreign key constraints — `order_items.order_id`,
`recipe_ingredients.ingredient_id`, `inventory_movements.ingredient_id`, etc.
are all `uuid, NOT NULL` with nothing enforcing the relationship at the
database level. Referential integrity is currently kept only by app code
convention. Don't assume the database will reject an orphaned reference.

## What this means for changes you make right now

- **Do** write new service functions and features assuming the current
  single-tenant model — don't invent partial/half-done multi-tenant logic,
  it'll conflict with the real migration later.
- **Don't** add an `owner_id` column, touch RLS policies, or add auth screens
  unless the person explicitly asks for that pass to begin.
- **Do** flag it in your response if a change you're making would be
  significantly harder to retrofit for multi-tenancy later (e.g. a query
  pattern that assumes exactly one row exists globally, like the current
  `settings` table's `.single()` calls) — a one-line heads-up is enough,
  don't block the current task over it.
- **Don't** silently start the multi-tenant migration as a "bonus" while
  doing unrelated feature work — it touches every service file and needs to
  happen as its own reviewed pass, not bundled into a bug fix.

## Quick reference: files that will need the owner_id pass later

`src/services/ingredients.ts`, `products.ts`, `orders.ts`, `expenses.ts`,
`production.ts`, `settings.ts`, `dashboard.ts`, `reports.ts` — all query
Supabase with no owner scoping today. That's expected for now.