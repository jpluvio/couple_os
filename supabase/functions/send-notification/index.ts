import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  push_tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload: PushPayload = await req.json();

  if (!payload.push_tokens?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = payload.push_tokens
    .filter((token) => token.startsWith("ExponentPushToken["))
    .map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default",
    }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await res.json();

  return new Response(JSON.stringify({ sent: messages.length, result }), {
    headers: { "Content-Type": "application/json" },
  });
});
