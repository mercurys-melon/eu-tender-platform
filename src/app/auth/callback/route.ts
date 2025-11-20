import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Handle error cases first
  if (error || errorCode) {
    // Redirect to reset-password page with error information
    const errorParams = new URLSearchParams()
    if (error) errorParams.set('error', error)
    if (errorCode) errorParams.set('error_code', errorCode)
    if (errorDescription) errorParams.set('error_description', errorDescription)
    
    return NextResponse.redirect(new URL(`/reset-password?${errorParams.toString()}`, request.url))
  }

  if (code) {
    const supabase = createClient()
    
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError) {
      // Check if this is a password recovery
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && user.aud === 'authenticated') {
        // Redirect to update-password page for password recovery
        return NextResponse.redirect(new URL('/update-password', request.url))
      }
      
      // Regular authentication, redirect to next or dashboard
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      // Handle exchange errors
      const errorParams = new URLSearchParams()
      errorParams.set('error', exchangeError.message)
      errorParams.set('error_code', exchangeError.name || 'exchange_failed')
      
      return NextResponse.redirect(new URL(`/reset-password?${errorParams.toString()}`, request.url))
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
