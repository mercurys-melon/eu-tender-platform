import { z } from 'zod'

// Central definition of TenderStatus enum for reuse across all schemas
const TenderStatusEnum = z.enum([
  'draft',
  'published',
  'prequalification',
  'bidding',
  'evaluation',
  'awarded',
  'closed',
  'cancelled',
])

export const tenderSchema = z.object({
  title: z.string().min(10, 'Titel skal være mindst 10 tegn').max(200, 'Titel kan ikke være længere end 200 tegn'),
  description: z.string().min(50, 'Beskrivelse skal være mindst 50 tegn').max(2000, 'Beskrivelse kan ikke være længere end 2000 tegn'),
  category: z.string().min(1, 'Kategori er påkrævet'),
  estimated_value: z.number().min(0, 'Værdi skal være positiv'),
  currency: z.string().min(3, 'Valuta er påkrævet').max(3, 'Valuta skal være 3 tegn'),
  submission_deadline: z.string().min(1, 'Deadline er påkrævet'),
  publication_date: z.string().min(1, 'Publikationsdato er påkrævet'),
  espd_required: z.boolean().default(true),
  ted_published: z.boolean().default(false),
})

export const tenderSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  status: TenderStatusEnum.optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

export const tenderFilterSchema = z.object({
  categories: z.array(z.string()).optional(),
  statuses: z.array(TenderStatusEnum).optional(),
  value_range: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  date_range: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
})

export type TenderFormData = z.infer<typeof tenderSchema>
export type TenderSearchData = z.infer<typeof tenderSearchSchema>
export type TenderFilterData = z.infer<typeof tenderFilterSchema> 