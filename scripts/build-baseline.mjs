#!/usr/bin/env node
// ============================================================================
// build-baseline.mjs — bygger supabase/migrations/20261116120000_baseline_prod.sql
//
// Deterministisk: læser dumpene i scripts/sql/output/baseline/ som bytes,
// filtrerer hele pg_dump-entries fra og skriver resultatet som UTF-8 uden BOM.
// Linjer fra prod-public.sql kopieres byte for byte (blandet CRLF/LF i
// funktionskroppe bevares). Scriptet rører ingen database og intet netværk.
//
// Kør:  node scripts/build-baseline.mjs
// Fejler (exit 1) hvis dumpet ikke har den forventede form — ret da
// forventningerne bevidst, ikke filteret blindt.
// ============================================================================

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'scripts', 'sql', 'output', 'baseline');
const OUT_FILE = join(ROOT, 'supabase', 'migrations', '20261116120000_baseline_prod.sql');

const fejl = (msg) => {
  console.error(`\nFEJL: ${msg}`);
  process.exit(1);
};
const krav = (betingelse, msg) => {
  if (!betingelse) fejl(msg);
};

// ---------------------------------------------------------------------------
// Hjælpere (bytes)
// ---------------------------------------------------------------------------

/** Deler en buffer i linjer INKL. linjeskift (LF eller CRLF bevares i linjen). */
function splitLinjer(buf) {
  const linjer = [];
  let start = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0a) {
      linjer.push(buf.subarray(start, i + 1));
      start = i + 1;
    }
  }
  if (start < buf.length) linjer.push(buf.subarray(start));
  return linjer;
}

const tekst = (linje) => linje.toString('utf8');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const harBom = (buf) => buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
const erCrlf = (linje) => linje.length >= 2 && linje[linje.length - 2] === 0x0d && linje[linje.length - 1] === 0x0a;

function laes(navn) {
  const buf = readFileSync(join(SRC_DIR, navn));
  krav(!harBom(buf), `${navn} har BOM`);
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    fejl(`${navn} er ikke gyldig UTF-8`);
  }
  return buf;
}

// ---------------------------------------------------------------------------
// 1. prod-public.sql → entries
// ---------------------------------------------------------------------------

const publicBuf = laes('prod-public.sql');
const ind = splitLinjer(publicBuf);

const HEADER_RE = /^-- Name: (.*); Type: ([A-Z ]+); Schema: ([^;]+); Owner: (.*)\n$/;
const erStreg = (linje) => linje !== undefined && linje.length === 3 && tekst(linje) === '--\n';

// En entry starter med de tre linjer "--", "-- Name: …", "--" (alle LF).
const starter = [];
for (let i = 0; i + 2 < ind.length; i++) {
  if (!erStreg(ind[i]) || !erStreg(ind[i + 2])) continue;
  const m = HEADER_RE.exec(tekst(ind[i + 1]));
  if (m) starter.push({ linje: i, navn: m[1], type: m[2], skema: m[3], ejer: m[4] });
}

// Foden: "--", "-- PostgreSQL database dump complete", "--" …
let fodStart = -1;
for (let i = ind.length - 1; i >= 1; i--) {
  if (tekst(ind[i]) === '-- PostgreSQL database dump complete\n' && erStreg(ind[i - 1])) {
    fodStart = i - 1;
    break;
  }
}
krav(fodStart > 0, 'fandt ikke "PostgreSQL database dump complete" i prod-public.sql');
krav(starter.length > 0 && starter[starter.length - 1].linje < fodStart, 'entry-header efter dump-foden');

// Segmenter: præambel, entries, fod — dækker tilsammen alle linjer præcis én gang.
const segmenter = [{ slags: 'praeambel', fra: 0, til: starter[0].linje }];
starter.forEach((s, n) => {
  const til = n + 1 < starter.length ? starter[n + 1].linje : fodStart;
  segmenter.push({ slags: 'entry', fra: s.linje, til, ...s });
});
segmenter.push({ slags: 'fod', fra: fodStart, til: ind.length });

// ---------------------------------------------------------------------------
// 2. Filterregler
// ---------------------------------------------------------------------------

