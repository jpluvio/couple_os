import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

// Reuse the same Redis connection across all queues to save connections
export const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
}) as any;

/**
 * Queue for handling recurring / scheduled background jobs (Cron tasks).
 */
export const cronQueue = new Queue("cron-jobs", { connection });

/**
 * Queue for dispatching immediate or scheduled push notifications to user devices.
 */
export const notificationQueue = new Queue("notifications", { connection });
