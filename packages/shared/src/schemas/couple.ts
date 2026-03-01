import { z } from "zod";
import { UserSchema } from "./auth.js";

// ---- Couple ----

export const CoupleSchema = z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
    members: z.array(UserSchema).max(2),
});

export type Couple = z.infer<typeof CoupleSchema>;

// ---- Create Couple ----

export const CreateCoupleRequestSchema = z.object({
    name: z.string().min(1).max(100).optional(),
});

export type CreateCoupleRequest = z.infer<typeof CreateCoupleRequestSchema>;

export const CreateCoupleResponseSchema = z.object({
    couple: CoupleSchema,
    inviteCode: z.string().length(6),
});

export type CreateCoupleResponse = z.infer<typeof CreateCoupleResponseSchema>;

// ---- Join Couple ----

export const JoinCoupleRequestSchema = z.object({
    inviteCode: z
        .string()
        .length(6, "Invite code must be exactly 6 characters")
        .regex(/^[A-Z0-9]+$/, "Invite code must be uppercase alphanumeric"),
});

export type JoinCoupleRequest = z.infer<typeof JoinCoupleRequestSchema>;

// ---- Invite Code ----

export const InviteCodeSchema = z.object({
    id: z.string().uuid(),
    code: z.string().length(6),
    coupleId: z.string().uuid(),
    expiresAt: z.string().datetime(),
    used: z.boolean(),
});

export type InviteCode = z.infer<typeof InviteCodeSchema>;
