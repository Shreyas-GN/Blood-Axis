import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activityType } from "./schema";
import { requireUserId, toActivity } from "./lib/helpers";

export const log = mutation({
  args: { eventType: activityType, description: v.string(), requestId: v.optional(v.id("bloodRequests")) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ctx.db.insert("activities", { userId, ...args, description: args.description.slice(0, 500) });
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()), eventType: v.optional(activityType) },
  handler: async (ctx, { limit, eventType }) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit ?? 10, 100));
    return rows.filter((a) => !eventType || a.eventType === eventType).map(toActivity);
  },
});
