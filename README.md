# BlockBid Automation Toolkit

A production-ready automation toolkit for BlockBid tender management, built with TypeScript and Playwright. This toolkit provides end-to-end automation for creating and managing EU public tenders through the BlockBid platform.

## Features

- **Four Complete Tender Flows**: Open tender, Restricted tender, Negotiated procedure, and Qualification system
- **Award Notice Publishing**: Automated F03 award notice publication to TED
- **ESPD & eForms Integration**: Direct API integration with strongly-typed builders and validation
- **Multiple Publishing Modes**: UI, API, and Hybrid modes for maximum flexibility
- **Robust Selector Strategy**: Resilient locator strategies with fallback XPaths
- **CLI Interface**: Command-line interface for running flows
- **Comprehensive Testing**: End-to-end test specifications and unit tests
- **Error Handling**: Rich error reporting with screenshots and artifacts
- **TypeScript**: Full type safety and IntelliSense support

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Valid BlockBid credentials with "Ordregiver" (Contracting Authority) access

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/blockbid-automation-toolkit.git
cd blockbid-automation-toolkit
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Playwright browsers:
```bash
pnpm run install-browsers
```

4. Copy environment configuration:
```bash
cp env.example .env
```

5. Edit `.env` with your BlockBid credentials:
```env
BLOCKBID_BASE_URL=https://blockbid.dk
BLOCKBID_EMAIL=your-email@example.com
BLOCKBID_PASSWORD=your-password
DEFAULT_TIMEZONE=Europe/Copenhagen
DEFAULT_LANG=da-DK

# Publishing Mode (ui, api, hybrid)
PUBLISHING_MODE=ui

# For API/Hybrid mode - ESPD API Configuration
ESPD_API_BASE_URL=https://espd.vendor/api
ESPD_API_KEY=your-espd-api-key

# For API/Hybrid mode - TED/eForms API Configuration
TED_API_BASE_URL=https://enotices.vendor/api
TED_CLIENT_ID=your-ted-client-id
TED_CLIENT_SECRET=your-ted-client-secret

# For API/Hybrid mode - Organization Configuration
ORGANIZATION_NAME="Your Municipality/Organization"
ORGANIZATION_ID=12345678
```

## Quick Start

### Using the CLI

The toolkit provides a command-line interface for running tender flows:

```bash
# Create an open tender
bb open --title "IT Services Tender" --cpv 12300000 --description "IT support services" --qa "2025-01-15T10:00" --deadline "2025-01-22T12:00"

# Create a restricted tender
bb restricted --title "Construction Project" --cpv 45600000 --description "Building construction" --application-deadline "2025-01-10T12:00" --qa-application "2025-01-08T10:00" --min 5 --max 8

# Create a negotiated procedure
bb negotiated --title "Complex IT Solution" --cpv 78900000 --description "Custom software development" --application-deadline "2025-01-10T12:00" --qa-application "2025-01-08T10:00" --rounds 2 --initial-offers --justification "Complex requirements need negotiation"

# Create a qualification system
bb kval --title "IT Framework Agreement" --cpv 12300000 --description "IT services framework" --categories "El" "VVS" "IT"

# Publish award notice
bb award --tender-title "IT Services Tender" --winner "Best IT A/S" --reg-no "12345678" --value 1500000
```

### Direct API Mode (ESPD + eForms)

For pure API mode (no browser required), set `PUBLISHING_MODE=api`:

```bash
# Pure API mode - no browser required
PUBLISHING_MODE=api \
ESPD_API_BASE_URL=https://espd.vendor/api \
ESPD_API_KEY=your-espd-api-key \
TED_API_BASE_URL=https://enotices.vendor/api \
TED_CLIENT_ID=your-ted-client-id \
TED_CLIENT_SECRET=your-ted-client-secret \
ORGANIZATION_ID=12345678 \
ORGANIZATION_NAME="Kommune Z" \
bb open --title "Asfalt 2026" --cpv 45233120 --qa "2025-10-01T10:00" --deadline "2025-10-08T12:00"

# Hybrid mode - API first, UI fallback if API fails
PUBLISHING_MODE=hybrid \
bb restricted --title "Renovation" --application-deadline "2025-10-05T12:00" --min 5 --max 8
```

### Using the API

