import { z } from "zod";

// ---- Pantry ----

export const PantryCategoryEnum = z.enum([
    "FRIDGE",
    "FREEZER",
    "PANTRY",
    "BATHROOM",
    "OTHER",
]);
export type PantryCategory = z.infer<typeof PantryCategoryEnum>;

export const PantryItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: PantryCategoryEnum,
    quantity: z.number(),
    unit: z.string().nullable(),
    expiresAt: z.string().datetime().nullable(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export type PantryItem = z.infer<typeof PantryItemSchema>;

export const CreatePantryItemSchema = z.object({
    name: z.string().min(1).max(200),
    category: PantryCategoryEnum.optional(),
    quantity: z.number().int().min(0).optional(),
    unit: z.string().max(30).optional(),
    expiresAt: z.string().datetime().optional(),
});
export type CreatePantryItemRequest = z.infer<typeof CreatePantryItemSchema>;

export const UpdatePantryItemSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    category: PantryCategoryEnum.optional(),
    quantity: z.number().int().min(0).optional(),
    unit: z.string().max(30).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
});
export type UpdatePantryItemRequest = z.infer<typeof UpdatePantryItemSchema>;

// ---- Shopping ----

export const ShoppingItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    quantity: z.number(),
    unit: z.string().nullable(),
    notes: z.string().nullable(),
    checked: z.boolean(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export type ShoppingItem = z.infer<typeof ShoppingItemSchema>;

export const CreateShoppingItemSchema = z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().min(1).optional(),
    unit: z.string().max(30).optional(),
    notes: z.string().max(300).optional(),
});
export type CreateShoppingItemRequest = z.infer<typeof CreateShoppingItemSchema>;

export const UpdateShoppingItemSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    quantity: z.number().int().min(1).optional(),
    unit: z.string().max(30).nullable().optional(),
    notes: z.string().max(300).nullable().optional(),
    checked: z.boolean().optional(),
});
export type UpdateShoppingItemRequest = z.infer<typeof UpdateShoppingItemSchema>;

// ---- Cook Book ----

export const RecipeIngredientSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    quantity: z.string().nullable(),
});

export const RecipeSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    servings: z.number().nullable(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    ingredients: z.array(RecipeIngredientSchema).optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const CreateRecipeSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    servings: z.number().int().min(1).optional(),
    ingredients: z
        .array(
            z.object({
                name: z.string().min(1).max(200),
                quantity: z.string().max(50).optional(),
            })
        )
        .optional(),
});
export type CreateRecipeRequest = z.infer<typeof CreateRecipeSchema>;