const REGLER = [
  {
    id: 'R2',
    tekst: 'CREATE EXTENSION + COMMENT ON EXTENSION',
    forventet: 8,
    match: (e) => e.type === 'EXTENSION' || (e.type === 'COMMENT' && e.navn.startsWith('EXTENSION ')),
  },
  { id: 'R3', tekst: 'CREATE/ALTER PUBLICATION supabase_realtime', forventet: 1, match: (e) => e.type === 'PUBLICATION' },
  { id: 'R4', tekst: 'CREATE/ALTER EVENT TRIGGER', forventet: 6, match: (e) => e.type === 'EVENT TRIGGER' },
  { id: 'R5', tekst: 'ACL i skema extensions', forventet: 51, match: (e) => e.type === 'ACL' && e.skema === 'extensions' },
  { id: 'R6', tekst: 'ACL i skema vault', forventet: 5, match: (e) => e.type === 'ACL' && e.skema === 'vault' },
  {
    id: 'R7',
    tekst: 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin',
    forventet: 3,
    match: (e) => e.type === 'DEFAULT ACL' && e.ejer === 'supabase_admin',
  },
];
const R1 = { id: 'R1', tekst: '\\restrict / \\unrestrict', forventet: 2 };

const stat = new Map([R1, ...REGLER].map((r) => [r.id, { ...r, enheder: 0, linjer: 0 }]));

// behold[i] = true hvis inputlinje i skal med i output
const behold = new Array(ind.length).fill(true);

for (const seg of segmenter) {
  if (seg.slags === 'entry') {
    const regel = REGLER.find((r) => r.match(seg));
    if (regel) {
      const s = stat.get(regel.id);
      s.enheder += 1;
      s.linjer += seg.til - seg.fra;
      for (let i = seg.fra; i < seg.til; i++) behold[i] = false;
    }
  } else {
    // præambel og fod: kun psql-metakommandoerne \restrict / \unrestrict fjernes
    for (let i = seg.fra; i < seg.til; i++) {
      const t = tekst(ind[i]);
      if (t.startsWith('\\restrict ') || t.startsWith('\\unrestrict ')) {
        const s = stat.get('R1');
        s.enheder += 1;
        s.linjer += 1;
        behold[i] = false;
      }
    }
  }
}

for (const s of stat.values()) {
  krav(s.enheder === s.forventet, `${s.id} (${s.tekst}): forventede ${s.forventet}, fandt ${s.enheder}`);
}

const publicUd = ind.filter((_, i) => behold[i]);

// ---------------------------------------------------------------------------
// 3. Kontrol af det, der er tilbage fra prod-public.sql
// ---------------------------------------------------------------------------

// 3a. Tilbageværende entries: kun public — plus de to SCHEMA "public"-entries.
const tilbage = segmenter.filter((s) => s.slags === 'entry' && behold[s.fra]);
for (const e of tilbage) {
  const ok =
    (e.skema === 'public' && e.ejer === 'postgres') ||
    (e.skema === '-' && e.navn === 'SCHEMA "public"' && (e.type === 'COMMENT' || e.type === 'ACL'));
  krav(ok, `uventet entry tilbage (linje ${e.fra + 2}): ${e.navn}; ${e.type}; ${e.skema}; ${e.ejer}`);
}

