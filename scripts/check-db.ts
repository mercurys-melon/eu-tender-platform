/**
 * Supabase connectivity-check (Next.js-kompatibel).
 *
 * Anvendes i:
 *   - Sessionsstart-checklist pkt. 2 (jf. CLAUDE.md)
 *   - CI som smoketest inden deployment
 *
 * Kør lokalt:
 *   npm run check-db
 *   (eller: npx tsx scripts/check-db.ts)
 *
 * Exit codes:
 *   0 = forbindelse OK
 *   1 = fejl (auth, netværk, schema eller konfiguration)
 *
 * Bemærk: Næsten alt sker via dynamiske imports, fordi @next/env skal
 * populere process.env inden src/config/env.ts parses.
 */

async function main(): Promise<void> {
  // 1. Indlæs Next.js env-filer (.env, .env.local, .env.development m.fl.)
  const { loadEnvConfig } = await import('@next/env')
  loadEnvConfig(process.cwd())

  // 2. Importér env-config EFTER env-filerne er loadet
  const { env } = await import('../src/config/env')
  const { createClient } = await import('@supabase/supabase-js')

  const startedAt = Date.now()

  // --- Guard: service role key ---
  if (!env.supabase.serviceKey) {
    console.error(
      '❌ SUPABASE_SERVICE_ROLE_KEY er ikke sat - kan ikke køre connectivity-check.',
    )
    console.error('   Udfyld værdien i .env.local og prøv igen.')
    process.exit(1)
  }

  // --- Guard: EU region ---
  if (!env.supabase.region) {
    console.warn(
      '⚠️  SUPABASE_REGION er ikke sat. EU residency bør valideres manuelt.',
    )
  } else if (!env.supabase.region.startsWith('eu-')) {
    console.error(
      `❌ SUPABASE_REGION "${env.supabase.region}" er ikke en EU-region.`,
    )
    console.error(
      '   EU residency er påkrævet (GDPR + offentligt indkøb). Projektet bør migreres.',
    )
    process.exit(1)
  }

  const regionNote = env.supabase.region
    ? ` (region: ${env.supabase.region})`
    : ''
  console.log(
    `🔌 Tjekker forbindelse til Supabase: ${env.supabase.url}${regionNote}`,
  )

  const supabase = createClient(env.supabase.url, env.supabase.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    // Let forespørgsel mod 'organisations' - forventet at eksistere efter migrations
    const { error } = await supabase
      .from('organisations')
      .select('id')
      .limit(1)

    if (error) {
      // 42P01 = tabellen findes ikke (PostgreSQL-niveau)
      // PGRST205 = tabellen ikke i PostgREST schema cache (funktionelt samme — migrations ikke kørt)
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.log(
          `⚠️  Forbindelse OK, men tabellen 'organisations' findes ikke i schema cache endnu.\n` +
            `   Kør Supabase-migrations: 'npx supabase db push'`,
        )
      } else if (
        error.code === 'PGRST301' ||
        String(error.message).toLowerCase().includes('jwt') ||
        String(error.message).toLowerCase().includes('invalid api key')
      ) {
        console.error(`❌ Auth-fejl: ${error.message}`)
        console.error(
          '   Verificér SUPABASE_SERVICE_ROLE_KEY og NEXT_PUBLIC_SUPABASE_URL i .env.local',
        )
        process.exit(1)
      } else {
        console.error(
          `❌ Supabase-fejl: ${error.message} (code: ${error.code ?? 'ukendt'})`,
        )
        process.exit(1)
      }
    } else {
      console.log(`✅ Forbindelse OK - 'organisations'-tabellen er tilgængelig.`)
    }

    const elapsed = Date.now() - startedAt
    console.log(`⏱️  Check fuldført på ${elapsed} ms.`)
    process.exit(0)
  } catch (err) {
    console.error('❌ Netværksfejl eller uventet fejl:', err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Uventet fejl i check-db:', err)
  process.exit(1)
})
