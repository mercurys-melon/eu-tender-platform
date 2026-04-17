# Route Migration – TODO

Samlet oversigt over planlagte rutemigreringsopgaver.
Oprettes i **næste sprint** medmindre andet er angivet.

---

## 1. /buyer → /ordregiver  |  /supplier → /tilbudsgiver

Migrer eksisterende funktionalitet fra de gamle ruter til de nye (app)-gruppe ruter:

- `/buyer/**` → `/ordregiver/**` (301 permanent redirect)
- `/supplier/**` → `/tilbudsgiver/**` (301 permanent redirect)

Tilføj redirects i `next.config.js`:

```js
async redirects() {
  return [
    { source: '/buyer',          destination: '/ordregiver',    permanent: true },
    { source: '/buyer/:path*',   destination: '/ordregiver/:path*', permanent: true },
    { source: '/supplier',       destination: '/tilbudsgiver',  permanent: true },
    { source: '/supplier/:path*',destination: '/tilbudsgiver/:path*', permanent: true },
  ]
}
```

Flyt den reelle funktionalitet fra `/buyer` og `/supplier` pages/components
til de nye `/ordregiver` og `/tilbudsgiver` placeholders.

---

## 2. Opret (marketing) route group – NavBar vender tilbage

Opret `src/app/(marketing)/layout.tsx` med `<NavBar />` + `<footer>` og flyt
disse sider ind under gruppen:

| Nuværende sti           | Ny sti                             |
|-------------------------|------------------------------------|
| `src/app/page.tsx`      | `src/app/(marketing)/page.tsx`     |
| `src/app/about/`        | `src/app/(marketing)/about/`       |
| `src/app/contact/`      | `src/app/(marketing)/contact/`     |
| `src/app/demo/`         | `src/app/(marketing)/demo/`        |
| `src/app/faq/`          | `src/app/(marketing)/faq/`         |
| `src/app/qa/`           | `src/app/(marketing)/qa/`          |
| `src/app/documents/`    | `src/app/(marketing)/documents/`   |

Eksisterende `/marketing` rute bør konsolideres eller fjernes.

URLs forbliver uændrede (route groups påvirker ikke URL-struktur i Next.js).

---

## 3. Revurdér /tenders og /dashboard

Beslut om `/tenders` og `/dashboard` hører hjemme i:
- `(marketing)` → public-facing, ingen auth krævet
- `(app)` → authenticated app-flow med sidebar

Nuværende tilstand: de har egen auth-logik og egne layouts med NavBar.
Forslag: `/tenders` → `(marketing)`, `/dashboard` → `(app)`.

---

## 4. Revurdér NavBar i /create-flowet

`/create` har i dag ingen NavBar (sort baggrund, standalone flow).
Beslut om det forbliver standalone eller integreres i `(app)`-layoutet.

---

## 5. (marketing)/layout.tsx – NavBar varsel

Siderne `/about`, `/contact`, `/demo`, `/faq`, `/qa` og `/documents` mangler
**midlertidigt** NavBar efter sprint 2024-04 (root layout ryddet op).
Dette fixe automatisk når punkt 2 ovenfor er implementeret.

---

_Sidst opdateret: 2026-04-17_
