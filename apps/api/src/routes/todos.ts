import type { FastifyInstance } from "fastify";
import {
    CreateTodoListRequestSchema,
    CreateTodoItemRequestSchema,
    UpdateTodoItemRequestSchema,
} from "@couple-os/shared";

export async function todoRoutes(server: FastifyInstance) {
    server.addHook("onRequest", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            return reply.status(401).send({ error: "Unauthorized" });
        }
    });

    async function getUserCouple(userId: string) {
        const user = await server.prisma.user.findUnique({
            where: { id: userId },
        });
        return user?.coupleId ?? null;
    }

    // ---- Lists ----

    /**
     * GET /todos
     * Get all to-do lists for the couple.
     */
    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const lists = await server.prisma.todoList.findMany({
            where: { coupleId },
            include: {
                _count: { select: { items: true } },
                items: {
                    where: { status: { not: "DONE" } },
                    select: { id: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return {
            lists: lists.map((l: any) => ({
                id: l.id,
                name: l.name,
                emoji: l.emoji,
                coupleId: l.coupleId,
                createdAt: l.createdAt.toISOString(),
                updatedAt: l.updatedAt.toISOString(),
                totalItems: l._count.items,
                pendingItems: l.items.length,
            })),
        };
    });

    /**
     * POST /todos
     * Create a new To-Do list.
     */
    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const parsed = CreateTodoListRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({ error: "Invalid list", details: parsed.error.flatten() });
        }

        const list = await server.prisma.todoList.create({
            data: {
                name: parsed.data.name,
                emoji: parsed.data.emoji ?? null,
                coupleId,
            },
        });

        return {
            id: list.id,
            name: list.name,
            emoji: list.emoji,
            coupleId: list.coupleId,
            createdAt: list.createdAt.toISOString(),
            updatedAt: list.updatedAt.toISOString(),
            totalItems: 0,
            pendingItems: 0,
        };
    });

    /**
     * DELETE /todos/:listId
     * Delete a to-do list and all its items.
     */
    server.delete("/:listId", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { listId } = request.params as { listId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const list = await server.prisma.todoList.findFirst({
            where: { id: listId, coupleId },
        });
        if (!list) {
            return reply.status(404).send({ error: "List not found" });
        }

        await server.prisma.todoList.delete({ where: { id: listId } });
        return { success: true };
    });

    // ---- Items ----

    /**
     * GET /todos/:listId/items
     * Get all items in a list.
     * Query: status, sort (deadline, priority, status)
     */
    server.get("/:listId/items", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { listId } = request.params as { listId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const list = await server.prisma.todoList.findFirst({
            where: { id: listId, coupleId },
        });
        if (!list) {
            return reply.status(404).send({ error: "List not found" });
        }

        const { status, sort = "priority" } = request.query as {
            status?: string;
            sort?: string;
        };

        const where: any = { listId };
        if (status) where.status = status;

        const orderBy: any = [];
        if (sort === "deadline") orderBy.push({ deadline: "asc" });
        if (sort === "priority") {
            orderBy.push({ priority: "desc" });
        }
        orderBy.push({ createdAt: "desc" });

        const items = await server.prisma.todoItem.findMany({
            where,
            include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy,
        });

        return {
            items: items.map((i: any) => ({
                id: i.id,
                title: i.title,
                description: i.description,
                deadline: i.deadline ? i.deadline.toISOString() : null,
                priority: i.priority,
                status: i.status,
                assigneeId: i.assigneeId,
                listId: i.listId,
                createdAt: i.createdAt.toISOString(),
                updatedAt: i.updatedAt.toISOString(),
                assignee: i.assignee,
            })),
        };
    });

    /**
     * POST /todos/:listId/items
     * Create a new item in a list.
     */
    server.post("/:listId/items", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { listId } = request.params as { listId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const list = await server.prisma.todoList.findFirst({
            where: { id: listId, coupleId },
        });
        if (!list) {
            return reply.status(404).send({ error: "List not found" });
        }

        const parsed = CreateTodoItemRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({ error: "Invalid item", details: parsed.error.flatten() });
        }

        const item = await server.prisma.todoItem.create({
            data: {
                title: parsed.data.title,
                description: parsed.data.description ?? null,
                deadline: parsed.data.deadline
                    ? new Date(parsed.data.deadline)
                    : null,
                priority: parsed.data.priority ?? "MEDIUM",
                assigneeId: parsed.data.assigneeId ?? null,
                listId,
            },
            include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
            },
        });

        return {
            id: item.id,
            title: item.title,
            description: item.description,
            deadline: item.deadline ? item.deadline.toISOString() : null,
            priority: item.priority,
            status: item.status,
            assigneeId: item.assigneeId,
            listId: item.listId,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            assignee: item.assignee,
        };
    });

    /**
     * PATCH /todos/:listId/items/:itemId
     * Update a to-do item.
     */
    server.patch("/:listId/items/:itemId", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { listId, itemId } = request.params as {
            listId: string;
            itemId: string;
        };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const item = await server.prisma.todoItem.findFirst({
            where: { id: itemId, listId, list: { coupleId } },
        });
        if (!item) {
            return reply.status(404).send({ error: "Item not found" });
        }

        const parsed = UpdateTodoItemRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({ error: "Invalid update", details: parsed.error.flatten() });
        }

        const updates: any = {};
        if (parsed.data.title !== undefined) updates.title = parsed.data.title;
        if (parsed.data.description !== undefined)
            updates.description = parsed.data.description;
        if (parsed.data.deadline !== undefined)
            updates.deadline = parsed.data.deadline
                ? new Date(parsed.data.deadline)
                : null;
        if (parsed.data.priority !== undefined)
            updates.priority = parsed.data.priority;
        if (parsed.data.status !== undefined) updates.status = parsed.data.status;
        if (parsed.data.assigneeId !== undefined)
            updates.assigneeId = parsed.data.assigneeId;

        const updated = await server.prisma.todoItem.update({
            where: { id: itemId },
            data: updates,
            include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
            },
        });

        return {
            id: updated.id,
            title: updated.title,
            description: updated.description,
            deadline: updated.deadline ? updated.deadline.toISOString() : null,
            priority: updated.priority,
            status: updated.status,
            assigneeId: updated.assigneeId,
            listId: updated.listId,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            assignee: updated.assignee,
        };
    });

    /**
     * DELETE /todos/:listId/items/:itemId
     * Delete a to-do item.
     */
    server.delete("/:listId/items/:itemId", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { listId, itemId } = request.params as {
            listId: string;
            itemId: string;
        };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const item = await server.prisma.todoItem.findFirst({
            where: { id: itemId, listId, list: { coupleId } },
        });
        if (!item) {
            return reply.status(404).send({ error: "Item not found" });
        }

        await server.prisma.todoItem.delete({ where: { id: itemId } });
        return { success: true };
    });
}
