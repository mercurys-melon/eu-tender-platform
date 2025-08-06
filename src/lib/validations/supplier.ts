import { z } from 'zod'

export const supplierRegistrationSchema = z.object({
  company_name: z.string().min(2, 'Firmanavn skal være mindst 2 tegn').max(100, 'Firmanavn kan ikke være længere end 100 tegn'),
  cvr_number: z.string().regex(/^\d{8}$/, 'CVR-nummer skal være 8 cifre'),
  contact_person: z.string().min(2, 'Kontaktperson skal være mindst 2 tegn').max(100, 'Kontaktperson kan ikke være længere end 100 tegn'),
  email: z.string().email('Ugyldig email-adresse'),
  phone: z.string().min(8, 'Telefonnummer skal være mindst 8 cifre').max(15, 'Telefonnummer kan ikke være længere end 15 cifre'),
  address: z.string().min(5, 'Adresse skal være mindst 5 tegn').max(200, 'Adresse kan ikke være længere end 200 tegn'),
  city: z.string().min(2, 'By skal være mindst 2 tegn').max(50, 'By kan ikke være længere end 50 tegn'),
  postal_code: z.string().regex(/^\d{4}$/, 'Postnummer skal være 4 cifre'),
  country: z.string().min(2, 'Land skal være mindst 2 tegn').max(50, 'Land kan ikke være længere end 50 tegn'),
  categories: z.array(z.string()).min(1, 'Mindst én kategori skal vælges'),
  qualifications: z.array(z.string()).optional(),
})

export const supplierProfileSchema = z.object({
  company_name: z.string().min(2, 'Firmanavn skal være mindst 2 tegn').max(100, 'Firmanavn kan ikke være længere end 100 tegn'),
  cvr_number: z.string().regex(/^\d{8}$/, 'CVR-nummer skal være 8 cifre'),
  contact_person: z.string().min(2, 'Kontaktperson skal være mindst 2 tegn').max(100, 'Kontaktperson kan ikke være længere end 100 tegn'),
  email: z.string().email('Ugyldig email-adresse'),
  phone: z.string().min(8, 'Telefonnummer skal være mindst 8 cifre').max(15, 'Telefonnummer kan ikke være længere end 15 cifre'),
  address: z.string().min(5, 'Adresse skal være mindst 5 tegn').max(200, 'Adresse kan ikke være længere end 200 tegn'),
  city: z.string().min(2, 'By skal være mindst 2 tegn').max(50, 'By kan ikke være længere end 50 tegn'),
  postal_code: z.string().regex(/^\d{4}$/, 'Postnummer skal være 4 cifre'),
  country: z.string().min(2, 'Land skal være mindst 2 tegn').max(50, 'Land kan ikke være længere end 50 tegn'),
  categories: z.array(z.string()).min(1, 'Mindst én kategori skal vælges'),
  qualifications: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
})

export const supplierSearchSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  city: z.string().optional(),
})

export type SupplierRegistrationData = z.infer<typeof supplierRegistrationSchema>
export type SupplierProfileData = z.infer<typeof supplierProfileSchema>
export type SupplierSearchData = z.infer<typeof supplierSearchSchema> 