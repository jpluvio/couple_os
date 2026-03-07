import type { FastifyInstance } from "fastify";
import {
    CreatePostRequestSchema,
    UpdatePostRequestSchema,
    ToggleReactionRequestSchema,
} from "@couple-os/shared";

export async function postRoutes(server: FastifyInstance) {
    // All post routes require authentication
    server.addHook("onRequest", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            return reply.status(401).send({ error: "Unauthorized" });
        }
    });

    /**
     * Helper: get user's coupleId or 404
     */
    async function getUserCouple(userId: string) {
        const user = await server.prisma.user.findUnique({
            where: { id: userId },
        });
        return user?.coupleId ?? null;
    }

    /**
     * Helper: format a post with aggregated reactions
     */
    function formatPost(post: any, currentUserId: string) {
        // Aggregate reactions by emoji
        const reactionMap = new Map<
            string,
            { count: number; reacted: boolean }
        >();
        for (const r of post.reactions || []) {
            const existing = reactionMap.get(r.emoji);
            if (existing) {
                existing.count++;
                if (r.userId === currentUserId) existing.reacted = true;
            } else {
                reactionMap.set(r.emoji, {
                    count: 1,
                    reacted: r.userId === currentUserId,
                });
            }
        }

        return {
            id: post.id,
            content: post.content,
            pinned: post.pinned,
            tags: post.tags,
            authorId: post.authorId,
            coupleId: post.coupleId,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            author: post.author
                ? {
                    id: post.author.id,
                    name: post.author.name,
                    avatarUrl: post.author.avatarUrl,
                }
                : undefined,
            reactions: Array.from(reactionMap.entries()).map(
                ([emoji, { count, reacted }]) => ({
                    emoji,
                    count,
                    reacted,
                })
            ),
        };
    }

    /**
     * GET /posts
     * List all posts for the couple (pinned first, then chronological).
     */
    server.get("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const { cursor, limit = "20" } = request.query as {
            cursor?: string;
            limit?: string;
        };

        const take = Math.min(parseInt(limit, 10) || 20, 50);

        const posts = await server.prisma.post.findMany({
            where: { coupleId },
            include: {
                author: { select: { id: true, name: true, avatarUrl: true } },
                reactions: true,
            },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            take,
            ...(cursor
                ? { skip: 1, cursor: { id: cursor } }
                : {}),
        });

        return {
            posts: posts.map((p: any) => formatPost(p, userId)),
            nextCursor: posts.length === take ? posts[posts.length - 1].id : null,
        };
    });

    /**
     * POST /posts
     * Create a new post.
     */
    server.post("/", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const parsed = CreatePostRequestSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid post data", details: parsed.error.flatten() });

        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        const post = await server.prisma.post.create({
            data: {
                content: parsed.data.content,
                tags: parsed.data.tags || [],
                authorId: userId,
                coupleId,
                pinned: parsed.data.pinned || false,
            },
            include: { author: true, couple: { include: { members: true } } },
        });

        // Notify partner
        import("../lib/queue.js").then(({ notificationQueue }) => {
            const partner = post.couple.members.find(m => m.id !== userId);
            if (partner && partner.pushTokens.length > 0) {
                notificationQueue.add("push-notification", {
                    userId: partner.id,
                    title: "New Board Post 📌",
                    body: `${post.author.name} posted on the board: "${post.content.substring(0, 30)}${post.content.length > 30 ? "..." : ""}"`,
                    data: { url: "/dashboard?tab=board" },
                });
            }
        });

        return formatPost(post, userId);
    });

    /**
     * PATCH /posts/:id
     * Update a post (content, tags, pin).
     */
    server.patch("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const existing = await server.prisma.post.findFirst({
            where: { id, coupleId },
        });

        if (!existing) {
            return reply.status(404).send({ error: "Post not found" });
        }

        // Only author can edit content/tags, but either partner can pin
        const parsed = UpdatePostRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({ error: "Invalid update", details: parsed.error.flatten() });
        }

        const updates: any = {};
        if (parsed.data.pinned !== undefined) updates.pinned = parsed.data.pinned;
        if (existing.authorId === userId) {
            if (parsed.data.content !== undefined)
                updates.content = parsed.data.content;
            if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;
        }

        const post = await server.prisma.post.update({
            where: { id },
            data: updates,
            include: {
                author: { select: { id: true, name: true, avatarUrl: true } },
                reactions: true,
            },
        });

        return formatPost(post, userId);
    });

    /**
     * DELETE /posts/:id
     * Delete a post (author only).
     */
    server.delete("/:id", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id } = request.params as { id: string };
        const coupleId = await getUserCouple(userId);

        if (!coupleId) {
            return reply.status(403).send({ error: "You must be in a couple" });
        }

        const existing = await server.prisma.post.findFirst({
            where: { id, coupleId, authorId: userId },
        });

        if (!existing) {
            return reply
                .status(404)
                .send({ error: "Post not found or you are not the author" });
        }

        await server.prisma.post.delete({ where: { id } });
        return { success: true };
    });

    /**
     * POST /posts/:id/reactions
     * Toggle a reaction on a post (add if not exists, remove if exists).
     */
    server.post("/:id/reactions", async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { id: postId } = request.params as { id: string };

        const parsed = ToggleReactionRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid reaction data", details: parsed.error.flatten() });
        }

        const { emoji } = parsed.data;

        const coupleId = await getUserCouple(userId);
        if (!coupleId) return reply.status(403).send({ error: "You must be in a couple" });

        // Ensure post belongs to couple
        const post = await server.prisma.post.findFirst({
            where: { id: postId, coupleId },
            include: { author: true },
        });
        if (!post) return reply.status(404).send({ error: "Post not found" });

        // Check if reaction exists
        const existing = await server.prisma.reaction.findUnique({
            where: {
                userId_postId_emoji: { userId, postId, emoji },
            },
        });

        if (existing) {
            // Remove
            await server.prisma.reaction.delete({ where: { id: existing.id } });
            return { success: true, action: "removed" };
        } else {
            // Add
            await server.prisma.reaction.create({
                data: { userId, postId, emoji },
            });

            // Notify post author if it's someone else's post
            if (post.authorId !== userId) {
                import("../lib/queue.js").then(({ notificationQueue }) => {
                    server.prisma.user.findUnique({ where: { id: userId } }).then((reactor) => {
                        const reactorName = reactor?.name || "Your partner";
                        if (post.author.pushTokens.length > 0) {
                            notificationQueue.add("push-notification", {
                                userId: post.authorId,
                                title: "New Reaction 😂",
                                body: `${reactorName} reacted ${emoji} to your post.`,
                                data: { url: "/dashboard?tab=board" },
                            });
                        }
                    });
                });
            }

            return { success: true, action: "added" };
        }
    });
}