// 3b. Linje-kontroller på tilbageværende indhold.
const ANDET_SKEMA_MAAL = [
  /^(GRANT|REVOKE) /,
  /^ALTER DEFAULT PRIVILEGES /,
  /^CREATE (EXTENSION|PUBLICATION|EVENT TRIGGER|SCHEMA)\b/,
  /^(ALTER|COMMENT ON) (EXTENSION|PUBLICATION|EVENT TRIGGER)\b/,
];
let adpPostgres = 0;
let crlfUd = 0;
publicUd.forEach((linje) => {
  const t = tekst(linje);
  if (erCrlf(linje)) crlfUd += 1;
  krav(!t.startsWith('\\'), `psql-metakommando tilbage: ${t.trim()}`);
  krav(!t.includes('supabase_admin'), `"supabase_admin" tilbage: ${t.trim().slice(0, 120)}`);
  krav(!/\bCONCURRENTLY\b|\bADD VALUE\b|^VACUUM\b|^CREATE DATABASE\b/.test(t), `statement der ikke kan køre i en transaktion: ${t.trim().slice(0, 120)}`);
  if (ANDET_SKEMA_MAAL[0].test(t)) {
    krav(
      / ON (FUNCTION|TABLE|SEQUENCE|TYPE) "public"\."/.test(t) || / ON SCHEMA "public" /.test(t),
      `GRANT/REVOKE uden for public: ${t.trim().slice(0, 120)}`,
    );
  }
  if (ANDET_SKEMA_MAAL[1].test(t)) {
    krav(t.startsWith('ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT '), `uventet default privilege: ${t.trim()}`);
    adpPostgres += 1;
  }
  krav(!ANDET_SKEMA_MAAL[2].test(t) && !ANDET_SKEMA_MAAL[3].test(t), `statement uden for public tilbage: ${t.trim().slice(0, 120)}`);
  if (/^(CREATE|ALTER) (TABLE|FUNCTION|TYPE)\b/.test(t)) {
    krav(/^(CREATE|ALTER) (TABLE|FUNCTION|TYPE) (ONLY )?"public"\."/.test(t), `DDL uden for public: ${t.trim().slice(0, 120)}`);
  }
  if (/^CREATE (UNIQUE INDEX|INDEX|TRIGGER|POLICY)\b/.test(t)) {
    krav(/ ON "public"\."/.test(t), `indeks/trigger/policy uden for public: ${t.trim().slice(0, 120)}`);
  }
});
krav(adpPostgres === 12, `forventede 12 ALTER DEFAULT PRIVILEGES FOR ROLE postgres, fandt ${adpPostgres}`);
const crlfInd = ind.filter(erCrlf).length;
krav(crlfUd === crlfInd, `CRLF-linjer ændret: ${crlfInd} i input, ${crlfUd} i output`);

// ---------------------------------------------------------------------------
// 4. Tilføjelser efter public-delen
// ---------------------------------------------------------------------------

// 4a. Trigger på auth.users (definition fra prod-udenfor-dump.txt)
const udenfor = laes('prod-udenfor-dump.txt').toString('utf8').split(/\r?\n/);
const authTriggere = udenfor.filter((l) => l.startsWith('auth|'));
krav(authTriggere.length === 1, `forventede 1 trigger i auth, fandt ${authTriggere.length}`);
const TRIGGER_FORVENTET =
  'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()';
const [tSkema, tTabel, tNavn, tDef] = authTriggere[0].split('|');
krav(tSkema === 'auth' && tTabel === 'users' && tNavn === 'on_auth_user_created', `uventet auth-trigger: ${authTriggere[0]}`);
krav(tDef === TRIGGER_FORVENTET, `trigger-definitionen er ændret:\n  ${tDef}`);
// Skemakvalificeres, fordi dumpet sætter search_path = ''.
const triggerSql = tDef.replace('EXECUTE FUNCTION handle_new_user()', 'EXECUTE FUNCTION public.handle_new_user()') + ';';
krav(triggerSql.includes('public.handle_new_user()'), 'kunne ikke skemakvalificere handle_new_user()');
krav(
  publicUd.some((l) => tekst(l).startsWith('CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"')),
  'public.handle_new_user() findes ikke i public-delen',
);

// 4b. Buckets (kun de kolonner, vi ejer)
/** Parser "(a, b, …)"-lister med SQL-literaler ('…' med '' som escape, NULL, true/false, tal). */
function parseListe(s) {
  const dele = [];
  let i = 0;
  while (i < s.length) {
    while (s[i] === ' ') i++;
    let start = i;
    if (s[i] === "'") {
      i++;
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") i += 2;
        else if (s[i] === "'") break;
        else i++;
      }
      krav(s[i] === "'", `uafsluttet streng i: ${s}`);
      i++;
    } else {
      while (i < s.length && s[i] !== ',') i++;
    }
    dele.push(s.slice(start, i).trim());
    while (s[i] === ' ') i++;
    if (i < s.length) {
      krav(s[i] === ',', `uventet tegn "${s[i]}" i: ${s}`);
      i++;
    }
  }
  return dele;
}

const BUCKET_KOLONNER = ['id', 'name', 'public', 'file_size_limit', 'allowed_mime_types'];
const BUCKET_RE = /^INSERT INTO storage\.buckets \((.+?)\) VALUES \((.+)\);$/;
const bucketLinjer = laes('prod-buckets.sql').toString('utf8').split('\n').filter((l) => l.startsWith('INSERT INTO '));
const bucketSql = bucketLinjer.map((l) => {
  const m = BUCKET_RE.exec(l);
  krav(m, `kan ikke læse bucket-linje: ${l.slice(0, 80)}`);
  const kolonner = m[1].split(', ');
  const vaerdier = parseListe(m[2]);
  krav(kolonner.length === vaerdier.length, `bucket: ${kolonner.length} kolonner, ${vaerdier.length} værdier`);
  const valgt = BUCKET_KOLONNER.map((k) => {
    const idx = kolonner.indexOf(k);
    krav(idx >= 0, `bucket-kolonnen ${k} mangler i dumpet`);
    return vaerdier[idx];
  });
  return `INSERT INTO storage.buckets (${BUCKET_KOLONNER.join(', ')}) VALUES (${valgt.join(', ')}) ON CONFLICT (id) DO NOTHING;`;
});
krav(bucketSql.length === 2, `forventede 2 buckets, fandt ${bucketSql.length}`);
for (const id of ['tender-docs', 'bid-documents']) {
  const linje = bucketSql.find((l) => l.includes(`VALUES ('${id}', '${id}', false, `));
  krav(linje, `bucket ${id} mangler eller er ikke privat`);
}

// 4c. organisation_types (bytes bevares; kun ");" → ") ON CONFLICT DO NOTHING;")
const orgLinjer = splitLinjer(laes('prod-organisation-types.sql')).filter((l) =>
  tekst(l).startsWith('INSERT INTO public.organisation_types ('),
);
krav(orgLinjer.length === 3, `forventede 3 organisation_types, fandt ${orgLinjer.length}`);
const ORG_HALE = Buffer.from(');\n');
const orgSql = orgLinjer.map((l) => {
  krav(l.subarray(l.length - ORG_HALE.length).equals(ORG_HALE), 'organisation_types-linje slutter ikke med ");"');
  return Buffer.concat([l.subarray(0, l.length - ORG_HALE.length), Buffer.from(') ON CONFLICT DO NOTHING;\n')]);
});

// ---------------------------------------------------------------------------
// 5. Sammensætning
// ---------------------------------------------------------------------------

const HOVED = [
  '-- ============================================================================',
  '-- 20261116120000_baseline_prod.sql — BASELINE af produktionsskemaet',
  '--',
  '-- GENERERET af scripts/build-baseline.mjs. Redigér ikke i hånden — ret scriptet',
  '-- og kør det igen. Kilde: pg_dump 18.7 af produktion (Postgres 17.4) taget',
  '-- 16. november 2026, filerne i scripts/sql/output/baseline/.',
  '--',
  '-- MÅ ALDRIG EKSEKVERES I PRODUKTION. Produktion har allerede dette skema;',
  '-- dér markeres filen kun som kørt:',
  '--     supabase migration repair --status applied 20261116120000',
  '-- Filen køres kun mod tomme databaser (lokal, preview, ny instans).',
  '-- Vagten nedenfor afbryder, hvis public.tenders allerede findes.',
  '--',
  '-- ÉN TRANSAKTION (BEGIN … COMMIT): filen starter med at fjerne postgres\'',
  '-- default privileges i public og genopretter dem først til sidst. Fejler',
  '-- kørslen undervejs, må den tilstand ikke blive stående. Det er ikke',
  '-- dokumenteret, at "supabase db push" selv kører en migrationsfil atomisk,',
  '-- så transaktionen er eksplicit. Intet i dumpet er uforeneligt med en',
  '-- transaktion (ingen CREATE INDEX CONCURRENTLY, ALTER TYPE … ADD VALUE,',
  '-- VACUUM eller lignende — build-scriptet kontrollerer det). Vagten ligger',
  '-- inde i transaktionen, så en klient, der fortsætter efter fejl, ikke kan',
  '-- udføre resten.',
  '--',
  '-- HVORFOR DEFAULT PRIVILEGES FJERNES FØRST: pg_dump udskriver kun de GRANTs,',
  '-- der findes, og antager at nye objekter starter uden rettigheder. På Supabase',
  '-- giver default privileges ALL til anon/authenticated/service_role på alt nyt',
  '-- i public. Uden REVOKE ville skrivelåsen på bids, kolonnelåsen på',
  '-- tender_questions og EXECUTE-låsene på get_bid_count_for_tender() og',
  '-- get_bid_metadata_for_tender() ikke blive genskabt. Forudsætter kørsel som',
  '-- rollen postgres.',
  '--',
  '-- FJERNET fra dumpet (platformen ejer dem): \\restrict/\\unrestrict, extensions,',
  '-- publikationen supabase_realtime, event triggers, ACL i extensions og vault,',
  '-- default privileges for supabase_admin. Alt andet er kopieret byte for byte,',
  '-- inkl. blandede linjeskift (CRLF/LF) i funktionskroppe.',
  '-- TILFØJET efter public-delen: trigger on_auth_user_created på auth.users,',
  '-- buckets tender-docs og bid-documents, de tre rækker i organisation_types.',
  '--',
  '-- Kræver Postgres 17 (transaction_timeout, MAINTAIN-privilegiet).',
  '-- Skemaet gengives som det ER, også kendte fejl (se SESSION_NOTES.md 16. nov.).',
  '-- ============================================================================',
  '',
  'BEGIN;',
  '',
  '-- Vagt mod fejlkørsel: må kun køres mod en database uden public.tenders.',
  'DO $baseline_vagt$',
  'BEGIN',
  "  IF to_regclass('public.tenders') IS NOT NULL THEN",
  '    RAISE EXCEPTION',
  "      'AFBRUDT: public.tenders findes allerede. Baseline må ikke køres mod en eksisterende database (heller ikke produktion) - markér den som kørt med: supabase migration repair --status applied 20261116120000'",
  "      USING ERRCODE = 'object_not_in_prerequisite_state';",
  '  END IF;',
  'END',
  '$baseline_vagt$;',
  '',
  '-- Midlertidigt: nye objekter i public får ingen klient-rettigheder automatisk.',
  '-- Genoprettes af dumpets egne ALTER DEFAULT PRIVILEGES … GRANT sidst i public-delen.',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;',
  '',
  '-- ===== START: prod-public.sql (filtreret, ellers uændret) =====',
  '',
].join('\n');

const EFTER_PUBLIC = [
  '',
  '-- ===== SLUT: prod-public.sql =====',
  '',
  '-- Trigger på auth.users (ligger uden for public-dumpet). Opretter profil ved signup.',
  'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;',
  triggerSql,
  '',
  '-- Storage-buckets. Kun de kolonner, platformen lader os eje; tidsstempler og',
  '-- lifecycle/versioning styres af Storage-tjenesten.',
  ...bucketSql,
  '',
  '-- Stamdata: organisationstyper.',
  '',
].join('\n');

const HALE = ['', '-- Dumpet sætter search_path tomt på sessionsniveau; nulstil før næste migration.', 'RESET ALL;', '', 'COMMIT;', ''].join('\n');

// Dele med oprindelse, så slutkontrollen kan skelne.
const dele = [
  { kilde: 'gen', buf: Buffer.from(HOVED, 'utf8') },
  ...publicUd.map((buf) => ({ kilde: 'public', buf })),
  { kilde: 'gen', buf: Buffer.from(EFTER_PUBLIC, 'utf8') },
  ...orgSql.map((buf) => ({ kilde: 'gen', buf })),
  { kilde: 'gen', buf: Buffer.from(HALE, 'utf8') },
];
const ud = Buffer.concat(dele.map((d) => d.buf));

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, ud);

