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

    // ---- Analytics ----
    server.get("/analytics", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        // Get couple + members to calculate splits
        const couple = await server.prisma.couple.findUnique({
            where: { id: coupleId },
            include: { members: true },
        });

        if (!couple) return reply.status(404).send({ error: "Couple not found" });

        // Get last 6 months of expenses
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const expenses = await server.prisma.expense.findMany({
            where: { coupleId, date: { gte: sixMonthsAgo } },
            include: { paidBy: { select: { id: true, name: true } } },
            orderBy: { date: "asc" },
        });

        // 1. Group by Month (Line Chart)
        const monthlyTotals: Record<string, number> = {};
        // 2. Group by Category (Donut Chart)
        const categoryTotals: Record<string, number> = {};
        // 3. Split calculation
        let totalSpent = 0;
        const paidByUser: Record<string, number> = {};

        couple.members.forEach(m => paidByUser[m.id] = 0);

        expenses.forEach((e: any) => {
            // Month
            const monthKey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + e.amount;

            // Category
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;

            // Splits
            totalSpent += e.amount;
            if (paidByUser[e.paidById] !== undefined) {
                paidByUser[e.paidById] += e.amount;
            }
        });

        // Recommended Split Logic (Proportional vs Equal)
        const balances: { userId: string; name: string; paid: number; shouldHavePaid: number; balance: number }[] = [];

        const m1 = couple.members[0];
        const m2 = couple.members[1]; // might be undefined if 1 person

        if (m1 && m2) {
            let m1Share = 0.5;
            let m2Share = 0.5;

            if (couple.splitMode === "PROPORTIONAL") {
                const s1 = m1.salary || 0;
                const s2 = m2.salary || 0;
                const totalSalary = s1 + s2;
                if (totalSalary > 0) {
                    m1Share = s1 / totalSalary;
                    m2Share = s2 / totalSalary;
                }
            }

            const m1Paid = paidByUser[m1.id] || 0;
            const m2Paid = paidByUser[m2.id] || 0;
            const m1Should = totalSpent * m1Share;
            const m2Should = totalSpent * m2Share;

            balances.push({
                userId: m1.id, name: m1.name, paid: m1Paid, shouldHavePaid: m1Should, balance: m1Paid - m1Should
            });
            balances.push({
                userId: m2.id, name: m2.name, paid: m2Paid, shouldHavePaid: m2Should, balance: m2Paid - m2Should
            });
        }

        return {
            monthlyTotals,
            categoryTotals,
            balances,
            totalSpent
        };
    });

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
