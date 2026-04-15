import { z } from 'zod';

/**
 * eForms Notice Schema with Zod validation
 * Based on /schemas/eforms/eforms-v1.schema.json
 */
export const EFormsZ = z.object({
  noticeType: z.enum(['F02', 'F03', 'F14', 'eForms']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  cpv: z.array(z.string().regex(/^[0-9]{8}(-[0-9])?$/, 'Invalid CPV code format')).min(1, 'At least one CPV code is required'),
  buyer: z.object({
    name: z.string().min(1, 'Buyer name is required'),
    identifier: z.string().min(1, 'Buyer identifier is required'),
    country: z.string().default('DK')
  }),
  procedure: z.object({
    type: z.enum(['open', 'restricted', 'negotiated', 'qualification']),
    minInvite: z.number().min(1).optional(),
    maxInvite: z.number().min(1).optional(),
    justification: z.string().optional(),
    initialOffers: z.boolean().optional()
  }),
  lots: z.array(z.object({
    id: z.string().min(1, 'Lot ID is required'),
    title: z.string().optional(),
    description: z.string().optional(),
    valueEstimate: z.number().min(0).optional(),
    duration: z.object({
      months: z.number().min(1).optional(),
      start: z.string().optional(),
      end: z.string().optional()
    }).partial().optional()
  })).min(1, 'At least one lot is required'),
  deadlines: z.object({
    application: z.string().optional(),
    qaApplication: z.string().optional(),
    tender: z.string().optional(),
    qaTender: z.string().optional()
  }).partial().optional(),
  accessIsFree: z.boolean().default(true),
  communication: z.string().default('platform')
});

export type EFormsNotice = z.infer<typeof EFormsZ>;

/**
 * Build and validate eForms notice
 */
export function buildEForms(input: Partial<EFormsNotice>): EFormsNotice {
  return EFormsZ.parse(input);
}

/**
 * Build eForms notice with additional validation
 */
export function buildEFormsNotice(input: {
  noticeType: 'F02' | 'F03' | 'F14' | 'eForms';
  title: string;
  description?: string;
  cpv: string[];
  buyer: { name: string; identifier: string; country?: string };
  procedure: {
    type: 'open' | 'restricted' | 'negotiated' | 'qualification';
    minInvite?: number;
    maxInvite?: number;
    justification?: string;
    initialOffers?: boolean;
  };
  lots: Array<{
    id: string;
    title?: string;
    description?: string;
    valueEstimate?: number;
    duration?: { months?: number; start?: string; end?: string };
  }>;
  deadlines?: {
    application?: string;
    qaApplication?: string;
    tender?: string;
    qaTender?: string;
  };
  accessIsFree?: boolean;
  communication?: string;
}): EFormsNotice {
  return buildEForms(input as Partial<EFormsNotice>);
}

/**
 * Validate eForms notice without building
 */
export function validateEFormsNotice(input: unknown): { success: boolean; data?: EFormsNotice; error?: string } {
  try {
    const data = EFormsZ.parse(input);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    };
  }
}

/**
 * Create F02 Contract Notice
 */
export function buildF02Notice(input: {
  title: string;
  description?: string;
  cpv: string[];
  buyer: { name: string; identifier: string; country?: string };
  procedure: 'open' | 'restricted' | 'negotiated';
  lots: Array<{
    id: string;
    title?: string;
    description?: string;
    valueEstimate?: number;
    duration?: { months?: number; start?: string; end?: string };
  }>;
  deadlines?: {
    application?: string;
    qaApplication?: string;
    tender?: string;
    qaTender?: string;
  };
  minInvite?: number;
  maxInvite?: number;
  justification?: string;
  initialOffers?: boolean;
}): EFormsNotice {
  return buildEForms({
    noticeType: 'F02',
    title: input.title,
    description: input.description,
    cpv: input.cpv,
    buyer: { ...input.buyer, country: input.buyer.country || 'DK' },
    procedure: {
      type: input.procedure,
      minInvite: input.minInvite,
      maxInvite: input.maxInvite,
      justification: input.justification,
      initialOffers: input.initialOffers
    },
    lots: input.lots,
    deadlines: input.deadlines,
    accessIsFree: true,
    communication: 'platform'
  });
}

/**
 * Create F03 Contract Award Notice
 */
export function buildF03Notice(input: {
  title: string;
  description?: string;
  cpv: string[];
  buyer: { name: string; identifier: string; country?: string };
  winnerName: string;
  winnerIdentifier?: string;
  contractValue?: number;
  lots: Array<{
    id: string;
    title?: string;
    description?: string;
    valueEstimate?: number;
  }>;
}): EFormsNotice {
  return buildEForms({
    noticeType: 'F03',
    title: input.title,
    description: input.description || `Contract award notice for ${input.title}`,
    cpv: input.cpv,
    buyer: { ...input.buyer, country: input.buyer.country || 'DK' },
    procedure: {
      type: 'open' // F03 doesn't specify procedure type
    },
    lots: input.lots.map(lot => ({
      ...lot,
      valueEstimate: lot.valueEstimate || input.contractValue
    })),
    accessIsFree: true,
    communication: 'platform'
  });
}

/**
 * Create F14 Qualification System Notice
 */
export function buildF14Notice(input: {
  title: string;
  description?: string;
  cpv: string[];
  buyer: { name: string; identifier: string; country?: string };
  categories: string[];
  lots: Array<{
    id: string;
    title?: string;
    description?: string;
  }>;
}): EFormsNotice {
  return buildEForms({
    noticeType: 'F14',
    title: input.title,
    description: input.description || `Qualification system for ${input.title}`,
    cpv: input.cpv,
    buyer: { ...input.buyer, country: input.buyer.country || 'DK' },
    procedure: {
      type: 'qualification'
    },
    lots: input.lots,
    accessIsFree: true,
    communication: 'platform'
  });
}

/**
 * Helper to create a single lot with default values
 */
export function createLot(input: {
  id: string;
  title?: string;
  description?: string;
  valueEstimate?: number;
  duration?: { months?: number; start?: string; end?: string };
}): EFormsNotice['lots'][0] {
  return {
    id: input.id,
    title: input.title || `Lot ${input.id}`,
    description: input.description,
    valueEstimate: input.valueEstimate,
    duration: input.duration
  };
}

/**
 * Helper to create multiple lots from a single specification
 */
export function createLots(input: {
  count: number;
  baseTitle: string;
  baseDescription?: string;
  valueEstimate?: number;
  duration?: { months?: number; start?: string; end?: string };
}): EFormsNotice['lots'] {
  const lots: EFormsNotice['lots'] = [];
  
  for (let i = 1; i <= input.count; i++) {
    lots.push(createLot({
      id: `LOT-${i}`,
      title: `${input.baseTitle} - Lot ${i}`,
      description: input.baseDescription,
      valueEstimate: input.valueEstimate,
      duration: input.duration
    }));
  }
  
  return lots;
}
