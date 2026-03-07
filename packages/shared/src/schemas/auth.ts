import { z } from "zod";

// ---- User ----

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    avatarUrl: z.string().url().nullable(),
    coupleId: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
    salary: z.number().nullable(),
});

export type User = z.infer<typeof UserSchema>;

// ---- Auth ----

export const GoogleAuthRequestSchema = z.object({
    idToken: z.string().min(1, "Google ID token is required"),
});

export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;

export const AuthResponseSchema = z.object({
    accessToken: z.string(),
    user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ---- Refresh ----

export const RefreshRequestSchema = z.object({
    refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
