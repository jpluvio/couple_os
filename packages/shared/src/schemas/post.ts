import { z } from "zod";

// ---- Post ----

export const PostSchema = z.object({
    id: z.string().uuid(),
    content: z.string(),
    pinned: z.boolean(),
    tags: z.array(z.string()),
    authorId: z.string().uuid(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    author: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
            avatarUrl: z.string().nullable(),
        })
        .optional(),
    reactions: z
        .array(
            z.object({
                emoji: z.string(),
                count: z.number(),
                reacted: z.boolean(), // whether current user reacted
            })
        )
        .optional(),
});

export type Post = z.infer<typeof PostSchema>;

// ---- Create Post ----

export const CreatePostRequestSchema = z.object({
    content: z
        .string()
        .min(1, "Post cannot be empty")
        .max(500, "Post cannot exceed 500 characters"),
    tags: z.array(z.string().max(30)).max(5).optional(),
    pinned: z.boolean().optional(),
});

export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;

// ---- Update Post ----

export const UpdatePostRequestSchema = z.object({
    content: z
        .string()
        .min(1)
        .max(500)
        .optional(),
    tags: z.array(z.string().max(30)).max(5).optional(),
    pinned: z.boolean().optional(),
});

export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>;

// ---- Toggle Reaction ----

export const ToggleReactionRequestSchema = z.object({
    emoji: z
        .string()
        .min(1)
        .max(10, "Emoji must be at most 10 characters"),
});

export type ToggleReactionRequest = z.infer<typeof ToggleReactionRequestSchema>;
