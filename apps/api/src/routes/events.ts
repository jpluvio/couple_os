import type { FastifyInstance } from "fastify";
import {
    CreateEventRequestSchema,
    UpdateEventRequestSchema,
} from "@couple-os/shared";

export async function eventRoutes(server: FastifyInstance) {
    // All event routes require authentication
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

    function formatEvent(event: any) {
        return {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            startAt: event.startAt.toISOString(),
            endAt: event.endAt.toISOString(),
            allDay: event.allDay,
            color: event.color,
            recurrence: event.recurrence,
            creatorId: event.creatorId,
            coupleId: event.coupleId,
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
            creator: event.creator
                ? {
                    id: event.creator.id,
                    name: event.creator.name,
                    avatarUrl: event.creator.avatarUrl,
                }
                : undefined,
        };
    }

    /**
     * GET /events
     * List events for the couple within a date range.
     * Query params: from, to (ISO strings)
     */
    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const { from, to } = request.query as { from?: string; to?: string };

        const now = new Date();
        const startDate = from
            ? new Date(from)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = to
            ? new Date(to)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const events = await server.prisma.event.findMany({
            where: {
                coupleId,
                startAt: { lte: endDate },
                endAt: { gte: startDate },
            },
            include: {
                creator: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { startAt: "asc" },
        });

        return { events: events.map(formatEvent) };
    });

    /**
     * POST /events
     * Create a new event.
     */
    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const parsed = CreateEventRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({ error: "Invalid event", details: parsed.error.flatten() });
        }

        const event = await server.prisma.event.create({
            data: {
                title: parsed.data.title,
                description: parsed.data.description ?? null,
                location: parsed.data.location ?? null,
                startAt: new Date(parsed.data.startAt),
                endAt: new Date(parsed.data.endAt),
                allDay: parsed.data.allDay ?? false,
                color: parsed.data.color ?? null,
                recurrence: parsed.data.recurrence ?? null,
                creatorId: userId,
                coupleId,
            },
            include: {
                creator: { select: { id: true, name: true, avatarUrl: true } },
            },
        });

        return formatEvent(event);
    });

    /**
     * PATCH /events/:id
     * Update an event.
     */
    server.patch("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const existing = await server.prisma.event.findFirst({
            where: { id, coupleId },
        });

        if (!existing) {
            return reply.status(404).send({ error: "Event not found" });
        }

        const parsed = UpdateEventRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({ error: "Invalid update", details: parsed.error.flatten() });
        }

        const updates: any = {};
        if (parsed.data.title !== undefined) updates.title = parsed.data.title;
        if (parsed.data.description !== undefined)
            updates.description = parsed.data.description;
        if (parsed.data.location !== undefined)
            updates.location = parsed.data.location;
        if (parsed.data.startAt !== undefined)
            updates.startAt = new Date(parsed.data.startAt);
        if (parsed.data.endAt !== undefined)
            updates.endAt = new Date(parsed.data.endAt);
        if (parsed.data.allDay !== undefined) updates.allDay = parsed.data.allDay;
        if (parsed.data.color !== undefined) updates.color = parsed.data.color;
        if (parsed.data.recurrence !== undefined)
            updates.recurrence = parsed.data.recurrence;

        const event = await server.prisma.event.update({
            where: { id },
            data: updates,
            include: {
                creator: { select: { id: true, name: true, avatarUrl: true } },
            },
        });

        return formatEvent(event);
    });

    /**
     * DELETE /events/:id
     * Delete an event.
     */
    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const existing = await server.prisma.event.findFirst({
            where: { id, coupleId },
        });

        if (!existing) {
            return reply.status(404).send({ error: "Event not found" });
        }

        await server.prisma.event.delete({ where: { id } });
        return { success: true };
    });
}
