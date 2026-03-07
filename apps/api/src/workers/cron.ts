import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { connection, notificationQueue } from "../lib/queue.js";

const prisma = new PrismaClient();

/**
 * Worker to process scheduled Cron Jobs
 * Runs daily at a specific time or on an interval.
 */
export const cronWorker = new Worker("cron-jobs", async (job) => {
    console.log(`[Cron] Processing job: ${job.name}`);

    if (job.name === "pantry-expiry-check") {
        await processPantryExpiries();
    } else if (job.name === "todo-deadline-check") {
        await processTodoDeadlines();
    } else if (job.name === "on-this-day-check") {
        await processOnThisDay();
    }
}, { connection });

/**
 * Finds all memories created on this same exact month/day in previous years and notifies the couple.
 */
async function processOnThisDay() {
    const today = new Date();
    const month = today.getMonth(); // 0-11
    const day = today.getDate();    // 1-31

    // Rather than pulling all memories, Prisma allows raw queries, but for simplicity
    // and DB independence we'll fetch all memories and filter locally since this is a 
    // daily background job. In production with millions of rows, use a raw SQL `EXTRACT(MONTH FROM date)`.
    const memories = await prisma.memory.findMany({
        include: { couple: { include: { members: true } } },
    });

    const memoriesToday = memories.filter((m) => {
        const memDate = new Date(m.date);
        return memDate.getMonth() === month && memDate.getDate() === day && memDate.getFullYear() < today.getFullYear();
    });

    for (const m of memoriesToday) {
        const yearsAgo = today.getFullYear() - new Date(m.date).getFullYear();
        for (const member of m.couple.members) {
            if (member.pushTokens.length > 0) {
                await notificationQueue.add("push-notification", {
                    userId: member.id,
                    title: `On This Day (${yearsAgo} yr${yearsAgo > 1 ? "s" : ""} ago) 📸`,
                    body: "We made a beautiful memory together. Open Couple OS to see it.",
                    data: { url: "/dashboard?tab=memories" },
                });
            }
        }
    }
    console.log(`[Cron] Queued 'On This Day' notifications for ${memoriesToday.length} memories.`);
}

/**
 * Finds all pantry items expiring in exactly 3 days and queues push notifications.
 */
async function processPantryExpiries() {
    // Calculate the target date (3 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);

    // Set to start and end of that day
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const expiringItems = await prisma.pantryItem.findMany({
        where: {
            expiresAt: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        include: {
            couple: {
                include: { members: true },
            },
        },
    });

    for (const item of expiringItems) {
        // Queue a notification for each member of the couple
        for (const member of item.couple.members) {
            if (member.pushTokens.length > 0) {
                await notificationQueue.add("push-notification", {
                    userId: member.id,
                    title: "Pantry Alert 🫙",
                    body: `${item.name} is expiring in 3 days!`,
                    data: { url: "/dashboard?tab=pantry" },
                });
            }
        }
    }

    console.log(`[Cron] Queued pantry expiry notifications for ${expiringItems.length} items.`);
}

/**
 * Finds all TodoItems due in the next 24 hours and notifies assigned partners or both.
 */
async function processTodoDeadlines() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueItems = await prisma.todoItem.findMany({
        where: {
            deadline: {
                gte: now,
                lte: tomorrow,
            },
            status: { not: "DONE" },
        },
        include: { list: { include: { couple: { include: { members: true } } } } },
    });

    for (const item of dueItems) {
        // If assigned to specific user, notify only them, else notify both members
        const targetIds = item.assigneeId ? [item.assigneeId] : item.list.couple.members.map(m => m.id);

        for (const member of item.list.couple.members) {
            if (targetIds.includes(member.id) && member.pushTokens.length > 0) {
                await notificationQueue.add("push-notification", {
                    userId: member.id,
                    title: "Task Due Soon ✅",
                    body: `"${item.title}" is due in less than 24 hours.`,
                    data: { url: "/dashboard?tab=todo" },
                });
            }
        }
    }

    console.log(`[Cron] Queued To-Do deadline notifications for ${dueItems.length} tasks.`);
}
