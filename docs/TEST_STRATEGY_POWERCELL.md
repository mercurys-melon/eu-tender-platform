# Powercell Test Strategy - Operativ Runbook

## Oversigt

Denne runbook beskriver den operative strategi for at bruge Powercell tests i daglig udvikling og fejlretning.

## To Test Modes

### Mode A: Test-Run (Kontinuerlig validering)

**Formål:** Hurtig validering af ændringer, log fejl og fortsæt.

**Workflow:**
1. Kør tests: `npm run test:local` (starter dev server automatisk)
2. **Ret kun Blockers** - disse skal fixes før videre arbejde
3. **Log Major/Minor fejl** - dokumenter i issues/tasks, fortsæt arbejde
4. Tjek rapport: `npm run test:report`

**Når at bruge:**
- Før commit/push
- Efter større ændringer
- Daglig validering

**Exit strategy:**
- ✅ Ingen Blockers → Fortsæt arbejde
- ❌ Blockers fundet → Fix først, kør igen

---

### Mode B: Fix-Batch (Fokuseret fejlretning)

**Formål:** Systematisk fejlretning med fokus på kritiske issues.

**Workflow:**
1. Kør smoke tests: `npm run test:smoke`
2. Identificér top 3 Blockers fra rapport
3. Fix top 3 Blockers
4. Kør smoke igen: `npm run test:smoke`
5. Hvis smoke passerer → Kør journeys: `npm run test:journeys`
6. Verificér i rapport: `npm run test:report`

**Når at bruge:**
- Efter større refactoring
- Før release/deployment
- Når test suite er i dårlig stand
- Planlagt fejlretning session

**Exit strategy:**
- ✅ Smoke passerer → Kør journeys
- ✅ Journeys passerer → Klar til deployment
- ❌ Fejl efter fix → Gå tilbage til step 2

---

## Severity Definitioner

### 🔴 Blocker
**Definition:** Kritiske fejl der blokerer deployment eller kernerfunktionalitet.

**Eksempler:**
- Login fungerer ikke
- API endpoints returnerer 500
- Database connection fejler
- App crasher ved start
- Kritiske navigation links virker ikke

**Handling:**
- **Mode A:** Fix før videre arbejde
- **Mode B:** Top prioritet i fix-batch

---

### 🟡 Major
**Definition:** Vigtige funktionalitet der ikke virker, men appen kan stadig bruges.

**Eksempler:**
- Tender creation fejler
- Form validation virker ikke
- Upload funktionalitet fejler
- Vigtige features er broken

**Handling:**
- **Mode A:** Log i issue tracker, fortsæt arbejde
- **Mode B:** Fix efter Blockers er løst

---

### 🟢 Minor
**Definition:** Nice-to-have features eller edge cases der ikke påvirker core funktionalitet.

**Eksempler:**
- UI styling issues
- Edge case fejlhåndtering
- Performance optimeringer
- Mindre UX forbedringer

**Handling:**
- **Mode A:** Log i backlog, lav når tid tillader
- **Mode B:** Fix kun hvis tid tillader efter Major issues

---

## Kommandoer

### Test Kørsel

```bash
# Kør alle tests mod lokal dev server (starter server automatisk)
npm run test:local

# Kør alle Powercell tests (kræver server kører)
npm run test:powercell

# Kør kun smoke tests
npm run test:smoke

# Kør kun journey tests
npm run test:journeys

# Kør kun edge tests
npm run test:edges
```

### Rapporter

```bash
# Generer markdown rapport fra seneste test run
npm run test:report

# Vis JSON summary (raw)
npm run test:powercell:report
```

---

## Rapport Lokation

Alle rapporter og logs gemmes i:

```
reports/powercell/latest/
├── summary.json          # JSON summary med alle test resultater
├── summary.md            # Markdown rapport med severity breakdown
└── raw/                  # Raw logs per test
    ├── smoke_01-api-health.log
    ├── journeys_auth-flow.log
    └── ...
```

### Læs Rapporter

```bash
# Markdown rapport (anbefalet)
cat reports/powercell/latest/summary.md

# JSON summary (programmatisk)
cat reports/powercell/latest/summary.json

# Specifik test log
cat reports/powercell/latest/raw/smoke_01-api-health.log
```

---

## Typiske Workflows

### Daglig Udvikling (Mode A)

```bash
# 1. Start arbejde
git checkout feature-branch

# 2. Lav ændringer
# ... kode ...

# 3. Valider før commit
npm run test:local

# 4. Tjek rapport
npm run test:report

# 5. Hvis Blockers → Fix først
# 6. Hvis Major/Minor → Log og commit
git commit -m "feat: ..."
```

### Før Release (Mode B)

```bash
# 1. Kør smoke tests
npm run test:smoke

# 2. Identificér top 3 Blockers fra rapport
npm run test:report

# 3. Fix Blockers
# ... ret kode ...

# 4. Verificér smoke
npm run test:smoke

# 5. Hvis smoke OK → Kør journeys
npm run test:journeys

# 6. Verificér alt
npm run test:report

# 7. Hvis alt OK → Deploy
```

### Debug en Specifik Test

```bash
# 1. Kør test suite
npm run test:smoke

# 2. Find fejlende test i rapport
npm run test:report

# 3. Læs raw log
cat reports/powercell/latest/raw/smoke_01-login.log

# 4. Fix og kør igen
npm run test:smoke
```

---

## Best Practices

### Mode A (Test-Run)
- ✅ Kør ofte (før hver commit)
- ✅ Ret kun Blockers
- ✅ Log Major/Minor for senere
- ✅ Brug `test:local` for automatisk server management

### Mode B (Fix-Batch)
- ✅ Fokuser på top 3 Blockers ad gangen
- ✅ Verificér med smoke før journeys
- ✅ Brug severity breakdown i rapport til prioritet
- ✅ Planlæg fix-batch sessioner regelmæssigt

### Generelt
- 📊 Tjek rapport efter hver test run
- 📝 Dokumenter Major/Minor issues i issue tracker
- 🔄 Kør tests ofte for tidlig fejldetektion
- 🎯 Fokuser på Blockers først, Major derefter

---

## Troubleshooting

### Tests kører ikke

```bash
# Tjek at dev server kører (hvis ikke brug test:local)
npm run dev

# Tjek environment variables
echo $TEST_APP_URL  # Skal være http://localhost:3000
```

### Rapport viser ingen data

```bash
# Tjek at tests faktisk kørte
ls -la reports/powercell/latest/

# Kør tests igen
npm run test:smoke
npm run test:report
```

### For mange fejl

1. Fokuser på Blockers først (Mode B)
2. Ignorer Minor fejl i første omgang
3. Fix Major fejl systematisk
4. Brug severity breakdown til prioritet

---

## Se også

- [POWERCELL_RUNBOOK.md](./POWERCELL_RUNBOOK.md) - Teknisk dokumentation
- [tests/powercell/README.md](../tests/powercell/README.md) - Test struktur guide
