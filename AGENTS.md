# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Read ARCHITECTURE.md before touching src/services/ or Supabase

This app is single-tenant with no auth right now — on purpose, temporarily.
It's headed toward multi-tenant (multiple bakeries, RLS scoped by
`owner_id`), but that migration hasn't started. Do not add auth, `owner_id`
columns, or per-user RLS filtering unless explicitly asked to start that
pass. See ARCHITECTURE.md for the full plan and what to keep in mind while
writing service functions in the meantime.