// ---------------------------------------------------------------------------
// 6. Slutkontrol — på filen, som den ligger på disk
// ---------------------------------------------------------------------------

const disk = readFileSync(OUT_FILE);
krav(disk.equals(ud), 'filen på disk afviger fra det sammensatte indhold');
krav(!harBom(disk), 'output har BOM');
try {
  new TextDecoder('utf-8', { fatal: true }).decode(disk);
} catch {
  fejl('output er ikke gyldig UTF-8');
}

// Hvilke outputlinjer stammer fra prod-public.sql? Bestemmes af byte-offsets.
const publicFra = dele[0].buf.length;
const publicTil = publicFra + publicUd.reduce((n, l) => n + l.length, 0);
const diskPublic = splitLinjer(disk.subarray(publicFra, publicTil));
krav(diskPublic.length === publicUd.length, 'linjeantal i public-delen på disk afviger');

// Hver outputlinje skal findes i input, i samme rækkefølge, og hver inputlinje
// kan kun bruges én gang (fanger både ændrede og dublerede linjer).
let p = 0;
diskPublic.forEach((linje, n) => {
  while (p < ind.length && !ind[p].equals(linje)) p++;
  if (p >= ind.length) fejl(`outputlinje ${n + 1} i public-delen findes ikke i input efter forrige match: ${tekst(linje).slice(0, 100)}`);
  p++;
});

