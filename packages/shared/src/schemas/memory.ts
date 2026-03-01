import { z } from "zod";

export const MemorySchema = z.object({
    id: z.string().uuid(),
    content: z.string(),
    tags: z.array(z.string()),
    photos: z.array(z.string()),
    date: z.string().datetime(),
    authorId: z.string().uuid(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    author: z.object({
        id: z.string().uuid(),
        name: z.string(),
        avatarUrl: z.string().nullable(),
    }).optional(),
});
export type Memory = z.infer<typeof MemorySchema>;

export const CreateMemorySchema = z.object({
    content: z.string().min(1).max(5000),
    tags: z.array(z.string().max(50)).max(10).optional(),
    photos: z.array(z.string().url()).max(5).optional(),
    date: z.string().datetime().optional(),
});
export type CreateMemoryRequest = z.infer<typeof CreateMemorySchema>;
