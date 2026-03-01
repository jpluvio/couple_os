import type { FastifyInstance } from "fastify";
import { CreateRecipeSchema } from "@couple-os/shared";

export async function recipeRoutes(server: FastifyInstance) {
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

    function fmtRecipe(r: any) {
        return {
            id: r.id,
            title: r.title,
            description: r.description,
            servings: r.servings,
            coupleId: r.coupleId,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            ingredients: r.ingredients || [],
        };
    }

    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const recipes = await server.prisma.recipe.findMany({
            where: { coupleId },
            include: { ingredients: true },
            orderBy: { createdAt: "desc" },
        });
        return { recipes: recipes.map(fmtRecipe) };
    });

    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreateRecipeSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid recipe", details: parsed.error.flatten() });

        const recipe = await server.prisma.recipe.create({
            data: {
                title: parsed.data.title,
                description: parsed.data.description ?? null,
                servings: parsed.data.servings ?? null,
                coupleId,
                ingredients: parsed.data.ingredients
                    ? {
                        create: parsed.data.ingredients.map((i: any) => ({
                            name: i.name,
                            quantity: i.quantity ?? null,
                        })),
                    }
                    : undefined,
            },
            include: { ingredients: true },
        });
        return fmtRecipe(recipe);
    });

    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.recipe.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Recipe not found" });

        await server.prisma.recipe.delete({ where: { id } });
        return { success: true };
    });
}
