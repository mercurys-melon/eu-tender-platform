/* eslint-disable react/no-unescaped-entities */
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setAuthState({ error: sessionError.message })
          setLoading(false)
          return
        }

        if (!session) {
          setAuthState({ 
            authenticated: false, 
            message: 'No active session - user not logged in' 
          })
          setLoading(false)
          return
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        setAuthState({
          authenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email,
            role: profile?.role || 'No role assigned',
            profileExists: !!profile,
            profileError: profileError?.message
          }
        })
      } catch (error) {
        setAuthState({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [supabase])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Authentication</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Authentication</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
        
        {authState?.error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {authState.error}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <strong>Authenticated:</strong> {authState?.authenticated ? 'Yes' : 'No'}
            </div>
            
            {authState?.authenticated && authState?.user && (
              <>
                <div>
                  <strong>User ID:</strong> {authState.user.id}
                </div>
                <div>
                  <strong>Email:</strong> {authState.user.email}
                </div>
                <div>
                  <strong>Role:</strong> {authState.user.role}
                </div>
                <div>
                  <strong>Profile Exists:</strong> {authState.user.profileExists ? 'Yes' : 'No'}
                </div>
                {authState.user.profileError && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <strong>Profile Error:</strong> {authState.user.profileError}
                  </div>
                )}
              </>
            )}
            
            {!authState?.authenticated && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <p><strong>To access /supplier:</strong></p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>You need to be logged in</li>
                  <li>Your profile must have role = 'supplier'</li>
                  <li>Go to <a href="/login" className="underline">/login</a> to sign in</li>
                  <li>Or go to <a href="/signup" className="underline">/register</a> to create an account</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 space-x-4">
        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Go to Login
        </a>
        <a href="/signup" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Go to Register
        </a>
        <a href="/supplier" className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          Try /supplier
        </a>
      </div>
    </div>
  )
}
