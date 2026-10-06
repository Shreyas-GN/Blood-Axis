import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendSms as smsSend } from "./lib/sms";
import { sendFcm } from "./lib/fcm";

/** Actions only do network I/O; results are written back through mutations. */

export const setLogStatus = internalMutation({
  args: {
    logId: v.id("notificationLogs"),
    status: v.union(v.literal("SENT"), v.literal("DELIVERED"), v.literal("FAILED")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { logId, status, error }) => {
    const log = await ctx.db.get(logId);
    if (!log) return;
    await ctx.db.patch(logId, { status, metadata: { ...(log.metadata ?? {}), ...(error ? { error } : {}) } });
  },
});

export const removeTokens = internalMutation({
  args: { userId: v.id("users"), tokens: v.array(v.string()) },
  handler: async (ctx, { userId, tokens }) => {
    const user = await ctx.db.get(userId);
    if (!user?.fcmTokens) return;
    await ctx.db.patch(userId, { fcmTokens: user.fcmTokens.filter((t) => !tokens.includes(t)) });
  },
});

export const sendPush = internalAction({
  args: {
    batch: v.array(v.object({ logId: v.id("notificationLogs"), donorId: v.id("users"), tokens: v.array(v.string()) })),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { batch, title, body, url }) => {
    for (const item of batch) {
      try {
        const results = await sendFcm(item.tokens, { title, body, url });
        if (results === null) {
          // FCM not configured: the in-app notification is the delivery.
          await ctx.runMutation(internal.delivery.setLogStatus, { logId: item.logId, status: "DELIVERED", error: "fcm_not_configured" });
          continue;
        }
        const invalid = results.filter((r) => r.invalid).map((r) => r.token);
        if (invalid.length) await ctx.runMutation(internal.delivery.removeTokens, { userId: item.donorId, tokens: invalid });
        const ok = results.some((r) => r.ok);
        await ctx.runMutation(internal.delivery.setLogStatus, {
          logId: item.logId,
          status: ok ? "DELIVERED" : "FAILED",
          error: ok ? undefined : results[0]?.error,
        });
      } catch (e) {
        await ctx.runMutation(internal.delivery.setLogStatus, { logId: item.logId, status: "FAILED", error: String(e).slice(0, 200) });
      }
    }
  },
});

export const sendSms = internalAction({
  args: {
    items: v.array(v.object({ to: v.string(), logId: v.optional(v.id("notificationLogs")) })),
    body: v.string(),
  },
  handler: async (ctx, { items, body }) => {
    for (const item of items) {
      let status: "DELIVERED" | "FAILED" = "DELIVERED";
      let error: string | undefined;
      try {
        const sent = await smsSend(item.to, body);
        if (!sent) error = "sms_not_configured";
      } catch (e) {
        status = "FAILED";
        error = String(e).slice(0, 200);
      }
      if (item.logId) await ctx.runMutation(internal.delivery.setLogStatus, { logId: item.logId, status: error === "sms_not_configured" ? "FAILED" : status, error });
    }
  },
});

export const sendTelegram = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, { text }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    if (!res.ok) console.error("[telegram] failed", res.status);
  },
});
