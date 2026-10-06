import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { bloodGroup } from "./schema";
import { requireUser, requireUserId, toProfile } from "./lib/helpers";
import { getAuthUserId } from "@convex-dev/auth/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    if (!id) return null;
    const user = await ctx.db.get(id);
    return user ? toProfile(user) : null;
  },
});

/** Role, verification and cooldown are deliberately not settable from here. */
export const update = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    bloodGroup: v.optional(bloodGroup),
    isAvailableDonor: v.optional(v.boolean()),
    city: v.optional(v.string()),
    location: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    age: v.optional(v.number()),
    lastDonationDate: v.optional(v.number()),
    profileCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.lat !== undefined && (args.lat < -90 || args.lat > 90)) throw new Error("Invalid latitude");
    if (args.lng !== undefined && (args.lng < -180 || args.lng > 180)) throw new Error("Invalid longitude");
    if (args.age !== undefined && (args.age < 16 || args.age > 100)) throw new Error("Invalid age");

    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(args)) if (val !== undefined) patch[k] = val;
    if (args.fullName !== undefined) patch.name = args.fullName;
    if (args.isAvailableDonor !== undefined) patch.isDonor = args.isAvailableDonor;
    await ctx.db.patch(user._id, patch);

    if (args.profileCompleted && !user.profileCompleted) {
      await ctx.db.insert("activities", {
        userId: user._id,
        eventType: "profile_completed",
        description: "Completed donor profile setup.",
      });
    }
    return toProfile((await ctx.db.get(user._id))!);
  },
});

export const registerFcmToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx);
    const tokens = [token, ...(user.fcmTokens ?? []).filter((t) => t !== token)].slice(0, 5);
    await ctx.db.patch(user._id, { fcmTokens: tokens });
  },
});

/** Records a completed donation and starts the 90-day cooldown. */
export const recordDonation = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    await ctx.db.patch(userId, {
      lastDonationDate: now,
      cooldownUntil: now + 90 * 24 * 60 * 60 * 1000,
    });
  },
});
