import type { FastifyInstance } from "fastify";
import {
    CreatePantryItemSchema,
    UpdatePantryItemSchema,
    CreateShoppingItemSchema,
    UpdateShoppingItemSchema,
    CreateRecipeSchema,
} from "@couple-os/shared";

export async function pantryRoutes(server: FastifyInstance) {
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
            expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        };
    }

    server.get("/history", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const items = await server.prisma.pantryItem.findMany({
            where: { coupleId },
            select: { name: true },
            distinct: ['name'],
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return { history: items.map(i => i.name) };
    });

    // ========= PANTRY =========

    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const { category } = request.query as { category?: string };
        const where: any = { coupleId };
        if (category) where.category = category;

        const items = await server.prisma.pantryItem.findMany({
            where,
            orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
        });
        return { items: items.map(fmt) };
    });

    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreatePantryItemSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid item", details: parsed.error.flatten() });

        const item = await server.prisma.pantryItem.create({
            data: {
                name: parsed.data.name,
                category: parsed.data.category ?? "PANTRY",
                quantity: parsed.data.quantity ?? 1,
                unit: parsed.data.unit ?? null,
                expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
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

        const existing = await server.prisma.pantryItem.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Item not found" });

        const parsed = UpdatePantryItemSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid update", details: parsed.error.flatten() });

        const updates: any = {};
        if (parsed.data.name !== undefined) updates.name = parsed.data.name;
        if (parsed.data.category !== undefined) updates.category = parsed.data.category;
        if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity;
        if (parsed.data.unit !== undefined) updates.unit = parsed.data.unit;
        if (parsed.data.expiresAt !== undefined)
            updates.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

        const item = await server.prisma.pantryItem.update({ where: { id }, data: updates });
        return fmt(item);
    });

    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.pantryItem.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Item not found" });

        await server.prisma.pantryItem.delete({ where: { id } });
        return { success: true };
    });

    // ---- Add to shopping list from pantry ----
    server.post("/:id/to-shopping", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const pantryItem = await server.prisma.pantryItem.findFirst({ where: { id, coupleId } });
        if (!pantryItem) return reply.status(404).send({ error: "Pantry item not found" });

        const shoppingItem = await server.prisma.shoppingItem.create({
            data: {
                name: pantryItem.name,
                quantity: 1,
                unit: pantryItem.unit,
                coupleId,
            },
        });
        return fmt(shoppingItem);
    });
}
