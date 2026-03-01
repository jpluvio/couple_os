import type { FastifyInstance } from "fastify";
import { CreateCheckInSchema, RespondCheckInSchema } from "@couple-os/shared";

export async function checkinRoutes(server: FastifyInstance) {
    server.addHook("onRequest", async (request, reply) => {
        try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: "Unauthorized" }); }
    });

    async function getUserCouple(userId: string) {
        const user = await server.prisma.user.findUnique({ where: { id: userId } });
        return user?.coupleId ?? null;
    }

    function fmt(c: any) {
        return { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() };
    }

    // List check-ins
    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const checkins = await server.prisma.checkIn.findMany({
            where: { coupleId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        // Anti-bias: hide partner responses until both answered
        return {
            checkins: checkins.map((c: any) => {
                const isUser1 = c.user1Id === userId;
                const isUser2 = c.user2Id === userId;
                const result = fmt(c);

                if (!c.revealed) {
                    if (!isUser1) { result.mood1 = null; result.response1 = null; }
                    if (!isUser2) { result.mood2 = null; result.response2 = null; }
                }
                return result;
            }),
        };
    });

    // Create check-in
    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const parsed = CreateCheckInSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid check-in", details: parsed.error.flatten() });

        const checkin = await server.prisma.checkIn.create({
            data: { prompt: parsed.data.prompt, periodType: parsed.data.periodType, coupleId },
        });
        return fmt(checkin);
    });

    // Respond to check-in
    server.post("/:id/respond", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const checkin = await server.prisma.checkIn.findFirst({ where: { id, coupleId } });
        if (!checkin) return reply.status(404).send({ error: "Check-in not found" });

        const parsed = RespondCheckInSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid response", details: parsed.error.flatten() });

        // Determine if user is partner 1 or 2
        const isUser1 = !checkin.user1Id || checkin.user1Id === userId;
        const updates: any = {};

        if (isUser1) {
            updates.user1Id = userId;
            updates.mood1 = parsed.data.mood;
            updates.response1 = parsed.data.response;
        } else {
            updates.user2Id = userId;
            updates.mood2 = parsed.data.mood;
            updates.response2 = parsed.data.response;
        }

        // Auto-reveal if both have answered
        const willReveal = isUser1
            ? checkin.mood2 !== null
            : checkin.mood1 !== null;
        if (willReveal) updates.revealed = true;

        const updated = await server.prisma.checkIn.update({ where: { id }, data: updates });
        return fmt(updated);
    });

    // Delete check-in
    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const existing = await server.prisma.checkIn.findFirst({ where: { id, coupleId } });
        if (!existing) return reply.status(404).send({ error: "Check-in not found" });

        await server.prisma.checkIn.delete({ where: { id } });
        return { success: true };
    });
}
