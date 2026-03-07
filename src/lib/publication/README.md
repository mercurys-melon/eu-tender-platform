# Publication Engine for udbud.dk

Dette modul implementerer en "Publication Engine" til at publicere tenders til udbud.dk PREPROD API.

## Features

- ✅ Outbox pattern med `publication_jobs` tabel
- ✅ Retry/backoff logik (max 3 forsøg)
- ✅ Idempotency via `request_id` (idempotency_key)
- ✅ Validering af payload før sending
- ✅ Strukturerede fejlbeskeder med felt-specifikke fejl
- ✅ Status tracking og historik

## Database Schema

Tabel: `publication_jobs`
- `tender_id` - Reference til tender
- `status` - pending | processing | completed | failed | retrying
- `payload_version` - Version af payload format
- `request_id` - Idempotency key for udbud.dk API
- `payload` - JSONB med tender data
- `response` - JSONB med API response
- `last_error` - Seneste fejlbesked
- `attempts` - Antal forsøg
- `max_attempts` - Max forsøg (default: 3)
- `next_retry_at` - Næste retry tidspunkt
- Timestamps: `created_at`, `updated_at`, `completed_at`

## API

### POST `/api/tenders/[id]/publish`

Publicerer en tender til udbud.dk.

**Response (success):**
```json
{
  "success": true,
  "jobId": "uuid",
  "status": "completed",
  "message": "Publikation gennemført",
  "requestId": "idempotency-key"
}
```

**Response (error):**
```json
{
  "success": false,
  "jobId": "uuid",
  "status": "failed",
  "message": "Valideringsfejl",
  "errors": [
    { "field": "title", "message": "Titel skal være mindst 10 tegn" }
  ]
}
```

### GET `/api/tenders/[id]/publish`

Henter publikationsstatus for en tender.

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "status": "completed",
      "created_at": "2026-01-27T...",
      ...
    }
  ]
}
```

## Brug i UI

### Simpel integration

```tsx
import PublicationButton from '@/components/tenders/PublicationButton'

// I din tender management side:
<PublicationButton tenderId={tenderId} />
```

### Direkte API kald

```tsx
const response = await fetch(`/api/tenders/${tenderId}/publish`, {
  method: 'POST',
})

const data = await response.json()
if (data.success) {
  // Success
} else {
  // Handle errors - data.errors contains field-specific errors
}
```

## Environment Variables

Tilføj til `.env.local`:

```env
UDBUD_DK_PREPROD_URL=https://preprod.udbud.dk/api/v1/publications
UDBUD_DK_API_KEY=your-api-key-here
```

## Retry Logic

- Max 3 forsøg
- Exponential backoff: 1s, 2s, 4s (max 10s)
- Idempotency key sikrer ingen dobbeltpublikationer ved retry

## Fejlhåndtering

Fejl returneres struktureret med:
- Generel besked (`message`)
- Felt-specifikke fejl (`errors[]` med `field` og `message`)
- Status kode (`status`)

Dette gør det let at vise fejl i UI med felt-specifikke besked.
