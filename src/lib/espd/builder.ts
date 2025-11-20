import { create } from 'xmlbuilder2';
import { z } from 'zod';

/**
 * ESPD Request Schema with Zod validation
 * Based on /schemas/espd/espd-request.schema.json
 */
export const EspdRequestZ = z.object({
  title: z.string().min(1, 'Title is required'),
  buyer: z.object({
    name: z.string().min(1, 'Buyer name is required'),
    identifier: z.string().min(1, 'Buyer identifier is required')
  }),
  preset: z.enum(['standardDK', 'standardEU', 'custom']).default('standardDK'),
  criteria: z.array(z.object({
    type: z.enum(['economic', 'technical', 'experience', 'other']),
    value: z.string().min(1, 'Criterion value is required')
  })).default([]),
  specialConditions: z.array(z.string()).optional()
});

export type EspdRequest = z.infer<typeof EspdRequestZ>;

/**
 * Build and validate ESPD request JSON
 */
export function buildEspdJson(input: Partial<EspdRequest>): EspdRequest {
  return EspdRequestZ.parse(input);
}

/**
 * Build ESPD request with additional validation
 */
export function buildEspdRequest(input: {
  title: string;
  buyer: { name: string; identifier: string };
  preset?: 'standardDK' | 'standardEU' | 'custom';
  criteria?: Array<{ type: 'economic' | 'technical' | 'experience' | 'other'; value: string }>;
  specialConditions?: string[];
}): EspdRequest {
  return buildEspdJson(input);
}

/**
 * Produce ESPD-EDM-like XML envelope (simplified, provider-tolerant)
 * NOTE: This is a pragmatic XML wrapper. Align with your ESPD provider's exact EDM if needed.
 */
export function buildEspdXml(req: EspdRequest): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('ESPDRequest', { xmlns: 'urn:grow:espd:request:1.0.0' })
      .ele('Buyer')
        .ele('Name').txt(req.buyer.name).up()
        .ele('Identifier').txt(req.buyer.identifier).up()
      .up()
      .ele('Title').txt(req.title).up()
      .ele('Preset').txt(req.preset).up()
      .ele('Criteria');

  req.criteria.forEach(c => {
    root.ele('Criterion')
      .att('type', c.type)
      .ele('Value').txt(c.value).up()
      .up();
  });

  if (req.specialConditions?.length) {
    const sc = root.up().ele('SpecialConditions');
    req.specialConditions.forEach(s => sc.ele('Condition').txt(s).up());
  }

  return root.end({ prettyPrint: true });
}

/**
 * Create ESPD request with XML attachment for API submission
 */
export function buildEspdWithXml(input: Partial<EspdRequest>): EspdRequest & { __xml: string } {
  const json = buildEspdJson(input);
  const xml = buildEspdXml(json);
  return { ...json, __xml: xml };
}

/**
 * Validate ESPD request without building
 */
export function validateEspdRequest(input: unknown): { success: boolean; data?: EspdRequest; error?: string } {
  try {
    const data = EspdRequestZ.parse(input);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    };
  }
}

/**
 * Default ESPD criteria for Danish public procurement
 */
export const DEFAULT_DK_CRITERIA = [
  { type: 'economic' as const, value: 'Finansiel stabilitet - omsætning mindst 2 mio. DKK' },
  { type: 'technical' as const, value: 'Teknisk kapacitet - relevante kompetencer og erfaring' },
  { type: 'experience' as const, value: 'Erfaring med lignende projekter inden for de sidste 3 år' }
];

/**
 * Default ESPD criteria for EU public procurement
 */
export const DEFAULT_EU_CRITERIA = [
  { type: 'economic' as const, value: 'Economic and financial standing - minimum turnover requirements' },
  { type: 'technical' as const, value: 'Technical and professional ability - relevant skills and experience' },
  { type: 'experience' as const, value: 'Experience with similar projects within the last 3 years' }
];

/**
 * Create ESPD request with default criteria based on preset
 */
export function buildEspdWithDefaults(input: {
  title: string;
  buyer: { name: string; identifier: string };
  preset?: 'standardDK' | 'standardEU' | 'custom';
  additionalCriteria?: Array<{ type: 'economic' | 'technical' | 'experience' | 'other'; value: string }>;
  specialConditions?: string[];
}): EspdRequest {
  const preset = input.preset || 'standardDK';
  const defaultCriteria = preset === 'standardDK' ? DEFAULT_DK_CRITERIA : DEFAULT_EU_CRITERIA;
  const allCriteria = [...defaultCriteria, ...(input.additionalCriteria || [])];

  return buildEspdJson({
    title: input.title,
    buyer: input.buyer,
    preset,
    criteria: allCriteria,
    specialConditions: input.specialConditions
  });
}