```typescript
import { createAuthenticatedPage } from './src/auth/login';
import { createOpenTender } from './src/flows/openTender';
import { OpenTenderInput } from './src/types';

const page = await createAuthenticatedPage(browser);
const input: OpenTenderInput = {
  title: "My Tender",
  cpv: ["12300000"],
  description: "Tender description",
  documents: [{ path: "./docs/spec.pdf", audience: "all" }],
  tildelingskriterier: [
    { name: "Price", type: "price", weight: 60 },
    { name: "Quality", type: "quality", weight: 40 }
  ],
  espd: {
    useESPD: true,
    exclusionGroundsPreset: "standardDK",
    selectionCriteria: [
      { type: "economic", value: "Financial stability" }
    ]
  },
  qa: {
    qaDeadline: "2025-01-15T10:00",
    qaScope: "tender"
  },
  deadlines: {
    submissionDeadline: "2025-01-22T12:00"
  }
};

await createOpenTender(page, input);
```

## Tender Flows

### 1. Open Tender (Offentligt udbud – EU, F02)
- Public tender with full access
- Direct submission of offers
- QA period for questions
- Publication to TED

### 2. Restricted Tender (Begrænset udbud – EU, F02)
- Two-stage process: prequalification + invitation
- Min/max applicant limits
- ESPD evaluation for prequalification
- Invitation to selected suppliers

### 3. Negotiated Procedure (Udbud med forhandling – EU, F02)
- Multi-round negotiation process
- Justification required
- Initial offers (optional)
- Final offers after negotiation

### 4. Qualification System (Kvalifikationssystem – F14)
- Open-ended system for continuous applications
- Category-based organization
- Call-off tenders under the system
- Automated application processing

## Publishing Modes

The toolkit supports three publishing modes for maximum flexibility:

### 1. UI Mode (Default)
- Uses BlockBid's web interface for all operations
- No additional API credentials required
- Most reliable for complex workflows
- Set `PUBLISHING_MODE=ui`

### 2. API Mode
- Direct API integration with ESPD and eForms services
- Fastest execution, no browser required
- Requires API credentials and organization details
- Set `PUBLISHING_MODE=api`

### 3. Hybrid Mode
- Tries API first, falls back to UI if API fails
- Best of both worlds: speed with reliability
- Requires API credentials for optimal performance
- Set `PUBLISHING_MODE=hybrid`

## Configuration

### Environment Variables

| Variable | Description | Default | Required For |
|----------|-------------|---------|--------------|
| `BLOCKBID_BASE_URL` | BlockBid platform URL | `https://blockbid.dk` | All modes |
| `BLOCKBID_EMAIL` | Your BlockBid email | Required | All modes |
| `BLOCKBID_PASSWORD` | Your BlockBid password | Required | All modes |
| `PUBLISHING_MODE` | Publishing strategy | `ui` | All modes |
| `DEFAULT_TIMEZONE` | Timezone for dates | `Europe/Copenhagen` | All modes |
| `DEFAULT_LANG` | Language/locale | `da-DK` | All modes |
| `ARTIFACTS_DIR` | Directory for test artifacts | `./artifacts` | All modes |
| `ESPD_API_BASE_URL` | ESPD service API URL | - | API/Hybrid |
| `ESPD_API_KEY` | ESPD service API key | - | API/Hybrid |
| `TED_API_BASE_URL` | TED/eForms API URL | - | API/Hybrid |
| `TED_CLIENT_ID` | TED OAuth client ID | - | API/Hybrid |
| `TED_CLIENT_SECRET` | TED OAuth client secret | - | API/Hybrid |
| `ORGANIZATION_NAME` | Your organization name | - | API/Hybrid |
| `ORGANIZATION_ID` | Your organization ID (CVR) | - | API/Hybrid |

### Date Formats

The toolkit supports multiple date formats:
- ISO format: `2025-01-15T10:00:00Z`
- Danish format: `15-01-2025 10:00`
- Relative dates: `now + 7 days at 12:00`

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in headed mode (visible browser)
pnpm test:headed

# Run tests with debug mode
pnpm test:debug

# Run tests with UI mode
pnpm test:ui

