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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cardio_activities: {
        Row: {
          activity_date: string
          activity_type: string
          avg_pace: string | null
          calories: number | null
          created_at: string
          distance_km: number | null
          duration_minutes: number | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          avg_pace?: string | null
          calories?: number | null
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          avg_pace?: string | null
          calories?: number | null
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          entry_date: string
          id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string
          difficulty: string | null
          id: string
          last_reviewed: string | null
          next_review: string | null
          question: string
          subject_id: string | null
          times_correct: number | null
          times_wrong: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          difficulty?: string | null
          id?: string
          last_reviewed?: string | null
          next_review?: string | null
          question: string
          subject_id?: string | null
          times_correct?: number | null
          times_wrong?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          difficulty?: string | null
          id?: string
          last_reviewed?: string | null
          next_review?: string | null
          question?: string
          subject_id?: string | null
          times_correct?: number | null
          times_wrong?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfs: {
        Row: {
          ai_summary: string | null
          created_at: string
          extracted_text: string | null
          id: string
          page_count: number | null
          size_bytes: number | null
          storage_path: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          page_count?: number | null
          size_bytes?: number | null
          storage_path: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          page_count?: number | null
          size_bytes?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          daily_steps_goal: number | null
          favorite_subjects: string[] | null
          full_name: string | null
          goal: string | null
          id: string
          interests: string[] | null
          theme: string | null
          updated_at: string
          weekly_study_goal_minutes: number | null
          weekly_workout_goal: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          daily_steps_goal?: number | null
          favorite_subjects?: string[] | null
          full_name?: string | null
          goal?: string | null
          id: string
          interests?: string[] | null
          theme?: string | null
          updated_at?: string
          weekly_study_goal_minutes?: number | null
          weekly_workout_goal?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          daily_steps_goal?: number | null
          favorite_subjects?: string[] | null
          full_name?: string | null
          goal?: string | null
          id?: string
          interests?: string[] | null
          theme?: string | null
          updated_at?: string
          weekly_study_goal_minutes?: number | null
          weekly_workout_goal?: number | null
        }
        Relationships: []
      }
      step_logs: {
        Row: {
          active_minutes: number | null
          distance_km: number | null
          id: string
          log_date: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          distance_km?: number | null
          id?: string
          log_date?: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          distance_km?: number | null
          id?: string
          log_date?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string | null
          progress: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          priority?: string | null
          progress?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          priority?: string | null
          progress?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: string | null
          status: string | null
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed: boolean
          created_at: string
          exercise: string
          id: string
          notes: string | null
          position: number | null
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise: string
          id?: string
          notes?: string | null
          position?: number | null
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise?: string
          id?: string
          notes?: string | null
          position?: number | null
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed: boolean
          created_at: string
          duration_minutes: number | null
          id: string
          muscle_group: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          workout_date: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number | null
          id?: string
          muscle_group?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
          workout_date?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number | null
          id?: string
          muscle_group?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          workout_date?: string
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
