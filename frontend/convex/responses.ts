import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { responseStatus } from "./schema";
import { requireUser, requireUserId, toPublicProfile, toResponse } from "./lib/helpers";
import { CAN_RECEIVE_FROM } from "./lib/compat";

async function upsertResponse(
  ctx: MutationCtx,
  requestId: Id<"bloodRequests">,
  status: "ACCEPTED" | "CONFIRMED" | "ARRIVED" | "CANCELLED",
  distanceMeters?: number,
  etaMinutes?: number,
) {
  const donor = await requireUser(ctx);
  const request = await ctx.db.get(requestId);
  if (!request) throw new Error("Request not found");
  if (request.requesterId === donor._id) throw new Error("You can't respond to your own request");

  const existing = await ctx.db
    .query("donorResponses")
    .withIndex("by_request_donor", (q) => q.eq("requestId", requestId).eq("donorId", donor._id))
    .unique();
  const open = request.status === "searching" || request.status === "donor_accepted";
  if (!open && status !== "CANCELLED") throw new Error("This request is no longer active");
  if (!existing && status === "CANCELLED") throw new Error("No response to cancel");

  if (!existing) {
    if (!donor.bloodGroup || !CAN_RECEIVE_FROM[request.bloodGroup].includes(donor.bloodGroup)) {
      throw new Error("Your blood group is not compatible with this request");
    }
  }

  const fields = {
    status,
    distanceMeters: distanceMeters ?? existing?.distanceMeters,
    etaMinutes: etaMinutes ?? existing?.etaMinutes,
    respondedAt: Date.now(),
  };
  if (existing) await ctx.db.patch(existing._id, fields);
  else await ctx.db.insert("donorResponses", { requestId, donorId: donor._id, ...fields });

  // Recompute from source so the count can't drift.
  const all = await ctx.db
    .query("donorResponses")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect();
  const active = all.filter((r) => r.status !== "CANCELLED");
  const latest = [...active].sort((a, b) => b.respondedAt - a.respondedAt)[0];
  const latestDonor = latest ? await ctx.db.get(latest.donorId) : null;

  let nextStatus = request.status;
  if (open) nextStatus = active.length > 0 ? "donor_accepted" : "searching";
  await ctx.db.patch(requestId, {
    confirmedCount: active.length,
    donorName: latestDonor ? (latestDonor.fullName ?? latestDonor.name) : undefined,
    donorPhone: latestDonor?.phone,
    status: nextStatus,
  });

  if (!existing || existing.status === "CANCELLED") {
    if (status === "ACCEPTED") {
      const name = donor.fullName ?? donor.name ?? "A donor";
      await ctx.db.insert("notifications", {
        userId: request.requesterId,
        requestId,
        title: "A donor is on the way",
        message: `${name} accepted your request for ${request.bloodGroup} at ${request.hospitalName}.`,
        type: "request_update",
        status: "unread",
      });
      await ctx.db.insert("activities", {
        userId: donor._id,
        requestId,
        eventType: "donor_accepted",
        description: `Accepted a request for ${request.bloodGroup} at ${request.hospitalName}.`,
      });
      if (request.contactPhone) {
        await ctx.scheduler.runAfter(0, internal.delivery.sendSms, {
          items: [{ to: request.contactPhone }],
          body: `Blood Axis: ${name} offered to donate blood for ${request.patientName ?? "your patient"}. They may contact you shortly.`,
        });
      }
    }
  }
  const saved = await ctx.db
    .query("donorResponses")
    .withIndex("by_request_donor", (q) => q.eq("requestId", requestId).eq("donorId", donor._id))
    .unique();
  return toResponse(saved!);
}

export const respond = mutation({
  args: {
    requestId: v.id("bloodRequests"),
    status: v.optional(responseStatus),
    distanceMeters: v.optional(v.number()),
    etaMinutes: v.optional(v.number()),
  },
  handler: (ctx, a) => upsertResponse(ctx, a.requestId, a.status ?? "ACCEPTED", a.distanceMeters, a.etaMinutes),
});

export const cancel = mutation({
  args: { requestId: v.id("bloodRequests") },
  handler: (ctx, a) => upsertResponse(ctx, a.requestId, "CANCELLED"),
});

/** Requesters see every responder; a donor sees only their own response. */
export const listForRequest = query({
  args: { requestId: v.id("bloodRequests") },
  handler: async (ctx, { requestId }) => {
    const viewerId = await requireUserId(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) return [];
    const rows = await ctx.db
      .query("donorResponses")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .collect();
    const visible = request.requesterId === viewerId ? rows : rows.filter((r) => r.donorId === viewerId);
    return Promise.all(
      visible.map(async (r) => {
        const donor = await ctx.db.get(r.donorId);
        return toResponse(r, donor ? toPublicProfile(donor) : null);
      }),
    );
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const donorId = await requireUserId(ctx).catch(() => null);
    if (!donorId) return [];
    const rows = await ctx.db
      .query("donorResponses")
      .withIndex("by_donor", (q) => q.eq("donorId", donorId))
      .collect();
    return rows.map((r) => ({ request_id: r.requestId, status: r.status }));
  },
});
