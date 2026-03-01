import { z } from "zod";

// ---- Event ----

export const EventSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    location: z.string().nullable(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    allDay: z.boolean(),
    color: z.string().nullable(),
    recurrence: z.string().nullable(),
    creatorId: z.string().uuid(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    creator: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
            avatarUrl: z.string().nullable(),
        })
        .optional(),
});

export type Event = z.infer<typeof EventSchema>;

// ---- Create Event ----

export const CreateEventRequestSchema = z
    .object({
        title: z.string().min(1, "Title is required").max(200),
        description: z.string().max(2000).optional(),
        location: z.string().max(300).optional(),
        startAt: z.string().datetime("Invalid start date"),
        endAt: z.string().datetime("Invalid end date"),
        allDay: z.boolean().optional(),
        color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
            .optional(),
        recurrence: z.string().max(100).optional(),
    })
    .refine((data) => new Date(data.endAt) >= new Date(data.startAt), {
        message: "End date must be after start date",
        path: ["endAt"],
    });

export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;

// ---- Update Event ----

export const UpdateEventRequestSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    location: z.string().max(300).nullable().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    allDay: z.boolean().optional(),
    color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .nullable()
        .optional(),
    recurrence: z.string().max(100).nullable().optional(),
});

export type UpdateEventRequest = z.infer<typeof UpdateEventRequestSchema>;
