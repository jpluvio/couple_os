import { z } from "zod";

// ---- Enums ----

export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type Priority = z.infer<typeof PriorityEnum>;

export const TodoStatusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export type TodoStatus = z.infer<typeof TodoStatusEnum>;

// ---- TodoList ----

export const TodoListSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    emoji: z.string().nullable(),
    coupleId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    _count: z
        .object({ items: z.number() })
        .optional(),
});

export type TodoList = z.infer<typeof TodoListSchema>;

// ---- Create List ----

export const CreateTodoListRequestSchema = z.object({
    name: z.string().min(1, "List name is required").max(100),
    emoji: z.string().max(10).optional(),
});

export type CreateTodoListRequest = z.infer<typeof CreateTodoListRequestSchema>;

// ---- TodoItem ----

export const TodoItemSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    deadline: z.string().datetime().nullable(),
    priority: PriorityEnum,
    status: TodoStatusEnum,
    assigneeId: z.string().uuid().nullable(),
    listId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    assignee: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
            avatarUrl: z.string().nullable(),
        })
        .nullable()
        .optional(),
});

export type TodoItem = z.infer<typeof TodoItemSchema>;

// ---- Create Item ----

export const CreateTodoItemRequestSchema = z.object({
    title: z.string().min(1, "Title is required").max(300),
    description: z.string().max(2000).optional(),
    deadline: z.string().datetime().optional(),
    priority: PriorityEnum.optional(),
    assigneeId: z.string().uuid().optional(),
});

export type CreateTodoItemRequest = z.infer<typeof CreateTodoItemRequestSchema>;

// ---- Update Item ----

export const UpdateTodoItemRequestSchema = z.object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(2000).nullable().optional(),
    deadline: z.string().datetime().nullable().optional(),
    priority: PriorityEnum.optional(),
    status: TodoStatusEnum.optional(),
    assigneeId: z.string().uuid().nullable().optional(),
});

export type UpdateTodoItemRequest = z.infer<typeof UpdateTodoItemRequestSchema>;
