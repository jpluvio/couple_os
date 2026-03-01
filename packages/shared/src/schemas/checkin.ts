import { z } from "zod";

export const CheckInSchema = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
    periodType: z.string(),
    mood1: z.number().nullable(),
    response1: z.string().nullable(),
    mood2: z.number().nullable(),
    response2: z.string().nullable(),
    revealed: z.boolean(),
    user1Id: z.string().uuid().nullable(),
    user2Id: z.string().uuid().nullable(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export type CheckIn = z.infer<typeof CheckInSchema>;

export const CreateCheckInSchema = z.object({
    prompt: z.string().min(1).max(1000),
    periodType: z.enum(["weekly", "monthly", "yearly"]),
});
export type CreateCheckInRequest = z.infer<typeof CreateCheckInSchema>;

export const RespondCheckInSchema = z.object({
    mood: z.number().int().min(1).max(5),
    response: z.string().min(1).max(2000),
});
export type RespondCheckInRequest = z.infer<typeof RespondCheckInSchema>;

export const CHECK_IN_PROMPTS = [
    "How did you feel about our relationship this week?",
    "What's one thing your partner did that made you smile?",
    "Is there anything you'd like to improve together?",
    "What are you grateful for in our relationship?",
    "How can I better support you right now?",
    "What's a fun memory from this week?",
    "Rate your overall happiness this week and tell me why.",
    "What's something you've been thinking about lately?",
] as const;
