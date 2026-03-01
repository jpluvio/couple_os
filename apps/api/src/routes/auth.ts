import type { FastifyInstance } from "fastify";
import { GoogleAuthRequestSchema } from "@couple-os/shared";
import { verifyGoogleToken } from "../lib/google.js";

export async function authRoutes(server: FastifyInstance) {
    /**
     * POST /auth/google
     * Exchange a Google ID token for a JWT access token.
     */
    server.post("/google", async (request, reply) => {
        const parsed = GoogleAuthRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parsed.error.flatten(),
            });
        }

        try {
            const googleUser = await verifyGoogleToken(parsed.data.idToken);

            // Upsert user
            const user = await server.prisma.user.upsert({
                where: { googleId: googleUser.googleId },
                update: {
                    name: googleUser.name,
                    avatarUrl: googleUser.avatarUrl,
                },
                create: {
                    email: googleUser.email,
                    name: googleUser.name,
                    avatarUrl: googleUser.avatarUrl,
                    googleId: googleUser.googleId,
                },
            });

            // Generate JWT
            const accessToken = server.jwt.sign(
                { userId: user.id, email: user.email },
                { expiresIn: "15m" }
            );

            const refreshToken = server.jwt.sign(
                { userId: user.id, type: "refresh" },
                { expiresIn: "30d" }
            );

            // Set refresh token as httpOnly cookie
            reply.setCookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/auth",
                maxAge: 30 * 24 * 60 * 60, // 30 days
            });

            return {
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    coupleId: user.coupleId,
                    createdAt: user.createdAt.toISOString(),
                },
            };
        } catch (err) {
            server.log.error(err, "Google auth failed");
            return reply.status(401).send({ error: "Invalid Google token" });
        }
    });

    /**
     * POST /auth/refresh
     * Issue a new access token using the refresh token cookie.
     */
    server.post("/refresh", async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
            return reply.status(401).send({ error: "No refresh token" });
        }

        try {
            const payload = server.jwt.verify<{
                userId: string;
                type: string;
            }>(refreshToken);

            if (payload.type !== "refresh") {
                return reply.status(401).send({ error: "Invalid token type" });
            }

            const user = await server.prisma.user.findUnique({
                where: { id: payload.userId },
            });

            if (!user) {
                return reply.status(401).send({ error: "User not found" });
            }

            const accessToken = server.jwt.sign(
                { userId: user.id, email: user.email },
                { expiresIn: "15m" }
            );

            return { accessToken };
        } catch {
            return reply.status(401).send({ error: "Invalid refresh token" });
        }
    });

    /**
     * POST /auth/logout
     * Clear the refresh token cookie.
     */
    server.post("/logout", async (_request, reply) => {
        reply.clearCookie("refreshToken", { path: "/auth" });
        return { success: true };
    });

    /**
     * GET /auth/me
     * Get the current authenticated user.
     */
    server.get("/me", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            return reply.status(401).send({ error: "Unauthorized" });
        }

        const { userId } = request.user as { userId: string };
        const user = await server.prisma.user.findUnique({
            where: { id: userId },
            include: { couple: { include: { members: true } } },
        });

        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            coupleId: user.coupleId,
            createdAt: user.createdAt.toISOString(),
            couple: user.couple
                ? {
                    id: user.couple.id,
                    name: user.couple.name,
                    createdAt: user.couple.createdAt.toISOString(),
                    members: user.couple.members.map((m: { id: string; name: string; avatarUrl: string | null }) => ({
                        id: m.id,
                        name: m.name,
                        avatarUrl: m.avatarUrl,
                    })),
                }
                : null,
        };
    });
}
