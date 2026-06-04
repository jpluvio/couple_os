// Tipi generati manualmente dallo schema Supabase.
// Dopo aver creato il progetto Supabase, sostituire con:
//   npx supabase gen types typescript --project-id <id> > types/database.ts

export type SplitMode = "EQUAL" | "PROPORTIONAL";
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH";
export type TodoStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type PantryCategory = "FRIDGE" | "FREEZER" | "PANTRY" | "BATHROOM" | "OTHER";
export type CheckinPeriod = "weekly" | "monthly" | "yearly";
export type PromptSource = "SYSTEM" | "CUSTOM";
export type NotificationType = "post" | "event" | "expense" | "todo";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          push_tokens: string[];
          google_id: string | null;
          salary: number | null;
          couple_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at" | "push_tokens"> & {
          push_tokens?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      couples: {
        Row: {
          id: string;
          name: string | null;
          split_mode: SplitMode;
          created_at: string;
        };
        Insert: { id?: string; name?: string | null; split_mode?: SplitMode };
        Update: Partial<Database["public"]["Tables"]["couples"]["Insert"]>;
      };
      invite_codes: {
        Row: {
          id: string;
          code: string;
          couple_id: string;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invite_codes"]["Row"], "id" | "created_at" | "used"> & { id?: string; used?: boolean };
        Update: Partial<Database["public"]["Tables"]["invite_codes"]["Insert"]>;
      };
      posts: {
        Row: {
          id: string;
          content: string;
          pinned: boolean;
          tags: string[];
          author_id: string;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["posts"]["Row"], "id" | "created_at" | "updated_at" | "pinned" | "tags"> & { id?: string; pinned?: boolean; tags?: string[] };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
      };
      reactions: {
        Row: {
          id: string;
          emoji: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reactions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["reactions"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          color: string | null;
          recurrence: string | null;
          google_event_id: string | null;
          reminder_minutes: number[] | null;
          creator_id: string;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      todo_lists: {
        Row: {
          id: string;
          name: string;
          emoji: string | null;
          couple_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["todo_lists"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["todo_lists"]["Insert"]>;
      };
      todo_items: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          deadline: string | null;
          priority: PriorityLevel;
          status: TodoStatus;
          assignee_id: string | null;
          list_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["todo_items"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["todo_items"]["Insert"]>;
      };
      pantry_items: {
        Row: {
          id: string;
          name: string;
          quantity: number | null;
          unit: string | null;
          expires_at: string | null;
          category: PantryCategory;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pantry_items"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["pantry_items"]["Insert"]>;
      };
      shopping_items: {
        Row: {
          id: string;
          name: string;
          quantity: number | null;
          unit: string | null;
          notes: string | null;
          checked: boolean;
          category: PantryCategory;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shopping_items"]["Row"], "id" | "created_at" | "updated_at" | "checked"> & { id?: string; checked?: boolean };
        Update: Partial<Database["public"]["Tables"]["shopping_items"]["Insert"]>;
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          servings: number | null;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["recipes"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
      };
      recipe_ingredients: {
        Row: {
          id: string;
          name: string;
          quantity: string | null;
          recipe_id: string;
        };
        Insert: Omit<Database["public"]["Tables"]["recipe_ingredients"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          amount: number;
          category: string;
          note: string | null;
          date: string;
          paid_by_id: string;
          couple_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      budgets: {
        Row: {
          id: string;
          category: string;
          amount: number;
          month: number;
          year: number;
          couple_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["budgets"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
      };
      financial_goals: {
        Row: {
          id: string;
          title: string;
          target_amount: number;
          saved_amount: number;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["financial_goals"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["financial_goals"]["Insert"]>;
      };
      check_in_prompts: {
        Row: {
          id: string;
          text: string;
          period_type: CheckinPeriod;
          source: PromptSource;
          active: boolean;
          couple_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["check_in_prompts"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["check_in_prompts"]["Insert"]>;
      };
      check_ins: {
        Row: {
          id: string;
          prompt: string;
          period_type: CheckinPeriod;
          mood1: number | null;
          response1: string | null;
          mood2: number | null;
          response2: string | null;
          revealed: boolean;
          user1_id: string;
          user2_id: string;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["check_ins"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["check_ins"]["Insert"]>;
      };
      memories: {
        Row: {
          id: string;
          content: string | null;
          tags: string[];
          photos: string[];
          date: string;
          author_id: string;
          couple_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["memories"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["memories"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          couple_id: string;
          recipient_id: string;
          actor_id: string | null;
          type: NotificationType;
          entity_id: string | null;
          title: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at" | "read"> & { id?: string; read?: boolean };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
    };
    Functions: {
      get_couple_id: {
        Args: Record<never, never>;
        Returns: string;
      };
      join_couple_by_code: {
        Args: { invite_code: string };
        Returns: string;
      };
    };
  };
}

// Shorthand types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

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
