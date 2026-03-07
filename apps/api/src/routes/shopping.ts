import type { FastifyInstance } from "fastify";
import {
    CreateShoppingItemSchema,
    UpdateShoppingItemSchema,
} from "@couple-os/shared";

export async function shoppingRoutes(server: FastifyInstance) {
    server.addHook("onRequest", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            return reply.status(401).send({ error: "Unauthorized" });
        }
    });

    async function getUserCouple(userId: string) {
        const user = await server.prisma.user.findUnique({ where: { id: userId } });
        return user?.coupleId ?? null;
    }

    function fmt(item: any) {
        return {
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        };
    }

    server.get("/history", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const items = await server.prisma.shoppingItem.findMany({
            where: { coupleId },
            select: { name: true },
            distinct: ['name'],
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return { history: items.map(i => i.name) };
    });

    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const items = await server.prisma.shoppingItem.findMany({
            where: { coupleId },
            orderBy: [{ checked: "asc" }, { createdAt: "desc" }],
        });
        return { items: items.map(fmt) };
    });

    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreateShoppingItemSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid item", details: parsed.error.flatten() });

        const item = await server.prisma.shoppingItem.create({
            data: {
                name: parsed.data.name,
                quantity: parsed.data.quantity ?? 1,
                unit: parsed.data.unit ?? null,
                notes: parsed.data.notes ?? null,
                coupleId,
            },
        });
        return fmt(item);
    });

    server.patch("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.shoppingItem.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Item not found" });

        const parsed = UpdateShoppingItemSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid update", details: parsed.error.flatten() });

        const updates: any = {};
        if (parsed.data.name !== undefined) updates.name = parsed.data.name;
        if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity;
        if (parsed.data.unit !== undefined) updates.unit = parsed.data.unit;
        if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
        if (parsed.data.checked !== undefined) updates.checked = parsed.data.checked;

        const item = await server.prisma.shoppingItem.update({ where: { id }, data: updates });
        return fmt(item);
    });

    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.shoppingItem.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Item not found" });

        await server.prisma.shoppingItem.delete({ where: { id } });
        return { success: true };
    });

    // Clear all checked items
    server.delete("/checked", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        await server.prisma.shoppingItem.deleteMany({ where: { coupleId, checked: true } });
        return { success: true };
    });
}
