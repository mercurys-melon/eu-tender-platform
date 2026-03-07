# udbud.dk Functional Test - Krav 1.1 og 1.2

Kører funktionel test suite mod udbud.dk PREPROD API for at opfylde krav 1.1 og 1.2.

## Brug

```bash
npm run udbud:functional-test
```

## Forudsætninger

1. Environment variables i `.env.local`:
   ```env
   UDBUD_DK_PREPROD_URL=https://preprod.udbud.dk/api/v1/publications
   UDBUD_DK_API_KEY=your-api-key-here
   ```

2. Node.js 18+ (for native fetch support)

## Test Cases

Scriptet kører følgende test cases:

1. **Krav 1.1: Udbud under tærskelværdi**
   - Opretter publikation med type "below_threshold"
   - estimated_value under tærskelværdi (500.000 DKK)
   - notification_type: "below_threshold_notice"

2. **Krav 1.2: Forventet indkøb**
   - Opretter publikation med type "expected_procurement"
   - estimated_value kan være over tærskelværdi (1.000.000 DKK)
   - notification_type: "prior_information_notice"
   - Inkluderer expected_start_date og expected_end_date

## Output Struktur

Alle output gemmes i timestamped mappe: `reports/udbuddk/functional-test/<timestamp>/`

### Filer genereret:

1. **Request Payloads (Bilag 1):**
   - `krav-1-1-below-threshold-request.json` - Sanitized request for krav 1.1
   - `krav-1-2-expected-procurement-request.json` - Sanitized request for krav 1.2

2. **Response Data (Bilag 2):**
   - `krav-1-1-below-threshold-response.json` - Fuldt response for krav 1.1
   - `krav-1-2-expected-procurement-response.json` - Fuldt response for krav 1.2

3. **Dokumentation:**
   - `summary.md` - Opsummering med dato/tid, endpoint, HTTP status, reference/ID
   - `evidence.md` - Copy/paste tekst til skemaet med beskrivelse af dokumentationen

## Payload Templates

### Forskelle mellem de to typer:

**Fælles felter:**
- title, description, category
- estimated_value, currency
- submission_deadline, publication_date
- entity_id, status

**Specifikke felter for "Udbud under tærskelværdi":**
- `type: "below_threshold"`
- `notification_type: "below_threshold_notice"`
- `threshold_value: 750000`
- `justification: "..."` (begrundelse)
- `espd_required: false`

**Specifikke felter for "Forventet indkøb":**
- `type: "expected_procurement"`
- `notification_type: "prior_information_notice"`
- `expected_start_date: "..."` (påkrævet)
- `expected_end_date: "..."` (påkrævet)
- `procurement_method: "open"`
- `espd_required: true`

## Sikkerhed

- Secrets (API keys, tokens, etc.) bliver automatisk redacted i logs
- Kun sanitized data gemmes til filer
- `.env.local` er allerede i `.gitignore`

## Exit Codes

- `0` - Alle tests passed
- `1` - En eller flere tests fejlede

## Dokumentation til Skema

`evidence.md` indeholder copy/paste tekst der kan bruges direkte i funktioneltest skemaet. Den beskriver:
- Hvad der blev testet
- Når testen blev udført (lokal tid og ISO)
- Hvilket endpoint der blev kaldt
- HTTP status
- Reference/ID fra udbud.dk
- Hvor dokumentationen findes (bilag 1 og 2)
