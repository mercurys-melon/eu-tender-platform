# Powercell Test Framework - Runbook

## Oversigt

Powercell er en letvægts test framework bygget på Node.js stdlib, designet til at køre tests uden tunge dependencies som Playwright. Frameworket understøtter:

- **Smoke Tests**: Kritiske path tests der skal passere
- **Journey Tests**: End-to-end brugerrejser
- **Edge Tests**: Edge cases og fejlhåndtering
- **Severity Levels**: Blocker, Major, Minor
- **Continue on Failure**: Fortsætter ved fejl for at køre alle tests
- **Rapporter**: JSON og Markdown rapporter med severity breakdown

## Installation

Powercell bruger kun Node.js stdlib, men kræver en TypeScript loader for at køre `.ts` filer direkte.

### Option 1: Brug tsx (anbefalet)

```bash
npm install --save-dev tsx
```

### Option 2: Kompiler først

```bash
# Kompiler tests til JavaScript
npx tsc --project tsconfig.json --outDir dist/tests tests/powercell/**/*.ts
```

## Kørsel

### Kør alle tests

```bash
npm run test:powercell
```

### Kør specifikke test suites

```bash
# Kun smoke tests
npm run test:powercell:smoke

# Kun journey tests
npm run test:powercell:journeys

# Kun edge tests
npm run test:powercell:edges
```

### Kør med custom directory

```bash
node --loader tsx/esm tests/powercell/suite-runner.ts tests/powercell/smoke
```

### Se rapport

```bash
# Markdown rapport
npm run test:powercell:report
cat test-results/powercell-report.md

# JSON rapport
cat test-results/powercell-report.json
```

## Test Struktur

```
tests/powercell/
├── core/                    # Framework core
│   ├── test-runner.ts      # Test runner og suite management
│   ├── assertions.ts        # Assertion library
│   ├── http-client.ts      # HTTP client (Node.js stdlib)
│   └── index.ts            # Exports
├── smoke/                   # Smoke tests (kritiske paths)
│   └── api-health.test.ts
├── journeys/                # Journey tests (E2E flows)
│   ├── auth-flow.test.ts
│   └── tender-creation.test.ts
├── edges/                   # Edge case tests
│   ├── error-handling.test.ts
│   └── performance.test.ts
├── reports/                 # Report generators
│   ├── json-reporter.ts
│   └── markdown-reporter.ts
└── suite-runner.ts          # Main runner
```

## Skriv Tests

### Grundlæggende test struktur

```typescript
import { TestRunner, TestSeverity } from '../core/test-runner'
import { HttpClient } from '../core/http-client'
import { assertEqual, assertTrue } from '../core/assertions'

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

export default async function (runner: TestRunner) {
  const client = new HttpClient(APP_URL)

  await runner.runTest(
    'Test navn',
    'Major', // eller 'Blocker', 'Minor'
    async (ctx) => {
      // Test logik her
      const response = await client.get('/api/endpoint')
      assertEqual(response.status, 200)
      
      // Metadata kan tilføjes til context
      ctx.metadata.responseTime = Date.now() - ctx.startTime
    }
  )
}
```

### Severity Levels

- **Blocker**: Kritiske tests der skal passere før deployment
- **Major**: Vigtige funktionalitet der skal virke
- **Minor**: Nice-to-have eller edge cases

### Assertions

```typescript
import {
  assert,
  assertEqual,
  assertNotEqual,
  assertTrue,
  assertFalse,
  assertNull,
  assertNotNull,
  assertContains,
  assertMatches,
  assertThrows,
  assertThrowsAsync,
} from '../core/assertions'

// Eksempler
assertEqual(actual, expected, 'Custom message')
assertTrue(condition, 'Should be true')
assertContains('Hello World', 'World')
assertMatches('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
```

### HTTP Client

```typescript
const client = new HttpClient('http://localhost:3000')

// GET request
const response = await client.get('/api/tenders')

// POST request
const response = await client.post('/api/tenders', JSON.stringify({ title: 'Test' }))

// Med headers
const response = await client.get('/api/tenders', {
  headers: { 'Authorization': 'Bearer token' }
})

// Response object
response.status      // HTTP status code
response.statusText  // HTTP status text
response.headers     // Response headers
response.body        // Response body (string)
response.json()      // Parse JSON (throws if invalid)
```

