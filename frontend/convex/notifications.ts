import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId, toNotification } from "./lib/helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (!userId) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);
    return rows.map(toNotification);
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const n = await ctx.db.get(id);
    if (!n || n.userId !== userId) throw new Error("Not found");
    if (n.status === "unread") await ctx.db.patch(id, { status: "read", readAt: Date.now() });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const now = Date.now();
    await Promise.all(
      rows.filter((n) => n.status === "unread").map((n) => ctx.db.patch(n._id, { status: "read", readAt: now })),
    );
  },
});
