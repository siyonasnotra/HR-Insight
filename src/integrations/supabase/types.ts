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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          assessment_id: string | null
          assigned_to: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: number
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: number
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: number
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          weight?: number
        }
        Relationships: []
      }
      assessment_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          question_id: string
          response_value: Json
          score: number | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          question_id: string
          response_value: Json
          score?: number | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          question_id?: string
          response_value?: Json
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          certification_level:
            | Database["public"]["Enums"]["certification_level"]
            | null
          certified_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          overall_score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          certified_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          overall_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          certified_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          overall_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_aggregates: {
        Row: {
          avg_score: number
          calculated_at: string
          category_id: string
          company_size: Database["public"]["Enums"]["company_size"]
          id: string
          industry: Database["public"]["Enums"]["industry_vertical"]
          percentile_25: number | null
          percentile_50: number | null
          percentile_75: number | null
          region: Database["public"]["Enums"]["region"]
          sample_count: number
        }
        Insert: {
          avg_score?: number
          calculated_at?: string
          category_id: string
          company_size: Database["public"]["Enums"]["company_size"]
          id?: string
          industry: Database["public"]["Enums"]["industry_vertical"]
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          region: Database["public"]["Enums"]["region"]
          sample_count?: number
        }
        Update: {
          avg_score?: number
          calculated_at?: string
          category_id?: string
          company_size?: Database["public"]["Enums"]["company_size"]
          id?: string
          industry?: Database["public"]["Enums"]["industry_vertical"]
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          region?: Database["public"]["Enums"]["region"]
          sample_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_aggregates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_scores: {
        Row: {
          assessment_id: string
          category_id: string
          created_at: string
          id: string
          max_possible_score: number
          percentage: number
          score: number
        }
        Insert: {
          assessment_id: string
          category_id: string
          created_at?: string
          id?: string
          max_possible_score?: number
          percentage?: number
          score?: number
        }
        Update: {
          assessment_id?: string
          category_id?: string
          created_at?: string
          id?: string
          max_possible_score?: number
          percentage?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_scores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          assessment_id: string
          certificate_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          issued_at: string
          level: Database["public"]["Enums"]["certification_level"]
          organization_id: string
          verification_code: string | null
        }
        Insert: {
          assessment_id: string
          certificate_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string
          level: Database["public"]["Enums"]["certification_level"]
          organization_id: string
          verification_code?: string | null
        }
        Update: {
          assessment_id?: string
          certificate_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string
          level?: Database["public"]["Enums"]["certification_level"]
          organization_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_size: Database["public"]["Enums"]["company_size"]
          created_at: string
          id: string
          industry: Database["public"]["Enums"]["industry_vertical"]
          logo_url: string | null
          name: string
          region: Database["public"]["Enums"]["region"]
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_size?: Database["public"]["Enums"]["company_size"]
          created_at?: string
          id?: string
          industry?: Database["public"]["Enums"]["industry_vertical"]
          logo_url?: string | null
          name: string
          region?: Database["public"]["Enums"]["region"]
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_size?: Database["public"]["Enums"]["company_size"]
          created_at?: string
          id?: string
          industry?: Database["public"]["Enums"]["industry_vertical"]
          logo_url?: string | null
          name?: string
          region?: Database["public"]["Enums"]["region"]
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          job_title: string | null
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          max_score: number
          options: Json | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          weight: number
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_score?: number
          options?: Json | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          weight?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_score?: number
          options?: Json | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_super_admin_users: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      action_status: "pending" | "in_progress" | "completed" | "overdue"
      app_role: "super_admin" | "hr_admin" | "hr_manager" | "viewer"
      assessment_status: "draft" | "in_progress" | "completed" | "certified"
      certification_level: "none" | "silver" | "gold" | "diamond"
      company_size:
        | "1_50"
        | "51_200"
        | "201_500"
        | "501_1000"
        | "1001_5000"
        | "5000_plus"
      industry_vertical:
        | "it_software"
        | "manufacturing"
        | "healthcare"
        | "banking_finance"
        | "retail"
        | "education"
        | "hospitality"
        | "automotive"
        | "pharma"
        | "telecom"
        | "other"
      question_type: "likert" | "yes_no" | "numeric" | "multi_select"
      region: "north" | "south" | "east" | "west" | "central" | "pan_india"
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
      action_status: ["pending", "in_progress", "completed", "overdue"],
      app_role: ["super_admin", "hr_admin", "hr_manager", "viewer"],
      assessment_status: ["draft", "in_progress", "completed", "certified"],
      certification_level: ["none", "silver", "gold", "diamond"],
      company_size: [
        "1_50",
        "51_200",
        "201_500",
        "501_1000",
        "1001_5000",
        "5000_plus",
      ],
      industry_vertical: [
        "it_software",
        "manufacturing",
        "healthcare",
        "banking_finance",
        "retail",
        "education",
        "hospitality",
        "automotive",
        "pharma",
        "telecom",
        "other",
      ],
      question_type: ["likert", "yes_no", "numeric", "multi_select"],
      region: ["north", "south", "east", "west", "central", "pan_india"],
    },
  },
} as const
