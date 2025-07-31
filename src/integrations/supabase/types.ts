export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      active_procedures: {
        Row: {
          actual_duration_minutes: number | null
          appointment_id: string
          case_id: string
          completed_at: string | null
          complications: Json | null
          created_at: string
          estimated_duration_minutes: number | null
          id: string
          materials_used: Json | null
          notes: string | null
          patient_id: string | null
          procedure_type: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          appointment_id: string
          case_id: string
          completed_at?: string | null
          complications?: Json | null
          created_at?: string
          estimated_duration_minutes?: number | null
          id?: string
          materials_used?: Json | null
          notes?: string | null
          patient_id?: string | null
          procedure_type: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_duration_minutes?: number | null
          appointment_id?: string
          case_id?: string
          completed_at?: string | null
          complications?: Json | null
          created_at?: string
          estimated_duration_minutes?: number | null
          id?: string
          materials_used?: Json | null
          notes?: string | null
          patient_id?: string | null
          procedure_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      analysis_reports: {
        Row: {
          analysis_data: Json | null
          confidence_score: number
          generated_at: string
          id: string
          report_type: string
          requires_action: boolean | null
          risk_level: string
        }
        Insert: {
          analysis_data?: Json | null
          confidence_score: number
          generated_at?: string
          id?: string
          report_type: string
          requires_action?: boolean | null
          risk_level: string
        }
        Update: {
          analysis_data?: Json | null
          confidence_score?: number
          generated_at?: string
          id?: string
          report_type?: string
          requires_action?: boolean | null
          risk_level?: string
        }
        Relationships: []
      }
      lab_materials: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          last_ordered_at: string | null
          material_name: string
          minimum_threshold: number
          supplier: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          last_ordered_at?: string | null
          material_name: string
          minimum_threshold?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          last_ordered_at?: string | null
          material_name?: string
          minimum_threshold?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lab_production_queue: {
        Row: {
          actual_duration: string | null
          created_at: string
          estimated_duration: string | null
          id: string
          is_urgent: boolean | null
          job_code: string
          job_type: string
          machine_assignment: string | null
          material_requirements: Json | null
          patient_eta: string | null
          patient_id: string | null
          priority: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_duration?: string | null
          created_at?: string
          estimated_duration?: string | null
          id?: string
          is_urgent?: boolean | null
          job_code: string
          job_type: string
          machine_assignment?: string | null
          material_requirements?: Json | null
          patient_eta?: string | null
          patient_id?: string | null
          priority?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_duration?: string | null
          created_at?: string
          estimated_duration?: string | null
          id?: string
          is_urgent?: boolean | null
          job_code?: string
          job_type?: string
          machine_assignment?: string | null
          material_requirements?: Json | null
          patient_eta?: string | null
          patient_id?: string | null
          priority?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_production_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          digital_twin_id: string | null
          id: string
          patient_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          digital_twin_id?: string | null
          id?: string
          patient_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          digital_twin_id?: string | null
          id?: string
          patient_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      procedure_events: {
        Row: {
          appointment_id: string
          case_id: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          patient_id: string | null
          processed: boolean | null
          timestamp: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          case_id: string
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          patient_id?: string | null
          processed?: boolean | null
          timestamp?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          case_id?: string
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          patient_id?: string | null
          processed?: boolean | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
