import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' | 'signup' | 'magiclink'
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  // Handle error params from Supabase redirect
  if (error || errorCode) {
    const params = new URLSearchParams()
    if (error) params.set('error', error)
    if (errorCode) params.set('error_code', errorCode)
    if (errorDescription) params.set('error_description', errorDescription)
    return NextResponse.redirect(`${origin}/reset-password?${params}`)
  }

  if (!code) {
    // No code and no error – for recovery without code, send to update-password
    if (type === 'recovery') return NextResponse.redirect(`${origin}/update-password`)
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = createClient()
  const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const params = new URLSearchParams({ error: exchangeError.message })
    return NextResponse.redirect(`${origin}/reset-password?${params}`)
  }

  // Password recovery: always go to update-password (never to dashboard)
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`)
  }

  // Email verification / signup / magic link: redirect to role dashboard
  const userId = data.session?.user?.id
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', userId)
      .single()

    const target = profile?.active_role === 'supplier' ? '/tilbudsgiver' : '/ordregiver'
    return NextResponse.redirect(`${origin}${target}`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
