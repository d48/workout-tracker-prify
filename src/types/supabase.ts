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
      exercise_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string | null
          is_default: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      exercise_templates: {
        Row: {
          category_id: string | null
          created_at: string
          default_distance: number | null
          default_reps: number | null
          default_sets: number | null
          icon_name: string | null
          id: string
          is_custom: boolean
          name: string
          user_id: string | null
          deleted_category_name: string | null
          default_duration: number | null
          sample_url: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          default_distance?: number | null
          default_reps?: number | null
          default_sets?: number | null
          icon_name?: string | null
          id?: string
          is_custom?: boolean
          name: string
          user_id?: string | null
          default_duration?: number | null
          sample_url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          default_distance?: number | null
          default_reps?: number | null
          default_sets?: number | null
          icon_name?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          user_id?: string | null
          default_duration?: number | null
          sample_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_templates_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_templates_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      exercises: {
        Row: {
          created_at: string
          icon_name: string | null
          id: string
          name: string
          notes: string | null
          workout_id: string
          sample_url: string | null
        }
        Insert: {
          created_at?: string
          icon_name?: string | null
          id?: string
          name: string
          notes?: string | null
          workout_id: string
          sample_url?: string | null
        }
        Update: {
          created_at?: string
          icon_name?: string | null
          id?: string
          name?: string
          notes?: string | null
          workout_id?: string
          sample_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          }
        ]
      }
      sets: {
        Row: {
          completed: boolean
          created_at: string
          distance: number | null
          duration: number | null
          exercise_id: string
          id: string
          reps: number | null
          weight: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          distance?: number | null
          duration?: number | null
          exercise_id: string
          id?: string
          reps?: number | null
          weight?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          distance?: number | null
          duration?: number | null
          exercise_id?: string
          id?: string
          reps?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_exercise_id_fkey"
            columns: ["exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      personal_records: {
        Row: {
          id: string
          user_id: string
          exercise_name: string
          record_type: string
          record_value: number
          workout_id: string
          achieved_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_name: string
          record_type: string
          record_value: number
          workout_id: string
          achieved_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_name?: string
          record_type?: string
          record_value?: number
          workout_id?: string
          achieved_date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_id_fkey"
            columns: ["workout_id"]
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          }
        ]
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