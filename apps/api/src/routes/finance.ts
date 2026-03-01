import type { FastifyInstance } from "fastify";
import { CreateExpenseSchema, CreateGoalSchema, UpdateGoalSchema } from "@couple-os/shared";

export async function financeRoutes(server: FastifyInstance) {
    server.addHook("onRequest", async (request, reply) => {
        try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: "Unauthorized" }); }
    });

    async function getUserCouple(userId: string) {
        const user = await server.prisma.user.findUnique({ where: { id: userId } });
        return user?.coupleId ?? null;
    }

    // ---- Expenses ----

    server.get("/expenses", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const { month, year } = request.query as { month?: string; year?: string };
        const now = new Date();
        const m = month ? parseInt(month) - 1 : now.getMonth();
        const y = year ? parseInt(year) : now.getFullYear();
        const from = new Date(y, m, 1);
        const to = new Date(y, m + 1, 0, 23, 59, 59);

        const expenses = await server.prisma.expense.findMany({
            where: { coupleId, date: { gte: from, lte: to } },
            include: { paidBy: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { date: "desc" },
        });

        return {
            expenses: expenses.map((e: any) => ({
                ...e,
                date: e.date.toISOString(),
                createdAt: e.createdAt.toISOString(),
            })),
        };
    });

    server.post("/expenses", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreateExpenseSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid expense", details: parsed.error.flatten() });

        const expense = await server.prisma.expense.create({
            data: {
                amount: parsed.data.amount,
                category: parsed.data.category,
                note: parsed.data.note ?? null,
                date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
                paidById: userId,
                coupleId,
            },
            include: { paidBy: { select: { id: true, name: true, avatarUrl: true } } },
        });

        return { ...expense, date: expense.date.toISOString(), createdAt: expense.createdAt.toISOString() };
    });

    server.delete("/expenses/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.expense.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Expense not found" });

        await server.prisma.expense.delete({ where: { id } });
        return { success: true };
    });

    // ---- Goals ----

    server.get("/goals", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const goals = await server.prisma.financialGoal.findMany({
            where: { coupleId },
            orderBy: { createdAt: "desc" },
        });

        return {
            goals: goals.map((g: any) => ({
                ...g,
                createdAt: g.createdAt.toISOString(),
                updatedAt: g.updatedAt.toISOString(),
            })),
        };
    });

    server.post("/goals", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreateGoalSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid goal", details: parsed.error.flatten() });

        const goal = await server.prisma.financialGoal.create({
            data: { title: parsed.data.title, targetAmount: parsed.data.targetAmount, coupleId },
        });

        return { ...goal, createdAt: goal.createdAt.toISOString(), updatedAt: goal.updatedAt.toISOString() };
    });

    server.patch("/goals/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.financialGoal.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Goal not found" });

        const parsed = UpdateGoalSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid update", details: parsed.error.flatten() });

        const updates: any = {};
        if (parsed.data.title !== undefined) updates.title = parsed.data.title;
        if (parsed.data.targetAmount !== undefined) updates.targetAmount = parsed.data.targetAmount;
        if (parsed.data.savedAmount !== undefined) updates.savedAmount = parsed.data.savedAmount;

        const updated = await server.prisma.financialGoal.update({ where: { id }, data: updates });
        return { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
    });

    server.delete("/goals/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.financialGoal.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Goal not found" });

        await server.prisma.financialGoal.delete({ where: { id } });
        return { success: true };
    });
}