### Skip Tests

```typescript
runner.skipTest('Test navn', 'Major', 'Reason for skipping')
```

## Rapporter

### JSON Rapport

Genereres i `test-results/powercell-report.json`:

```json
{
  "timestamp": "2026-01-27T10:00:00.000Z",
  "summary": {
    "totalSuites": 5,
    "totalTests": 12,
    "passed": 10,
    "failed": 2,
    "skipped": 0,
    "totalDuration": 1234,
    "severityBreakdown": {
      "Blocker": { "total": 3, "passed": 3, "failed": 0, "skipped": 0 },
      "Major": { "total": 6, "passed": 5, "failed": 1, "skipped": 0 },
      "Minor": { "total": 3, "passed": 2, "failed": 1, "skipped": 0 }
    }
  },
  "suites": [...]
}
```

### Markdown Rapport

Genereres i `test-results/powercell-report.md` med:

- Summary tabel
- Severity breakdown
- Detaljerede test resultater
- Failed tests summary
- Stack traces for fejl

## Environment Variables

```bash
# App URL (default: http://localhost:3000)
TEST_APP_URL=http://localhost:3000

# Supabase (for API tests)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
TEST_SUPABASE_EMAIL=...
TEST_SUPABASE_PASSWORD=...
```

## Continue on Failure

Som standard fortsætter runneren ved fejl for at køre alle tests. Dette kan deaktiveres ved at modificere `suite-runner.ts`:

```typescript
const runner = new TestRunner(false) // Stop ved første fejl
```

## data-testid Attributter

For stabile selectors i tests, er følgende `data-testid` attributter tilføjet til UI:

### Authentication
- `login-form`, `login-email`, `login-password`, `login-submit`, `login-error`
- `register-form`, `register-email`, `register-password`, `register-submit`, `register-error`

### Navigation
- `nav-logo`, `nav-main`, `nav-login-button`, `nav-register`

### Tender Creation
- `tender-create-form`, `tender-title`, `tender-entity`, `tender-description`, `tender-submit`

## Troubleshooting

### Tests kører ikke

1. Tjek at tsx er installeret: `npm install --save-dev tsx`
2. Tjek at Node.js version er >= 18: `node --version`
3. Tjek at app kører: `npm run dev`

### Tests fejler med connection errors

1. Tjek at app kører på korrekt URL
2. Tjek `TEST_APP_URL` environment variable
3. Tjek firewall/network settings

### TypeScript errors

1. Kør typecheck: `npm run typecheck`
2. Tjek `tsconfig.json` inkluderer test filer
3. Sørg for at alle imports er korrekte

## Best Practices

1. **Smoke tests**: Hold dem korte og fokuseret på kritiske paths
2. **Journey tests**: Test komplette brugerflows
3. **Edge tests**: Test fejlhåndtering og edge cases
4. **Severity**: Brug Blocker sparsomt, kun for kritiske paths
5. **Metadata**: Brug `ctx.metadata` til at gemme yderligere information
6. **data-testid**: Brug data-testid i stedet for CSS selectors for stabilitet

## CI/CD Integration

### GitHub Actions eksempel

```yaml
- name: Run Powercell Tests
  run: |
    npm run test:powercell
  env:
    TEST_APP_URL: http://localhost:3000
  continue-on-error: true

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: powercell-reports
    path: test-results/
```

## Fejlfinding

### Debug en specifik test

```typescript
await runner.runTest(
  'Debug test',
  'Minor',
  async (ctx) => {
    console.log('Debug info:', ctx.metadata)
    // Test logik
  },
  { debug: true } // Metadata
)
```

### Se detaljerede logs

```bash
DEBUG=* npm run test:powercell
```

## Support

For spørgsmål eller problemer, se:
- Test filer i `tests/powercell/` for eksempler
- Core implementation i `tests/powercell/core/`
- Report generators i `tests/powercell/reports/`
