# Powercell Test Framework

Letvægts test framework bygget på Node.js stdlib.

## Test Kategorier

### Smoke Tests (`smoke/`)

**Formål:** Kritiske path tests der verificerer at systemet er op og kører. Disse tests skal altid passere før deployment.

- Tester grundlæggende funktionalitet og tilgængelighed
- Kritiske API endpoints og system health
- Blocker severity - deployment blocker hvis de fejler
- Kører først i test suite
- Må ikke afhænge af tidligere tests

### Journey Tests (`journeys/`)

**Formål:** End-to-end brugerrejser der tester komplette workflows fra brugerens perspektiv.

- Tester komplette brugerflows (fx: login → opret tender → submit bid)
- Simulerer realistiske brugerscenarier
- Major severity - vigtige funktionalitet der skal virke
- Kan teste flere features sammen
- Må ikke afhænge af tidligere tests

### Edge Tests (`edges/`)

**Formål:** Edge cases, fejlhåndtering og ikke-standard scenarier.

- Tester error handling og edge cases
- Performance karakteristika
- Boundary conditions
- Minor severity - nice-to-have eller edge cases
- Må ikke afhænge af tidligere tests

## Naming Convention

### Smoke Tests

Smoke tests skal navngives med numerisk præfiks for at sikre kørselsrækkefølge:

```
smoke/
  01-api-health.test.ts
  02-database-connectivity.test.ts
  03-auth-endpoints.test.ts
  ...
```

**Regel:** Brug `01-`, `02-`, `03-` osv. som præfiks for at kontrollere kørselsrækkefølge.

### Journey Tests

Journey tests navngives efter det workflow de tester:

```
journeys/
  auth-flow.test.ts
  tender-creation.test.ts
  bid-submission.test.ts
  ...
```

### Edge Tests

Edge tests navngives efter det edge case eller scenario de tester:

```
edges/
  error-handling.test.ts
  performance.test.ts
  boundary-conditions.test.ts
  ...
```

## Vigtige Principper

### Test Isolation

**Tests må ikke afhænge af tidligere tests.**

Hver test skal være selvstændig og kunne køre isoleret:

- ✅ **Godt:** Hver test opretter sine egne test data
- ✅ **Godt:** Hver test rydder op efter sig selv
- ✅ **Godt:** Tests kan køres i vilkårlig rækkefølge
- ❌ **Dårligt:** Test B forventer data fra Test A
- ❌ **Dårligt:** Test afhænger af state fra tidligere test
- ❌ **Dårligt:** Test forventer at en anden test har kørt først

**Eksempel på korrekt isolation:**

```typescript
// ✅ Korrekt - hver test er selvstændig
await runner.runTest('Test A', 'Major', async () => {
  const data = await createTestData()
  // ... test logik
  await cleanupTestData(data)
})

await runner.runTest('Test B', 'Major', async () => {
  const data = await createTestData() // Opretter egen data
  // ... test logik
  await cleanupTestData(data)
})
```

```typescript
// ❌ Forkert - Test B afhænger af Test A
await runner.runTest('Test A', 'Major', async () => {
  global.testData = await createTestData()
})

await runner.runTest('Test B', 'Major', async () => {
  // Fejler hvis Test A ikke har kørt først!
  const data = global.testData
})
```

## Struktur

```
tests/powercell/
├── core/                    # Framework core
│   ├── test-runner.ts      # Test runner og suite management
│   ├── assertions.ts        # Assertion library
│   ├── http-client.ts      # HTTP client (Node.js stdlib)
│   └── index.ts            # Exports
├── smoke/                   # Smoke tests (kritiske paths)
│   ├── 01-api-health.test.ts
│   └── 02-*.test.ts
├── journeys/                # Journey tests (E2E flows)
│   ├── auth-flow.test.ts
│   └── tender-creation.test.ts
├── edges/                   # Edge case tests
│   ├── error-handling.test.ts
│   └── performance.test.ts
└── README.md                # Denne fil
```

## Se også

- [Core Framework](./core/) - Framework implementation
- [Reports](./reports/) - Rapport generators
