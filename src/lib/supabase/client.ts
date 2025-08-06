import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      tenders: {
        Row: {
          id: string
          title: string
          description: string
          entity_id: string
          category: string
          estimated_value: number
          currency: string
          submission_deadline: string
          publication_date: string
          status: 'draft' | 'published' | 'closed' | 'awarded'
          espd_required: boolean
          ted_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          entity_id: string
          category: string
          estimated_value: number
          currency: string
          submission_deadline: string
          publication_date: string
          status?: 'draft' | 'published' | 'closed' | 'awarded'
          espd_required?: boolean
          ted_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          entity_id?: string
          category?: string
          estimated_value?: number
          currency?: string
          submission_deadline?: string
          publication_date?: string
          status?: 'draft' | 'published' | 'closed' | 'awarded'
          espd_required?: boolean
          ted_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          user_id: string
          company_name: string
          cvr_number: string
          contact_person: string
          email: string
          phone: string
          address: string
          city: string
          postal_code: string
          country: string
          categories: string[]
          qualifications: string[]
          documents: string[]
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          cvr_number: string
          contact_person: string
          email: string
          phone: string
          address: string
          city: string
          postal_code: string
          country: string
          categories?: string[]
          qualifications?: string[]
          documents?: string[]
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          cvr_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          city?: string
          postal_code?: string
          country?: string
          categories?: string[]
          qualifications?: string[]
          documents?: string[]
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          tender_id: string
          supplier_id: string
          amount: number
          currency: string
          documents: string[]
          espd_data: object
          status: 'submitted' | 'under_review' | 'accepted' | 'rejected'
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tender_id: string
          supplier_id: string
          amount: number
          currency: string
          documents?: string[]
          espd_data?: object
          status?: 'submitted' | 'under_review' | 'accepted' | 'rejected'
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tender_id?: string
          supplier_id?: string
          amount?: number
          currency?: string
          documents?: string[]
          espd_data?: object
          status?: 'submitted' | 'under_review' | 'accepted' | 'rejected'
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          name: string
          type: string
          size: number
          url: string
          tender_id?: string
          supplier_id?: string
          bid_id?: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          size: number
          url: string
          tender_id?: string
          supplier_id?: string
          bid_id?: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          size?: number
          url?: string
          tender_id?: string
          supplier_id?: string
          bid_id?: string
          uploaded_by?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'success' | 'warning' | 'error'
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          read?: boolean
          created_at?: string
        }
      }
    }
  }
} 