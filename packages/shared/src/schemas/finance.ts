import { z } from "zod";

export const ExpenseSchema = z.object({
    id: z.string().uuid(),
    amount: z.number(),
    category: z.string(),
    note: z.string().nullable(),
    date: z.string().datetime(),
    paidById: z.string().uuid(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    paidBy: z.object({
        id: z.string().uuid(),
        name: z.string(),
        avatarUrl: z.string().nullable(),
    }).optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

export const CreateExpenseSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    category: z.string().min(1).max(50),
    note: z.string().max(300).optional(),
    date: z.string().datetime().optional(),
});
export type CreateExpenseRequest = z.infer<typeof CreateExpenseSchema>;

export const EXPENSE_CATEGORIES = [
    "Rent", "Bills", "Groceries", "Dining", "Transport", "Health", "Entertainment", "Other",
] as const;

export const FinancialGoalSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    targetAmount: z.number(),
    savedAmount: z.number(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export type FinancialGoal = z.infer<typeof FinancialGoalSchema>;

export const CreateGoalSchema = z.object({
    title: z.string().min(1).max(200),
    targetAmount: z.number().positive(),
});
export type CreateGoalRequest = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    targetAmount: z.number().positive().optional(),
    savedAmount: z.number().min(0).optional(),
});
export type UpdateGoalRequest = z.infer<typeof UpdateGoalSchema>;