// Stærkere end delsekvens: output er PRÆCIS input minus de fjernede linjer.
let q = 0;
for (let i = 0; i < ind.length; i++) {
  if (!behold[i]) continue;
  krav(ind[i].equals(diskPublic[q]), `inputlinje ${i + 1} står ikke på plads ${q + 1} i output`);
  q++;
}
krav(q === diskPublic.length, 'output har flere public-linjer end beholdt fra input');

const fjernet = [...stat.values()].reduce((n, s) => n + s.linjer, 0);
krav(diskPublic.length + fjernet === ind.length, 'beholdt + fjernet er ikke lig input');

// ---------------------------------------------------------------------------
// 7. Udskrift
// ---------------------------------------------------------------------------

const rel = (f) => relative(ROOT, f).replaceAll('\\', '/');
console.log('build-baseline: OK');
console.log('');
console.log(`Input   ${rel(join(SRC_DIR, 'prod-public.sql'))}`);
console.log(`        ${publicBuf.length} bytes, ${ind.length} linjer (${crlfInd} CRLF), ${starter.length} entries`);
console.log(`        sha256 ${sha256(publicBuf)}`);
console.log('');
console.log('Fjernet pr. filterregel:');
for (const s of stat.values()) {
  const enhed = s.id === 'R1' ? 'linjer ' : 'entries';
  console.log(`  ${s.id}  ${String(s.enheder).padStart(3)} ${enhed}  ${String(s.linjer).padStart(4)} linjer  ${s.tekst}`);
}
console.log(`  I alt ${String(fjernet).padStart(15)} linjer`);
console.log('');
console.log('Beholdt fra prod-public.sql:');
console.log(`  ${diskPublic.length} linjer (${crlfUd} CRLF), ${tilbage.length} entries, ${adpPostgres} default privileges for postgres`);
console.log(`  kontrol: ${diskPublic.length} + ${fjernet} = ${ind.length} inputlinjer`);
console.log('  kontrol: hver outputlinje findes i input i samme rækkefølge, byte for byte: JA');
console.log('  kontrol: output = input minus fjernede linjer (ingen dubletter): JA');
console.log('');
console.log('Tilføjet:');
console.log('  vagt (to_regclass), BEGIN/COMMIT, 3 x ALTER DEFAULT PRIVILEGES … REVOKE, RESET ALL');
console.log(`  1 trigger på auth.users, ${bucketSql.length} buckets, ${orgSql.length} organisation_types`);
console.log('');
console.log(`Output  ${rel(OUT_FILE)}`);
console.log(`        ${disk.length} bytes, ${splitLinjer(disk).length} linjer, UTF-8 uden BOM`);
console.log(`        sha256 ${sha256(disk)}`);
