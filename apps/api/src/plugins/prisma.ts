import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

export const prismaPlugin = fp(async (server: FastifyInstance) => {
    const prisma = new PrismaClient();

    await prisma.$connect();
    server.log.info("📦 Prisma connected to database");

    server.decorate("prisma", prisma);

    server.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
});
