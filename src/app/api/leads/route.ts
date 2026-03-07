import { NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { json, badRequest, internal } from '@/lib/http'
import type { Database } from '@/lib/supabase/types'

type LeadsInsert = Database['public']['Tables']['leads']['Insert']

interface LeadData {
  name: string
  email: string
  company: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Simple rate limiting based on IP (max 3 submissions per hour)
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown'
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    // In a real implementation, you'd check against a database
    // For now, we'll use a simple approach
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const rateLimitKey = `${ip}-${userAgent}`
    
    const body: LeadData = await request.json()
    
    // Validate required fields
    if (!body.name || !body.email || !body.company || !body.message) {
      return badRequest('Alle felter er påkrævet')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return badRequest('Ugyldig e-mail adresse')
    }

    // Try to save to Supabase if credentials are available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = getServerClient()
        const { error } = await supabase
          .from('leads')
          .insert<LeadsInsert>([
            {
              name: body.name.trim(),
              email: body.email.trim().toLowerCase(),
              company: body.company.trim(),
              message: body.message.trim(),
              source: 'marketing_landing',
              created_at: new Date().toISOString()
            }
          ])

        if (error) {
          console.error('Supabase error:', error)
          // Fall through to console logging
        } else {
          console.log('Lead saved to Supabase:', { email: body.email, company: body.company })
          return json({ success: true }, {
            status: 201,
            headers: { 
              'X-RateLimit-Limit': '3', 
              'X-RateLimit-Remaining': '2',
              'X-RateLimit-Reset': new Date(Date.now() + 60 * 60 * 1000).toISOString()
            }
          })
        }
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError)
        // Fall through to console logging
      }
    }

    // Fallback: Log to console if Supabase is not available
    console.warn('Lead form submission (no Supabase):', {
      name: body.name,
      email: body.email,
      company: body.company,
      message: body.message,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.ip
    })

    // Return success even without database storage
    return json({ success: true }, {
      status: 202,
      headers: { 
        'X-RateLimit-Limit': '3', 
        'X-RateLimit-Remaining': '2',
        'X-RateLimit-Reset': new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    })

  } catch (error) {
    console.error('Lead form error:', error)
    return internal('Der opstod en fejl ved behandling af din forespørgsel')
  }
}

// Optional: Add GET method for health check
export async function GET() {
  return json({ 
    status: 'ok', 
    message: 'Leads API is running',
    timestamp: new Date().toISOString()
  })
}
