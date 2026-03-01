import type { FastifyInstance } from "fastify";
import { CreateMemorySchema } from "@couple-os/shared";

export async function memoryRoutes(server: FastifyInstance) {
    server.addHook("onRequest", async (request, reply) => {
        try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: "Unauthorized" }); }
    });

    async function getUserCouple(userId: string) {
        const user = await server.prisma.user.findUnique({ where: { id: userId } });
        return user?.coupleId ?? null;
    }

    function fmt(m: any) {
        return {
            ...m,
            date: m.date.toISOString(),
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
        };
    }

    // List memories (timeline)
    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const { tag, cursor } = request.query as { tag?: string; cursor?: string };
        const where: any = { coupleId };
        if (tag) where.tags = { has: tag };

        const memories = await server.prisma.memory.findMany({
            where,
            include: { author: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { date: "desc" },
            take: 20,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        return {
            memories: memories.map(fmt),
            nextCursor: memories.length === 20 ? memories[memories.length - 1].id : null,
        };
    });

    // Create memory
    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreateMemorySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid memory", details: parsed.error.flatten() });

        const memory = await server.prisma.memory.create({
            data: {
                content: parsed.data.content,
                tags: parsed.data.tags ?? [],
                photos: parsed.data.photos ?? [],
                date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
                authorId: userId,
                coupleId,
            },
            include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        });

        return fmt(memory);
    });

    // Delete memory
    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.memory.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Memory not found" });

        await server.prisma.memory.delete({ where: { id } });
        return { success: true };
    });
}