# View test report
pnpm test:report
```

### Test Structure

- `tests/e2e/auth.spec.ts` - Authentication tests
- `tests/e2e/open-tender.spec.ts` - Open tender flow tests
- `tests/e2e/restricted-tender.spec.ts` - Restricted tender flow tests
- `tests/e2e/negotiated-procedure.spec.ts` - Negotiated procedure tests
- `tests/e2e/qualification-system.spec.ts` - Qualification system tests
- `tests/e2e/award-notice.spec.ts` - Award notice tests

## Selector Strategy

The toolkit uses a robust selector strategy with multiple fallback options:

1. **Accessibility-first**: `getByRole()`, `getByLabel()`, `getByPlaceholder()`
2. **Text content**: `getByText()`
3. **Test IDs**: `getByTestId()`
4. **XPath fallback**: As last resort for complex selectors

Example:
```typescript
const button = await selectorHelper.find([
  { role: 'button', name: 'Opret nyt udbud' },
  { text: 'Opret nyt udbud' },
  { xpath: '//button[contains(text(), "Opret nyt udbud")]' }
]);
```

## Error Handling

The toolkit provides comprehensive error handling:

- **Screenshots**: Automatic full-page screenshots on failure
- **HTML Snapshots**: Page HTML saved for debugging
- **Rich Error Messages**: Detailed error context and stack traces
- **Artifact Storage**: All artifacts saved in `/artifacts/<test-name>/`

## ESPD & eForms Integration

### Strongly-Typed Builders

The toolkit includes strongly-typed builders with Zod validation:

```typescript
import { buildEspdJson, buildEspdWithXml } from './src/lib/espd/builder';
import { buildEForms, buildF02Notice, buildF03Notice } from './src/lib/eforms/builder';

// Build ESPD request
const espdRequest = buildEspdJson({
  title: 'ESPD for IT Services',
  buyer: { name: 'Kommune A', identifier: '12345678' },
  preset: 'standardDK',
  criteria: [
    { type: 'economic', value: 'Financial stability' },
    { type: 'technical', value: 'Technical capacity' }
  ]
});

// Build eForms notice
const notice = buildF02Notice({
  title: 'IT Services Tender',
  cpv: ['12300000'],
  buyer: { name: 'Kommune A', identifier: '12345678' },
  procedure: 'open',
  lots: [{ id: 'LOT-1', title: 'IT Support' }]
});
```

### JSON Schemas

Authoritative schemas are available in `/schemas/`:
- `/schemas/espd/espd-request.schema.json` - ESPD request structure
- `/schemas/eforms/eforms-v1.schema.json` - eForms notice structure

### API Clients

Direct API integration with OAuth support:

```typescript
import { espdApi } from './src/api/espd';
import { eformsApi } from './src/api/eforms';

// Create ESPD via API
const espdResult = await espdApi.create(espdRequest);

// Submit notice via API
const noticeResult = await eformsApi.submitNotice(notice);
```

## Extending the Toolkit

### Adding New Criteria Types

```typescript
// In src/types.ts
export type AwardCriterionType = 'price' | 'quality' | 'cost' | 'other' | 'sustainability';

// In your flow
const criteria = [
  { name: 'Sustainability', type: 'sustainability', weight: 20 }
];
```

### Adding New Document Audiences

```typescript
// In src/types.ts
export type DocumentAudience = 'all' | 'prequalified' | 'invited' | 'evaluators';

// In your flow
const documents = [
  { path: './docs/evaluation.pdf', audience: 'evaluators' }
];
```

### Custom Selector Helpers

```typescript
// In src/utils/selectors.ts
export class SelectorHelper {
  async findCustomElement(customSelector: string): Promise<Locator> {
    return this.find([
      { testId: customSelector },
      { xpath: `//*[@data-custom="${customSelector}"]` }
    ]);
  }
}
```

## Troubleshooting

### Common Issues

1. **Login Failures**: Verify credentials and network connectivity
2. **Selector Errors**: Check if BlockBid UI has changed, update selectors
3. **Timeout Errors**: Increase timeout values in configuration
4. **Document Upload Failures**: Ensure file paths are correct and files exist

### Debug Mode

Run with debug mode for detailed logging:

```bash
DEBUG=true bb open --title "Test Tender" --cpv 12300000 --description "Test" --qa "2025-01-15T10:00" --deadline "2025-01-22T12:00"
```

### Artifact Inspection

Check the `/artifacts/` directory for:
- Screenshots of failed steps
- HTML snapshots for debugging
- Error logs with stack traces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the test examples for usage patterns

## Changelog

### v1.1.0
- **ESPD & eForms API Integration**: Direct API support with strongly-typed builders
- **Multiple Publishing Modes**: UI, API, and Hybrid modes for maximum flexibility
- **Zod Validation**: Runtime validation for all ESPD and eForms data
- **OAuth Support**: Client credentials flow for TED/eForms API
- **JSON Schemas**: Authoritative schemas for ESPD and eForms structures
- **Unit Tests**: Comprehensive test coverage for builders and adapters
- **Enhanced Error Handling**: Better error messages and fallback strategies

### v1.0.0
- Initial release
- Complete tender flow automation
- CLI interface
- Comprehensive test suite
- Error handling and artifact collection