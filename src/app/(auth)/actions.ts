'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getActionClient } from '@/lib/supabase/server'

// ── Error mapping ─────────────────────────────────────────────────────────────

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Forkert email eller adgangskode'
  if (message.includes('Email not confirmed')) return 'Din email er ikke bekræftet. Tjek din indbakke.'
  if (message.includes('User already registered')) return 'Der findes allerede en konto med denne email'
  if (message.includes('over_email_send_rate_limit') || message.includes('rate limit') || message.includes('too many'))
    return 'For mange forsøg. Prøv igen om et øjeblik.'
  if (message.includes('Password should be at least') || message.includes('password'))
    return 'Adgangskoden skal være mindst 8 tegn'
  return 'Der opstod en uventet fejl. Prøv igen.'
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email('Ugyldig email-adresse'),
  password: z.string().min(1, 'Adgangskode er påkrævet'),
})

const SignupSchema = z
  .object({
    full_name: z.string().min(2, 'Fuldt navn skal være mindst 2 tegn'),
    email: z.string().email('Ugyldig email-adresse'),
    password: z.string().min(8, 'Adgangskoden skal være mindst 8 tegn'),
    confirm_password: z.string(),
    terms: z.literal('on', { errorMap: () => ({ message: 'Du skal acceptere vilkårene for at fortsætte' }) }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Adgangskoderne matcher ikke',
    path: ['confirm_password'],
  })

const RequestPasswordResetSchema = z.object({
  email: z.string().email('Ugyldig email-adresse'),
})

const UpdatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Adgangskoden skal være mindst 8 tegn'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Adgangskoderne matcher ikke',
    path: ['confirm_password'],
  })

// ── Action return type ────────────────────────────────────────────────────────

export type ActionState = { error: string } | null

// ── login ─────────────────────────────────────────────────────────────────────

export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = getActionClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) return { error: mapAuthError(error.message) }
  if (!data.user) return { error: 'Login fejlede. Prøv igen.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', data.user.id)
    .single()

  redirect(profile?.active_role === 'supplier' ? '/tilbudsgiver' : '/ordregiver')
}

// ── signup ────────────────────────────────────────────────────────────────────

export async function signup(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = SignupSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
    terms: formData.get('terms'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = getActionClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // handle_new_user trigger reads full_name from raw_user_meta_data
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?type=signup`,
    },
  })

  if (error) return { error: mapAuthError(error.message) }

  redirect('/verify-email')
}

// ── requestPasswordReset ──────────────────────────────────────────────────────

export async function requestPasswordReset(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = RequestPasswordResetSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = getActionClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?type=recovery`,
  })

  // Never reveal whether the email exists – always redirect on both success and most errors
  if (error && (error.message.includes('rate limit') || error.message.includes('too many'))) {
    return { error: 'For mange forsøg. Prøv igen om et øjeblik.' }
  }

  redirect('/reset-password?sent=1')
}

// ── updatePassword ────────────────────────────────────────────────────────────

export async function updatePassword(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = UpdatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = getActionClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return { error: mapAuthError(error.message) }

  redirect('/login?message=Adgangskode+opdateret')
}

// ── logout ────────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = getActionClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ── switchActiveRole ──────────────────────────────────────────────────────────

export async function switchActiveRole() {
  const supabase = getActionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const newRole = profile.active_role === 'buyer' ? 'supplier' : 'buyer'

  await supabase
    .from('profiles')
    .update({ active_role: newRole })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
  redirect(newRole === 'buyer' ? '/ordregiver' : '/tilbudsgiver')
}
