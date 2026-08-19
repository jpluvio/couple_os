// Types generated from the Supabase schema.
// Regenerate with:
//   npx supabase gen types typescript --project-id vufwcrgdoheirjyowyaf > types/database.ts
// (or via the Supabase MCP `generate_typescript_types`).
// The shorthand aliases and enums used by the components are at the bottom.

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
      budget_periods: {
        Row: {
          closed_at: string | null
          couple_id: string
          created_at: string
          expected_income: number
          id: string
          note: string | null
          period_key: string
          rollover_enabled: boolean
          status: Database["public"]["Enums"]["budget_period_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          couple_id: string
          created_at?: string
          expected_income?: number
          id?: string
          note?: string | null
          period_key: string
          rollover_enabled?: boolean
          status?: Database["public"]["Enums"]["budget_period_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          couple_id?: string
          created_at?: string
          expected_income?: number
          id?: string
          note?: string | null
          period_key?: string
          rollover_enabled?: boolean
          status?: Database["public"]["Enums"]["budget_period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_periods_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          archived: boolean
          color: string | null
          couple_id: string | null
          created_at: string
          emoji: string | null
          id: string
          kind: Database["public"]["Enums"]["expense_kind"]
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          couple_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["expense_kind"]
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          couple_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["expense_kind"]
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_shares: {
        Row: {
          expense_id: string
          member_id: string
          share_amount: number
        }
        Insert: {
          expense_id: string
          member_id: string
          share_amount: number
        }
        Update: {
          expense_id?: string
          member_id?: string
          share_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_shares_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          active: boolean
          avatar_emoji: string | null
          color: string | null
          couple_id: string
          created_at: string
          custom_share: number | null
          display_name: string
          id: string
          monthly_income: number | null
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          avatar_emoji?: string | null
          color?: string | null
          couple_id: string
          created_at?: string
          custom_share?: number | null
          display_name: string
          id?: string
          monthly_income?: number | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          avatar_emoji?: string | null
          color?: string | null
          couple_id?: string
          created_at?: string
          custom_share?: number | null
          display_name?: string
          id?: string
          monthly_income?: number | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          active: boolean
          amount: number
          auto_post: boolean
          category_id: string
          couple_id: string
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_freq"]
          id: string
          label: string
          last_posted_occurrence: string | null
          note: string | null
          paid_by_member_id: string | null
          pending_occurrence: string | null
          start_date: string
          updated_at: string
          variable_amount: boolean
        }
        Insert: {
          active?: boolean
          amount: number
          auto_post?: boolean
          category_id: string
          couple_id: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          label: string
          last_posted_occurrence?: string | null
          note?: string | null
          paid_by_member_id?: string | null
          pending_occurrence?: string | null
          start_date: string
          updated_at?: string
          variable_amount?: boolean
        }
        Update: {
          active?: boolean
          amount?: number
          auto_post?: boolean
          category_id?: string
          couple_id?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          label?: string
          last_posted_occurrence?: string | null
          note?: string | null
          paid_by_member_id?: string | null
          pending_occurrence?: string | null
          start_date?: string
          updated_at?: string
          variable_amount?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_paid_by_member_id_fkey"
            columns: ["paid_by_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          budget_period_id: string | null
          carried_amount: number
          category: string | null
          category_id: string | null
          couple_id: string
          created_at: string
          id: string
          month: number | null
          period_key: string | null
          rollover_enabled: boolean
          updated_at: string
          year: number | null
        }
        Insert: {
          amount: number
          budget_period_id?: string | null
          carried_amount?: number
          category?: string | null
          category_id?: string | null
          couple_id: string
          created_at?: string
          id?: string
          month?: number | null
          period_key?: string | null
          rollover_enabled?: boolean
          updated_at?: string
          year?: number | null
        }
        Update: {
          amount?: number
          budget_period_id?: string | null
          carried_amount?: number
          category?: string | null
          category_id?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          month?: number | null
          period_key?: string | null
          rollover_enabled?: boolean
          updated_at?: string
          year?: number | null
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
          category: string | null
          category_id: string | null
          couple_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          occurrence_date: string | null
          paid_by_id: string | null
          paid_by_member_id: string | null
          period_key: string | null
          recurring_expense_id: string | null
          source: Database["public"]["Enums"]["expense_source"]
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          category_id?: string | null
          couple_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          occurrence_date?: string | null
          paid_by_id?: string | null
          paid_by_member_id?: string | null
          period_key?: string | null
          recurring_expense_id?: string | null
          source?: Database["public"]["Enums"]["expense_source"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          category_id?: string | null
          couple_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          occurrence_date?: string | null
          paid_by_id?: string | null
          paid_by_member_id?: string | null
          period_key?: string | null
          recurring_expense_id?: string | null
          source?: Database["public"]["Enums"]["expense_source"]
          updated_at?: string
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
      close_budget_period: { Args: { p_period: string }; Returns: string }
      confirm_recurring_occurrence: {
        Args: { p_recurring_id: string; p_amount?: number; p_occurrence?: string }
        Returns: string
      }
      create_couple: { Args: { couple_name?: string }; Returns: Json }
      create_next_period: {
        Args: { p_period: string; p_copy_from?: string }
        Returns: string
      }
      get_budget_overview: { Args: { p_period?: string }; Returns: Json }
      get_couple_id: { Args: never; Returns: string }
      join_couple_by_code: { Args: { invite_code: string }; Returns: string }
      next_recurring_due: { Args: { p_recurring_id: string }; Returns: string }
      post_due_recurring: {
        Args: { p_couple_id: string; p_up_to?: string }
        Returns: number
      }
      set_budget_amount: {
        Args: {
          p_period: string
          p_category_id: string
          p_amount: number
          p_rollover?: boolean
        }
        Returns: string
      }
      set_expected_income: { Args: { p_period: string; p_amount: number }; Returns: undefined }
      skip_recurring_occurrence: {
        Args: { p_recurring_id: string; p_occurrence?: string }
        Returns: undefined
      }
    }
    Enums: {
      budget_period_status: "DRAFT" | "ACTIVE" | "CLOSED"
      checkin_period: "weekly" | "monthly" | "yearly"
      expense_kind: "FIXED" | "VARIABLE"
      expense_source: "MANUAL" | "RECURRING"
      member_role: "OWNER" | "MEMBER" | "VIEWER"
      pantry_category: "FRIDGE" | "FREEZER" | "PANTRY" | "BATHROOM" | "OTHER"
      priority_level: "LOW" | "MEDIUM" | "HIGH"
      prompt_source: "SYSTEM" | "CUSTOM"
      recurrence_freq:
        | "WEEKLY"
        | "MONTHLY"
        | "BIMONTHLY"
        | "QUARTERLY"
        | "SEMIANNUAL"
        | "ANNUAL"
      split_mode: "EQUAL" | "PROPORTIONAL" | "CUSTOM"
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
      budget_period_status: ["DRAFT", "ACTIVE", "CLOSED"],
      checkin_period: ["weekly", "monthly", "yearly"],
      expense_kind: ["FIXED", "VARIABLE"],
      expense_source: ["MANUAL", "RECURRING"],
      member_role: ["OWNER", "MEMBER", "VIEWER"],
      pantry_category: ["FRIDGE", "FREEZER", "PANTRY", "BATHROOM", "OTHER"],
      priority_level: ["LOW", "MEDIUM", "HIGH"],
      prompt_source: ["SYSTEM", "CUSTOM"],
      recurrence_freq: [
        "WEEKLY",
        "MONTHLY",
        "BIMONTHLY",
        "QUARTERLY",
        "SEMIANNUAL",
        "ANNUAL",
      ],
      split_mode: ["EQUAL", "PROPORTIONAL", "CUSTOM"],
      todo_status: ["TODO", "IN_PROGRESS", "DONE"],
    },
  },
} as const

// ─────────────────────────────────────────
// Shorthand types (used by the components) — not generated by Supabase.
// ─────────────────────────────────────────

// Enum
export type SplitMode = Enums<"split_mode">;
export type PriorityLevel = Enums<"priority_level">;
export type TodoStatus = Enums<"todo_status">;
export type PantryCategory = Enums<"pantry_category">;
export type CheckinPeriod = Enums<"checkin_period">;
export type PromptSource = Enums<"prompt_source">;
export type ExpenseKind = Enums<"expense_kind">;
export type ExpenseSource = Enums<"expense_source">;
export type MemberRole = Enums<"member_role">;
export type RecurrenceFreq = Enums<"recurrence_freq">;
export type BudgetPeriodStatus = Enums<"budget_period_status">;
// notifications.type is `text` in the DB; these are the values the triggers emit.
export type NotificationType = "post" | "event" | "expense" | "todo";

// Tables
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
export type HouseholdMember = Tables<"household_members">;
export type ExpenseCategory = Tables<"expense_categories">;
export type RecurringExpense = Tables<"recurring_expenses">;
export type BudgetPeriod = Tables<"budget_periods">;
export type ExpenseShare = Tables<"expense_shares">;

// ─────────────────────────────────────────
// Shape of the get_budget_overview() payload (returns jsonb).
// ─────────────────────────────────────────

export type BudgetLineStatus = "OK" | "WARNING" | "OVER" | "UNPLANNED";

export interface BudgetLine {
  category_id: string;
  slug: string;
  label: string;
  emoji: string | null;
  color: string | null;
  kind: ExpenseKind;
  budget_id: string | null;
  planned: number;
  carried: number;
  effective: number;
  rollover_enabled: boolean;
  spent: number;
  expense_count: number;
  remaining: number;
  progress_ratio: number | null;
  status: BudgetLineStatus;
}

export interface BudgetOverview {
  period_key: string;
  period_id: string | null;
  status: BudgetPeriodStatus;
  expected_income: number;
  planned: number;
  spent: number;
  fixed_spent: number;
  variable_spent: number;
  available: number;
  lines: BudgetLine[];
}
