import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import Expo, { ExpoPushMessage } from "expo-server-sdk";
import { connection } from "../lib/queue.js";

const prisma = new PrismaClient();
const expo = new Expo();

interface PushJobData {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

/**
 * Worker to process immediate push notifications.
 */
export const notificationWorker = new Worker("notifications", async (job) => {
    const data = job.data as PushJobData;
    console.log(`[Notification] Sending to user ${data.userId}: ${data.title}`);

    const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { pushTokens: true },
    });

    if (!user || user.pushTokens.length === 0) {
        return; // Nothing to do
    }

    const messages: ExpoPushMessage[] = [];
    for (const pushToken of user.pushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: "default",
            title: data.title,
            body: data.body,
            data: data.data,
        });
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log("[Notification] Sent chunk tickets:", ticketChunk);
        } catch (error) {
            console.error("[Notification] Error sending push notification:", error);
        }
    }
}, { connection });
