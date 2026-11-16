# migrations_archive — historik, ikke kørbar

Filerne her er **historik**. De matcher ikke produktion og må ikke køres eller
flyttes tilbage til `supabase/migrations/`.

- `migrations/` — de ti filer, der lå i `supabase/migrations/` frem til 16. november 2026.
- `migrations_old/` — otte filer fra Cursor-perioden, som aldrig var CLI-tracked.

## Hvorfor de er arkiveret

Produktionsskemaet kunne ikke genskabes ud fra filerne: grundtabellerne
(`tenders`, `bids`, `profiles`, `audit_logs`) blev kun oprettet i `migrations_old/`,
to af de ti filer var tomme sporingsfiler, og flere objekter i produktion
(triggere, funktioner, indekser, policies) stod ikke i nogen fil.

Sandhedskilden er nu `supabase/migrations/20261116120000_baseline_prod.sql`,
bygget af `scripts/build-baseline.mjs` ud fra et pg_dump af produktion taget
16. november 2026. Nye migrationer lægges oven på baseline.

## Hvad filerne stadig kan bruges til

Begrundelser og kommentarer: hvorfor en policy, trigger eller RPC ser ud, som
den gør (fx `20261018120000_pilot_security_hardening.sql` og
`20261112120000_bids_column_lock.sql`).
