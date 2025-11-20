export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          created_by?: string
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
          created_by?: string
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
          created_by?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
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
          espd_data: Json
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
          espd_data?: Json
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
          espd_data?: Json
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
      tender_questions: {
        Row: {
          id: string
          tender_id: string
          asked_by: string | null
          question_text: string
          question_text_public: string
          answer_text: string | null
          is_published: boolean
          is_anonymized: boolean
          contact_email: string | null
          contact_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tender_id: string
          asked_by?: string | null
          question_text: string
          question_text_public?: string
          answer_text?: string | null
          is_published?: boolean
          is_anonymized?: boolean
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tender_id?: string
          asked_by?: string | null
          question_text?: string
          question_text_public?: string
          answer_text?: string | null
          is_published?: boolean
          is_anonymized?: boolean
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tender_documents: {
        Row: {
          id: string
          tender_id: string
          storage_path: string
          file_name: string
          mime_type: string
          size_bytes: number
          is_public: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          tender_id: string
          storage_path: string
          file_name: string
          mime_type: string
          size_bytes: number
          is_public?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          tender_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string
          size_bytes?: number
          is_public?: boolean
          created_by?: string
          created_at?: string
        }
      }
    }
  }
}

