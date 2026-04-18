// Couple OS — Shared Package
// Contiene solo costanti e Zod schemas per la validazione dei form.
// I tipi delle entità DB vengono da apps/mobile/types/database.ts (generati da Supabase).

import { z } from "zod";

// ─────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  "Affitto",
  "Bollette",
  "Spesa",
  "Ristoranti",
  "Trasporti",
  "Salute",
  "Intrattenimento",
  "Altro",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PANTRY_CATEGORIES = ["FRIDGE", "FREEZER", "PANTRY", "BATHROOM", "OTHER"] as const;

export const CHECK_IN_PROMPTS = {
  weekly: [
    "Come ti sei sentito/a questa settimana?",
    "C'è qualcosa che vorresti dirmi ma non hai ancora detto?",
    "Qual è stato il momento più bello di questa settimana insieme?",
  ],
  monthly: [
    "C'è qualcosa che potremmo fare meglio come coppia questo mese?",
    "Quali sono le tue aspettative per il prossimo mese?",
    "Cosa apprezzi di più di me in questo momento?",
  ],
  yearly: [
    "Cosa ti ha reso più felice nell'ultimo anno insieme?",
    "Qual è il tuo sogno più grande per il nostro futuro?",
  ],
} as const;

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export const TODO_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const CHECKIN_PERIODS = ["weekly", "monthly", "yearly"] as const;
export const SPLIT_MODES = ["EQUAL", "PROPORTIONAL"] as const;

// ─────────────────────────────────────────
// FORM SCHEMAS (Zod — per React Hook Form)
// ─────────────────────────────────────────

export const CreatePostSchema = z.object({
  content: z.string().min(1, "Il messaggio non può essere vuoto").max(500, "Massimo 500 caratteri"),
  tags: z.array(z.string()).default([]),
});
export type CreatePostForm = z.infer<typeof CreatePostSchema>;

export const CreateEventSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(300).optional(),
  start_at: z.string().min(1, "La data di inizio è obbligatoria"),
  end_at: z.string().min(1, "La data di fine è obbligatoria"),
  all_day: z.boolean().default(false),
  color: z.string().optional(),
  reminder_minutes: z.array(z.number()).default([]),
});
export type CreateEventForm = z.infer<typeof CreateEventSchema>;

export const CreateTodoListSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio").max(100),
  emoji: z.string().optional(),
});
export type CreateTodoListForm = z.infer<typeof CreateTodoListSchema>;

export const CreateTodoItemSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(300),
  description: z.string().max(1000).optional(),
  deadline: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignee_id: z.string().uuid().optional(),
});
export type CreateTodoItemForm = z.infer<typeof CreateTodoItemSchema>;

export const CreatePantryItemSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio").max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  expires_at: z.string().optional(),
  category: z.enum(["FRIDGE", "FREEZER", "PANTRY", "BATHROOM", "OTHER"]).default("PANTRY"),
});
export type CreatePantryItemForm = z.infer<typeof CreatePantryItemSchema>;

export const CreateShoppingItemSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio").max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  notes: z.string().max(300).optional(),
  category: z.enum(["FRIDGE", "FREEZER", "PANTRY", "BATHROOM", "OTHER"]).default("OTHER"),
});
export type CreateShoppingItemForm = z.infer<typeof CreateShoppingItemSchema>;

export const CreateRecipeSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(200),
  description: z.string().max(5000).optional(),
  servings: z.number().int().positive().optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    quantity: z.string().optional(),
  })).default([]),
});
export type CreateRecipeForm = z.infer<typeof CreateRecipeSchema>;

export const CreateExpenseSchema = z.object({
  amount: z.number().positive("L'importo deve essere positivo"),
  category: z.string().min(1, "La categoria è obbligatoria"),
  note: z.string().max(300).optional(),
  date: z.string().default(() => new Date().toISOString().split("T")[0]),
});
export type CreateExpenseForm = z.infer<typeof CreateExpenseSchema>;

export const CreateBudgetSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});
export type CreateBudgetForm = z.infer<typeof CreateBudgetSchema>;

export const CreateGoalSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(200),
  target_amount: z.number().positive("L'obiettivo deve essere positivo"),
});
export type CreateGoalForm = z.infer<typeof CreateGoalSchema>;

export const RespondCheckInSchema = z.object({
  mood: z.number().int().min(1).max(5),
  response: z.string().min(1, "La risposta è obbligatoria").max(2000),
});
export type RespondCheckInForm = z.infer<typeof RespondCheckInSchema>;

export const CreateMemorySchema = z.object({
  content: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  date: z.string().default(() => new Date().toISOString().split("T")[0]),
  photos: z.array(z.string()).max(5, "Massimo 5 foto per memoria").default([]),
});
export type CreateMemoryForm = z.infer<typeof CreateMemorySchema>;
