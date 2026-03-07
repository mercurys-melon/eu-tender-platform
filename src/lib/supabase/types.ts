// Minimal Database typings (midlertidigt til build er grønt)
export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      tenders: {
        Row: {
          id: string; title: string; description: string; entity_id: string;
          category: string | null; estimated_value: number | null; currency: string | null;
          submission_deadline: string | null; publication_date: string | null; status: string | null;
          awarded_bid_id: string | null; evaluation_started_at: string | null; evaluation_completed_at: string | null;
          evaluation_documents: string[] | null; created_at: string; created_by: string | null;
        }
        Insert: Partial<Database['public']['Tables']['tenders']['Row']> & {
          id?: string; title: string; description: string; entity_id: string;
        }
        Update: Partial<Database['public']['Tables']['tenders']['Row']>
      }
      bids: {
        Row: {
          id: string; tender_id: string; supplier_id: string;
          amount: number | null; currency: string | null; documents: string[] | null;
          status: 'submitted'|'under_review'|'under_evaluation'|'accepted'|'rejected'|'winner'|'not_awarded';
          evaluation_notes: string | null; submitted_at: string | null; created_at: string; updated_at: string | null;
        }
        Insert: Partial<Database['public']['Tables']['bids']['Row']> & { tender_id: string; supplier_id: string }
        Update: Partial<Database['public']['Tables']['bids']['Row']>
      }
      tender_questions: {
        Row: {
          id: string; tender_id: string; asked_by: string | null; question_text: string; question_text_public: string | null;
          answer_text: string | null; is_published: boolean; is_anonymized: boolean; contact_email: string | null; contact_name: string | null;
          created_at: string; updated_at: string | null;
        }
        Insert: Partial<Database['public']['Tables']['tender_questions']['Row']> & { tender_id: string; question_text: string }
        Update: Partial<Database['public']['Tables']['tender_questions']['Row']>
      }
      tender_documents: {
        Row: {
          id: string; tender_id: string; storage_path: string; file_name: string; mime_type: string;
          size_bytes: number; created_by: string; created_at: string;
        }
        Insert: {
          id?: string; tender_id: string; storage_path: string; file_name: string; mime_type: string; size_bytes: number;
          created_by?: string; created_at?: string; /* udfyldes af trigger/RLS */
        }
        Update: Partial<Database['public']['Tables']['tender_documents']['Row']>
      }
      leads: {
        Row: { id: string; name: string; email: string; company: string; message: string; source: string | null; created_at: string }
        Insert: Partial<Database['public']['Tables']['leads']['Row']> & { name: string; email: string; company: string; message: string }
        Update: Partial<Database['public']['Tables']['leads']['Row']>
      }
      profiles: {
        Row: { id: string; role: 'supplier' | 'buyer'; created_at: string | null; updated_at: string | null }
        Insert: { id: string; role: 'supplier' | 'buyer'; created_at?: string | null; updated_at?: string | null }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      publication_jobs: {
        Row: {
          id: string; tender_id: string; status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
          payload_version: number; request_id: string | null; payload: Json; response: Json | null;
          last_error: string | null; attempts: number; max_attempts: number;
          next_retry_at: string | null; created_at: string; updated_at: string; completed_at: string | null;
        }
        Insert: Partial<Database['public']['Tables']['publication_jobs']['Row']> & {
          tender_id: string; payload: Json; request_id: string;
        }
        Update: Partial<Database['public']['Tables']['publication_jobs']['Row']>
      }
    }
  }
}
