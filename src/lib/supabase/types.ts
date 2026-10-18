export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      bids: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          documents: string[] | null
          espd_data: Json | null
          id: string
          status: string
          submitted_at: string
          supplier_id: string
          tender_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          documents?: string[] | null
          espd_data?: Json | null
          id?: string
          status?: string
          submitted_at?: string
          supplier_id: string
          tender_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          documents?: string[] | null
          espd_data?: Json | null
          id?: string
          status?: string
          submitted_at?: string
          supplier_id?: string
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          is_default: boolean
          organisation_id: string
          profile_id: string
          role: Database["public"]["Enums"]["organisation_member_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          is_default?: boolean
          organisation_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["organisation_member_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          is_default?: boolean
          organisation_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["organisation_member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_types: {
        Row: {
          code: string
          created_at: string
          description_da: string | null
          name_da: string
          name_en: string
          regulatory_reference: string | null
          requires_cvr: boolean
        }
        Insert: {
          code: string
          created_at?: string
          description_da?: string | null
          name_da: string
          name_en: string
          regulatory_reference?: string | null
          requires_cvr?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          description_da?: string | null
          name_da?: string
          name_en?: string
          regulatory_reference?: string | null
          requires_cvr?: boolean
        }
        Relationships: []
      }
      organisations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          created_by: string | null
          cvr: string
          id: string
          is_active: boolean
          name: string
          postal_code: string | null
          type_code: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          cvr: string
          id?: string
          is_active?: boolean
          name: string
          postal_code?: string | null
          type_code: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          cvr?: string
          id?: string
          is_active?: boolean
          name?: string
          postal_code?: string | null
          type_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "organisation_types"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          active_role: string
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          active_role?: string
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          active_role?: string
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_organisation_users: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["supplier_member_role"]
          supplier_organisation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["supplier_member_role"]
          supplier_organisation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["supplier_member_role"]
          supplier_organisation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_organisation_users_supplier_organisation_id_fkey"
            columns: ["supplier_organisation_id"]
            isOneToOne: false
            referencedRelation: "supplier_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_organisations: {
        Row: {
          address: Json | null
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          created_by: string | null
          cvr_number: string | null
          foreign_id: string | null
          id: string
          is_legacy_personal: boolean
          legal_name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          cvr_number?: string | null
          foreign_id?: string | null
          id?: string
          is_legacy_personal?: boolean
          legal_name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          cvr_number?: string | null
          foreign_id?: string | null
          id?: string
          is_legacy_personal?: boolean
          legal_name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      tender_documents: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          is_public: boolean
          mime_type: string
          size_bytes: number
          storage_path: string
          tender_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          is_public?: boolean
          mime_type: string
          size_bytes: number
          storage_path: string
          tender_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          is_public?: boolean
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_questions: {
        Row: {
          answer_text: string | null
          asked_by: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          is_anonymized: boolean
          is_published: boolean
          question_text: string
          question_text_public: string
          tender_id: string
          updated_at: string
        }
        Insert: {
          answer_text?: string | null
          asked_by?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_anonymized?: boolean
          is_published?: boolean
          question_text: string
          question_text_public?: string
          tender_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          asked_by?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_anonymized?: boolean
          is_published?: boolean
          question_text?: string
          question_text_public?: string
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_questions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          entity_id: string
          espd_required: boolean
          estimated_value: number
          id: string
          organisation_id: string | null
          publication_date: string
          status: string
          submission_deadline: string
          ted_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          entity_id: string
          espd_required?: boolean
          estimated_value: number
          id?: string
          organisation_id?: string | null
          publication_date?: string
          status?: string
          submission_deadline: string
          ted_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          entity_id?: string
          espd_required?: boolean
          estimated_value?: number
          id?: string
          organisation_id?: string | null
          publication_date?: string
          status?: string
          submission_deadline?: string
          ted_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_bid_metadata_for_tender: {
        Args: { p_tender_id: string }
        Returns: {
          bid_id: string
          created_at: string
          status: string
          submitted_at: string
          supplier_id: string
        }[]
      }
      get_my_admin_organisation_ids: { Args: never; Returns: string[] }
      get_my_organisation_ids: { Args: never; Returns: string[] }
      get_my_owner_organisation_ids: { Args: never; Returns: string[] }
      get_my_owner_supplier_organisation_ids: { Args: never; Returns: string[] }
      get_my_supplier_organisation_ids: { Args: never; Returns: string[] }
      update_bid_status: {
        Args: { p_bid_id: string; p_new_status: string }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          documents: string[] | null
          espd_data: Json | null
          id: string
          status: string
          submitted_at: string
          supplier_id: string
          tender_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bids"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      organisation_member_role: "owner" | "admin" | "editor" | "viewer"
      supplier_member_role: "owner" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      organisation_member_role: ["owner", "admin", "editor", "viewer"],
      supplier_member_role: ["owner", "member"],
    },
  },
} as const
