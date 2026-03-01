import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { prismaPlugin } from "./plugins/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { coupleRoutes } from "./routes/couples.js";
import { postRoutes } from "./routes/posts.js";
import { eventRoutes } from "./routes/events.js";
import { todoRoutes } from "./routes/todos.js";
import { pantryRoutes } from "./routes/pantry.js";
import { shoppingRoutes } from "./routes/shopping.js";
import { recipeRoutes } from "./routes/recipes.js";
import { financeRoutes } from "./routes/finance.js";
import { checkinRoutes } from "./routes/checkins.js";
import { memoryRoutes } from "./routes/memories.js";

const server = Fastify({
    logger: {
        level: "info",
        transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
    },
});

// --- Plugins ---
await server.register(cors, {
    origin: [
        "http://localhost:3000", // Next.js web
        "http://localhost:8081", // Expo dev
    ],
    credentials: true,
});

await server.register(cookie);

await server.register(jwt, {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    sign: { expiresIn: "15m" },
});

await server.register(prismaPlugin);

// --- Routes ---
await server.register(authRoutes, { prefix: "/auth" });
await server.register(coupleRoutes, { prefix: "/couples" });
await server.register(postRoutes, { prefix: "/posts" });
await server.register(eventRoutes, { prefix: "/events" });
await server.register(todoRoutes, { prefix: "/todos" });
await server.register(pantryRoutes, { prefix: "/pantry" });
await server.register(shoppingRoutes, { prefix: "/shopping" });
await server.register(recipeRoutes, { prefix: "/recipes" });
await server.register(financeRoutes, { prefix: "/finance" });
await server.register(checkinRoutes, { prefix: "/checkins" });
await server.register(memoryRoutes, { prefix: "/memories" });

// --- Health Check ---
server.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
});

// --- Start ---
const PORT = Number(process.env.API_PORT) || 3001;

try {
    await server.listen({ port: PORT, host: "0.0.0.0" });
    server.log.info(`🚀 Couple OS API running on http://localhost:${PORT}`);
} catch (err) {
    server.log.error(err);
    process.exit(1);
}

export default server;
