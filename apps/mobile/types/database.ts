// Tipi generati dallo schema Supabase.
// Rigenerare con:
//   npx supabase gen types typescript --project-id vufwcrgdoheirjyowyaf > types/database.ts
// (oppure via Supabase MCP `generate_typescript_types`).
// In fondo al file ci sono gli alias shorthand e gli enum usati dai componenti.

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
      budgets: {
        Row: {
          amount: number
          category: string
          couple_id: string
          created_at: string
          id: string
          month: number
          year: number
        }
        Insert: {
          amount: number
          category: string
          couple_id: string
          created_at?: string
          id?: string
          month: number
          year: number
        }
        Update: {
          amount?: number
          category?: string
          couple_id?: string
          created_at?: string
          id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_prompts: {
        Row: {
          active: boolean
          couple_id: string | null
          created_at: string
          id: string
          period_type: Database["public"]["Enums"]["checkin_period"]
          source: Database["public"]["Enums"]["prompt_source"]
          text: string
        }
        Insert: {
          active?: boolean
          couple_id?: string | null
          created_at?: string
          id?: string
          period_type: Database["public"]["Enums"]["checkin_period"]
          source?: Database["public"]["Enums"]["prompt_source"]
          text: string
        }
        Update: {
          active?: boolean
          couple_id?: string | null
          created_at?: string
          id?: string
          period_type?: Database["public"]["Enums"]["checkin_period"]
          source?: Database["public"]["Enums"]["prompt_source"]
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_prompts_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          mood1: number | null
          mood2: number | null
          period_type: Database["public"]["Enums"]["checkin_period"]
          prompt: string
          response1: string | null
          response2: string | null
          revealed: boolean
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          mood1?: number | null
          mood2?: number | null
          period_type: Database["public"]["Enums"]["checkin_period"]
          prompt: string
          response1?: string | null
          response2?: string | null
          revealed?: boolean
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          mood1?: number | null
          mood2?: number | null
          period_type?: Database["public"]["Enums"]["checkin_period"]
          prompt?: string
          response1?: string | null
          response2?: string | null
          revealed?: boolean
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          id: string
          name: string | null
          split_mode: Database["public"]["Enums"]["split_mode"]
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          split_mode?: Database["public"]["Enums"]["split_mode"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          split_mode?: Database["public"]["Enums"]["split_mode"]
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          color: string | null
          couple_id: string
          created_at: string
          creator_id: string
          description: string | null
          end_at: string
          google_event_id: string | null
          id: string
          location: string | null
          recurrence: string | null
          reminder_minutes: number[] | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          couple_id: string
          created_at?: string
          creator_id: string
          description?: string | null
          end_at: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          recurrence?: string | null
          reminder_minutes?: number[] | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          couple_id?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          end_at?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          recurrence?: string | null
          reminder_minutes?: number[] | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          couple_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          paid_by_id: string
        }
        Insert: {
          amount: number
          category: string
          couple_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          paid_by_id: string
        }
        Update: {
          amount?: number
          category?: string
          couple_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          paid_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_id_fkey"
            columns: ["paid_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          saved_amount: number
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          saved_amount?: number
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          saved_amount?: number
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          couple_id: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          couple_id: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          couple_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          author_id: string
          content: string | null
          couple_id: string
          created_at: string
          date: string
          id: string
          photos: string[]
          tags: string[]
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          couple_id: string
          created_at?: string
          date?: string
          id?: string
          photos?: string[]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          couple_id?: string
          created_at?: string
          date?: string
          id?: string
          photos?: string[]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          couple_id: string
          created_at: string
          entity_id: string | null
          id: string
          read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          couple_id: string
          created_at?: string
          entity_id?: string | null
          id?: string
          read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          couple_id?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          category: Database["public"]["Enums"]["pantry_category"]
          couple_id: string
          created_at: string
          expires_at: string | null
          id: string
          name: string
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["pantry_category"]
          couple_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["pantry_category"]
          couple_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          couple_id: string
          created_at: string
          id: string
          pinned: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          couple_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          couple_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          name: string
          quantity: string | null
          recipe_id: string
        }
        Insert: {
          id?: string
          name: string
          quantity?: string | null
          recipe_id: string
        }
        Update: {
          id?: string
          name?: string
          quantity?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          couple_id: string
          created_at: string
          description: string | null
          id: string
          servings: number | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          description?: string | null
          id?: string
          servings?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          description?: string | null
          id?: string
          servings?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          category: Database["public"]["Enums"]["pantry_category"]
          checked: boolean
          couple_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["pantry_category"]
          checked?: boolean
          couple_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["pantry_category"]
          checked?: boolean
          couple_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_items: {
        Row: {
          assignee_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          list_id: string
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["todo_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          list_id: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["todo_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          list_id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["todo_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "todo_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_lists: {
        Row: {
          couple_id: string
          created_at: string
          emoji: string | null
          id: string
          name: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_lists_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          couple_id: string | null
          created_at: string
          email: string
          google_id: string | null
          id: string
          name: string | null
          push_tokens: string[]
          salary: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          couple_id?: string | null
          created_at?: string
          email: string
          google_id?: string | null
          id: string
          name?: string | null
          push_tokens?: string[]
          salary?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          couple_id?: string | null
          created_at?: string
          email?: string
          google_id?: string | null
          id?: string
          name?: string | null
          push_tokens?: string[]
          salary?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_couple: { Args: { couple_name?: string }; Returns: Json }
      get_couple_id: { Args: never; Returns: string }
      join_couple_by_code: { Args: { invite_code: string }; Returns: string }
    }
    Enums: {
      checkin_period: "weekly" | "monthly" | "yearly"
      pantry_category: "FRIDGE" | "FREEZER" | "PANTRY" | "BATHROOM" | "OTHER"
      priority_level: "LOW" | "MEDIUM" | "HIGH"
      prompt_source: "SYSTEM" | "CUSTOM"
      split_mode: "EQUAL" | "PROPORTIONAL"
      todo_status: "TODO" | "IN_PROGRESS" | "DONE"
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
      checkin_period: ["weekly", "monthly", "yearly"],
      pantry_category: ["FRIDGE", "FREEZER", "PANTRY", "BATHROOM", "OTHER"],
      priority_level: ["LOW", "MEDIUM", "HIGH"],
      prompt_source: ["SYSTEM", "CUSTOM"],
      split_mode: ["EQUAL", "PROPORTIONAL"],
      todo_status: ["TODO", "IN_PROGRESS", "DONE"],
    },
  },
} as const

// ─────────────────────────────────────────
// Shorthand types (usati nei componenti) — non generati da Supabase.
// ─────────────────────────────────────────

// Enum
export type SplitMode = Enums<"split_mode">;
export type PriorityLevel = Enums<"priority_level">;
export type TodoStatus = Enums<"todo_status">;
export type PantryCategory = Enums<"pantry_category">;
export type CheckinPeriod = Enums<"checkin_period">;
export type PromptSource = Enums<"prompt_source">;
// La colonna notifications.type è `text` nel DB; questi sono i valori emessi dai trigger.
// I primi quattro valori arrivano dai trigger su posts/events/expenses/todo_items,
// gli ultimi tre dai promemoria giornalieri della Edge Function daily-cron.
export type NotificationType =
  | "post"
  | "event"
  | "expense"
  | "todo"
  | "pantry"
  | "memory"
  | "todo_due";

// Tabelle
export type User = Tables<"users">;
export type Couple = Tables<"couples">;
export type Post = Tables<"posts">;
export type Reaction = Tables<"reactions">;
export type Event = Tables<"events">;
export type TodoList = Tables<"todo_lists">;
export type TodoItem = Tables<"todo_items">;
export type PantryItem = Tables<"pantry_items">;
export type ShoppingItem = Tables<"shopping_items">;
export type Recipe = Tables<"recipes">;
export type Expense = Tables<"expenses">;
export type Budget = Tables<"budgets">;
export type FinancialGoal = Tables<"financial_goals">;
export type CheckIn = Tables<"check_ins">;
export type Memory = Tables<"memories">;
export type Notification = Tables<"notifications">;
