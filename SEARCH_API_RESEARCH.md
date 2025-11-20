# Search API Research & Implementation Guide

## Overview
This document provides research findings and implementation guidance for integrating with udbud.dk and TED APIs for the "Søg udbud" (Search Tenders) feature.

## Current Implementation Status
✅ **Completed:**
- Shared domain model and types (`src/lib/search/types.ts`)
- Provider adapters with mock data (`src/lib/search/providers/`)
- Merge and deduplication logic (`src/lib/search/merge.ts`)
- API route handler (`src/app/api/search/route.ts`)
- UI component (`src/components/search/TenderSearch.tsx`)
- Search pages for supplier and buyer roles

## API Research Findings

### udbud.dk
**Status:** ❌ No official public API available

**Key Findings:**
- Relaunched November 12, 2024 with new interface and e-forms integration
- Uses structured e-forms for tender announcements
- No public API documentation found
- **Recommendation:** Contact Konkurrence- og Forbrugerstyrelsen directly for API access

**Contact Information:**
- Website: https://kfst.dk/udbud/udbuddk/
- Email: Contact through official website
- **Action Required:** Request API access or data export capabilities

### TED (Tenders Electronic Daily)
**Status:** ⚠️ Limited official API, third-party alternatives available

**Official TED API:**
- Documentation: https://docs.ted.europa.eu/home/index.html
- Provides interfaces for eForms validation and submission
- Search capabilities in TED archives
- **Limitation:** May require registration and API key

**Third-party Alternative - TEDective:**
- Documentation: https://docs.tedective.org/
- Provides API access to TED data
- Makes European public procurement data more accessible
- **Note:** Third-party service, not official TED

**Recommendation:** Start with TEDective API for development, evaluate official TED API for production

## Implementation Strategy

### Phase 1: Mock Data (Current)
- ✅ Implemented with realistic mock data
- ✅ Full functionality testing
- ✅ UI/UX development

### Phase 2: API Integration
1. **TED Integration:**
   ```typescript
   // Environment variables needed:
   TED_API_URL=https://api.ted.europa.eu
   TED_API_KEY=your_api_key
   
   // Or for TEDective:
   TEDECTIVE_API_URL=https://api.tedective.org
   TEDECTIVE_API_KEY=your_api_key
   ```

2. **udbud.dk Integration:**
   ```typescript
   // Environment variables (pending API access):
   UDBUDDK_API_URL=https://api.udbud.dk
   UDBUDDK_API_KEY=your_api_key
   ```

### Phase 3: Production Deployment
- Replace mock data with real API calls
- Implement proper error handling and rate limiting
- Add caching strategies
- Monitor API usage and costs

## Environment Configuration

Add to `.env.local`:
```bash
# TED API Configuration
TED_API_URL=https://api.ted.europa.eu
TED_API_KEY=your_ted_api_key

# TEDective Alternative
TEDECTIVE_API_URL=https://api.tedective.org
TEDECTIVE_API_KEY=your_tedective_api_key

# udbud.dk Configuration (pending API access)
UDBUDDK_API_URL=https://api.udbud.dk
UDBUDDK_API_KEY=your_udbuddk_api_key

# Feature flags
USE_MOCK_DATA=true
ENABLE_TED_API=false
ENABLE_UDBUDDK_API=false
```

## Provider Implementation Updates

### TED Provider (`src/lib/search/providers/ted.ts`)
```typescript
export async function searchTED(params: SearchParams): Promise<SearchResult> {
  const apiUrl = process.env.TED_API_URL || process.env.TEDECTIVE_API_URL
  const apiKey = process.env.TED_API_KEY || process.env.TEDECTIVE_API_KEY
  
  if (!apiUrl || !apiKey) {
    // Fallback to mock data
    return getMockTEDData(params)
  }
  
  // Implement real API call
  const response = await fetch(`${apiUrl}/search`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mapSearchParamsToTEDQuery(params))
  })
  
  return mapTEDResponseToSearchResult(await response.json())
}
```

### udbud.dk Provider (`src/lib/search/providers/udbuddk.ts`)
```typescript
export async function searchUdbudDK(params: SearchParams): Promise<SearchResult> {
  const apiUrl = process.env.UDBUDDK_API_URL
  const apiKey = process.env.UDBUDDK_API_KEY
  
  if (!apiUrl || !apiKey) {
    // Fallback to mock data
    return getMockUdbudDKData(params)
  }
  
  // Implement real API call when available
  // TODO: Implement when API access is granted
}
```

## Next Steps

### Immediate Actions:
1. **Contact udbud.dk:** Request API access from Konkurrence- og Forbrugerstyrelsen
2. **Evaluate TEDective:** Test TEDective API for TED data integration
3. **Apply for TED API:** Register for official TED API access

### Development Tasks:
1. **API Integration:** Replace mock data with real API calls
2. **Error Handling:** Implement robust error handling and fallbacks
3. **Rate Limiting:** Add rate limiting and caching
4. **Monitoring:** Add API usage monitoring and alerting

### Testing:
1. **Unit Tests:** Test provider adapters with mock data
2. **Integration Tests:** Test API integration with real endpoints
3. **Performance Tests:** Test with large datasets and concurrent requests

## Compliance & Legal Considerations

### Terms of Service:
- **udbud.dk:** Review terms of service before implementing any data access
- **TED:** Ensure compliance with EU data usage policies
- **TEDective:** Review third-party service terms

### Data Usage:
- Respect rate limits and usage policies
- Implement proper caching to reduce API calls
- Handle data privacy and GDPR requirements
- Monitor for changes in API terms or availability

## Monitoring & Maintenance

### Key Metrics:
- API response times
- Error rates
- Data freshness
- User search patterns

### Maintenance Tasks:
- Regular API health checks
- Update provider adapters for API changes
- Monitor for new data sources
- Optimize search performance

## Conclusion

The current implementation provides a solid foundation with mock data that can be easily replaced with real API calls. The modular architecture allows for independent updates to each provider without affecting the overall system.

**Priority Actions:**
1. Contact udbud.dk for API access
2. Test TEDective API for TED integration
3. Implement feature flags for gradual rollout
4. Add comprehensive error handling and monitoring
