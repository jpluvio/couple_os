import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import {
    CreateCoupleRequestSchema,
    JoinCoupleRequestSchema,
} from "@couple-os/shared";
import {
    generateInviteCode,
    getInviteExpiry,
    isInviteExpired,
} from "../lib/invite.js";

async function requireAuth(server: FastifyInstance, request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch {
        return reply.status(401).send({ error: "Unauthorized" });
    }
}

export async function coupleRoutes(server: FastifyInstance) {
    // All couple routes require authentication
    server.addHook("onRequest", async (request, reply) => {
        await requireAuth(server, request, reply);
    });

    /**
     * POST /couples
     * Create a new couple and generate an invite code.
     */
    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };

        // Check if user already in a couple
        const existingUser = await server.prisma.user.findUnique({
            where: { id: userId },
        });

        if (existingUser?.coupleId) {
            return reply
                .status(409)
                .send({ error: "You are already part of a couple" });
        }

        const parsed = CreateCoupleRequestSchema.safeParse(request.body);
        const coupleName = parsed.success ? parsed.data.name : null;

        // Create couple + invite code in a transaction
        const result = await server.prisma.$transaction(async (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => {
            const couple = await tx.couple.create({
                data: { name: coupleName ?? null },
            });

            await tx.user.update({
                where: { id: userId },
                data: { coupleId: couple.id },
            });

            const code = generateInviteCode();
            const inviteCode = await tx.inviteCode.create({
                data: {
                    code,
                    coupleId: couple.id,
                    expiresAt: getInviteExpiry(),
                },
            });

            const updatedCouple = await tx.couple.findUnique({
                where: { id: couple.id },
                include: { members: true },
            });

            return { couple: updatedCouple!, inviteCode: inviteCode.code };
        });

        return {
            couple: {
                id: result.couple.id,
                name: result.couple.name,
                createdAt: result.couple.createdAt.toISOString(),
                members: result.couple.members.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    avatarUrl: m.avatarUrl,
                })),
            },
            inviteCode: result.inviteCode,
        };
    });

    /**
     * POST /couples/join
     * Join an existing couple using an invite code.
     */
    server.post("/join", async (request, reply) => {
        const { userId } = request.user as { userId: string };

        const existingUser = await server.prisma.user.findUnique({
            where: { id: userId },
        });

        if (existingUser?.coupleId) {
            return reply
                .status(409)
                .send({ error: "You are already part of a couple" });
        }

        const parsed = JoinCoupleRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid invite code format",
                details: parsed.error.flatten(),
            });
        }

        const invite = await server.prisma.inviteCode.findUnique({
            where: { code: parsed.data.inviteCode },
            include: { couple: { include: { members: true } } },
        });

        if (!invite) {
            return reply.status(404).send({ error: "Invite code not found" });
        }

        if (invite.used) {
            return reply
                .status(410)
                .send({ error: "Invite code has already been used" });
        }

        if (isInviteExpired(invite.expiresAt)) {
            return reply.status(410).send({ error: "Invite code has expired" });
        }

        if (invite.couple.members.length >= 2) {
            return reply.status(409).send({ error: "This couple is already full" });
        }

        // Join the couple in a transaction
        const result = await server.prisma.$transaction(async (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => {
            await tx.user.update({
                where: { id: userId },
                data: { coupleId: invite.coupleId },
            });

            await tx.inviteCode.update({
                where: { id: invite.id },
                data: { used: true },
            });

            return tx.couple.findUnique({
                where: { id: invite.coupleId },
                include: { members: true },
            });
        });

        return {
            couple: {
                id: result!.id,
                name: result!.name,
                createdAt: result!.createdAt.toISOString(),
                members: result!.members.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    avatarUrl: m.avatarUrl,
                })),
            },
        };
    });

    /**
     * GET /couples/me
     * Get the current user's couple info.
     */
    server.get("/me", async (request, reply) => {
        const { userId } = request.user as { userId: string };

        const user = await server.prisma.user.findUnique({
            where: { id: userId },
            include: {
                couple: { include: { members: true } },
            },
        });

        if (!user?.couple) {
            return reply
                .status(404)
                .send({ error: "You are not part of a couple yet" });
        }

        return {
            couple: {
                id: user.couple.id,
                name: user.couple.name,
                createdAt: user.couple.createdAt.toISOString(),
                members: user.couple.members.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    avatarUrl: m.avatarUrl,
                })),
            },
        };
    });
}
