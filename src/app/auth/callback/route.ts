import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token') // Sometimes Supabase sends token directly
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const type = requestUrl.searchParams.get('type') // 'recovery' for password reset
  
  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth callback - Full URL:', requestUrl.toString())
    console.log('Auth callback - Params:', { 
      code: code ? `${code.substring(0, 20)}...` : null, 
      token: token ? `${token.substring(0, 20)}...` : null, 
      type, 
      next, 
      error,
      errorCode,
      errorDescription,
      allParams: Object.fromEntries(requestUrl.searchParams.entries())
    })
  }

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
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && data.session) {
      // Check if this is a password recovery (either from type param or next param)
      const isPasswordRecovery = type === 'recovery' || next === '/update-password'
      
      if (isPasswordRecovery) {
        // For password recovery, always redirect to update-password page
        // The session is now set in cookies and will be available on the client
        const response = NextResponse.redirect(new URL('/update-password', request.url))
        return response
      }
      
      // Regular authentication, redirect to next or dashboard
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      // Handle exchange errors
      const errorParams = new URLSearchParams()
      errorParams.set('error', exchangeError?.message || 'Failed to exchange code for session')
      errorParams.set('error_code', exchangeError?.name || 'exchange_failed')
      
      return NextResponse.redirect(new URL(`/reset-password?${errorParams.toString()}`, request.url))
    }
  }

  // If no code or error, check if this might be a password recovery that needs client-side handling
  // In some cases, Supabase might redirect without a code, and the client needs to handle it
  if (next === '/update-password' || type === 'recovery') {
    // Redirect to update-password with all params so client can handle it
    const params = new URLSearchParams()
    requestUrl.searchParams.forEach((value, key) => {
      params.set(key, value)
    })
    return NextResponse.redirect(new URL(`/update-password?${params.toString()}`, request.url))
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
