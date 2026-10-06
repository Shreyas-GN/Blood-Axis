import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { bloodGroup } from "./schema";
import { requireOwnedRequest, requireUserId, toPublicProfile, toRequest, toResponse } from "./lib/helpers";

export const EXPIRY_MS = 2 * 60 * 60 * 1000;
const MAX_OPEN_REQUESTS = 5;
const OPEN = ["searching", "donor_accepted"] as const;

function normalizeUrgency(u?: string) {
  switch ((u ?? "").toLowerCase()) {
    case "immediate": return "IMMEDIATE" as const;
    case "high":
    case "today": return "TODAY" as const;
    case "medium":
    case "scheduled": return "SCHEDULED" as const;
    default: return undefined;
  }
}

const clean = (s?: string, max = 200) => {
  const t = s?.trim();
  return t ? t.slice(0, max) : undefined;
};

function assertCoords(lat?: number, lng?: number) {
  if (lat === undefined || lng === undefined) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Invalid coordinates");
  }
}

async function withResponses(ctx: QueryCtx, r: Doc<"bloodRequests">, viewerId: Id<"users"> | null) {
  const isOwner = viewerId !== null && r.requesterId === viewerId;
  const responses = await ctx.db
    .query("donorResponses")
    .withIndex("by_request", (q) => q.eq("requestId", r._id))
    .collect();
  const donor_responses = await Promise.all(
    responses.map(async (resp) => {
      if (!isOwner) return toResponse(resp, null);
      const donor = await ctx.db.get(resp.donorId);
      return toResponse(resp, donor ? toPublicProfile(donor) : null);
    }),
  );
  // Contact details are only shared with the requester and donors who have accepted.
  const hasActiveResponse = responses.some((x) => x.donorId === viewerId && x.status !== "CANCELLED");
  const base = toRequest(r, viewerId);
  const visible = isOwner || hasActiveResponse ? base : { ...base, contact_phone: null };
  return { ...visible, donor_responses };
}

export const create = mutation({
  args: {
    bloodGroup,
    units: v.number(),
    hospitalName: v.string(),
    patientName: v.optional(v.string()),
    city: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),
    location: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    note: v.optional(v.string()),
    requesterRelation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    assertCoords(args.lat, args.lng);
    const hospitalName = clean(args.hospitalName);
    if (!hospitalName) throw new Error("Hospital name is required");
    if (!Number.isInteger(args.units) || args.units < 1 || args.units > 10) throw new Error("Units must be 1-10");

    const open = await ctx.db
      .query("bloodRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .filter((q) => q.or(q.eq(q.field("status"), "searching"), q.eq(q.field("status"), "donor_accepted")))
      .collect();
    if (open.length >= MAX_OPEN_REQUESTS) throw new Error("You already have too many open requests");

    const id = await ctx.db.insert("bloodRequests", {
      requesterId: userId,
      bloodGroup: args.bloodGroup,
      units: args.units,
      hospitalName,
      patientName: clean(args.patientName),
      city: clean(args.city, 100),
      contactPhone: clean(args.contactPhone, 30),
      urgencyLevel: normalizeUrgency(args.urgencyLevel),
      location: clean(args.location, 100),
      lat: args.lat,
      lng: args.lng,
      note: clean(args.note, 500),
      requesterRelation: clean(args.requesterRelation, 30),
      status: "searching",
      escalationPhase: 0,
      notifiedCount: 0,
      confirmedCount: 0,
    });
    await ctx.db.insert("activities", {
      userId,
      requestId: id,
      eventType: "request_created",
      description: `Created an emergency request for ${args.bloodGroup} at ${hospitalName}.`,
    });
    await ctx.scheduler.runAfter(0, internal.alerts.runPhase, { requestId: id, phase: 1 });
    await ctx.scheduler.runAfter(EXPIRY_MS, internal.requests.expire, { requestId: id });
    return toRequest((await ctx.db.get(id))!, userId);
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) return [];
    const rows = await ctx.db.query("bloodRequests").order("desc").take(100);
    return Promise.all(rows.map((r) => withResponses(ctx, r, viewerId)));
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) return [];
    const rows = await ctx.db
      .query("bloodRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", viewerId))
      .order("desc")
      .collect();
    return Promise.all(rows.map((r) => withResponses(ctx, r, viewerId)));
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) return null;
    const rid = ctx.db.normalizeId("bloodRequests", id);
    const r = rid && (await ctx.db.get(rid));
    return r ? withResponses(ctx, r, viewerId) : null;
  },
});

/** Non-sensitive fields only; used for link previews before sign-in. */
export const getPublicMeta = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const rid = ctx.db.normalizeId("bloodRequests", id);
    const r = rid && (await ctx.db.get(rid));
    if (!r) return null;
    return { blood_group: r.bloodGroup, units: r.units, hospital_name: r.hospitalName, city: r.city ?? null, status: r.status };
  },
});

export const update = mutation({
  args: {
    id: v.id("bloodRequests"),
    patientName: v.optional(v.string()),
    hospitalName: v.optional(v.string()),
    city: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    units: v.optional(v.number()),
    urgencyLevel: v.optional(v.string()),
    note: v.optional(v.string()),
    requesterRelation: v.optional(v.string()),
    location: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const { userId, request } = await requireOwnedRequest(ctx, id);
    if (!OPEN.includes(request.status as (typeof OPEN)[number])) throw new Error("Request is closed");
    assertCoords(rest.lat, rest.lng);
    if (rest.units !== undefined && (!Number.isInteger(rest.units) || rest.units < 1 || rest.units > 10)) {
      throw new Error("Units must be 1-10");
    }
    const patch: Partial<Doc<"bloodRequests">> = {};
    if (rest.patientName !== undefined) patch.patientName = clean(rest.patientName);
    if (rest.hospitalName !== undefined) {
      const h = clean(rest.hospitalName);
      if (!h) throw new Error("Hospital name is required");
      patch.hospitalName = h;
    }
    if (rest.city !== undefined) patch.city = clean(rest.city, 100);
    if (rest.contactPhone !== undefined) patch.contactPhone = clean(rest.contactPhone, 30);
    if (rest.units !== undefined) patch.units = rest.units;
    if (rest.urgencyLevel !== undefined) patch.urgencyLevel = normalizeUrgency(rest.urgencyLevel);
    if (rest.note !== undefined) patch.note = clean(rest.note, 500);
    if (rest.requesterRelation !== undefined) patch.requesterRelation = clean(rest.requesterRelation, 30);
    if (rest.location !== undefined) patch.location = clean(rest.location, 100);
    if (rest.lat !== undefined) patch.lat = rest.lat;
    if (rest.lng !== undefined) patch.lng = rest.lng;
    await ctx.db.patch(id, patch);
    return toRequest((await ctx.db.get(id))!, userId);
  },
});

async function close(
  ctx: MutationCtx,
  id: Id<"bloodRequests">,
  status: "cancelled" | "fulfilled",
) {
  const { userId, request } = await requireOwnedRequest(ctx, id);
  if (!OPEN.includes(request.status as (typeof OPEN)[number])) throw new Error("Request is already closed");
  await ctx.db.patch(id, { status });
  await ctx.db.insert("activities", {
    userId,
    requestId: id,
    eventType: status === "fulfilled" ? "request_fulfilled" : "request_cancelled",
    description: status === "fulfilled" ? "Marked the request as fulfilled." : "Cancelled the request.",
  });
}

export const cancel = mutation({
  args: { id: v.id("bloodRequests") },
  handler: (ctx, { id }) => close(ctx, id, "cancelled"),
});

export const fulfill = mutation({
  args: { id: v.id("bloodRequests") },
  handler: (ctx, { id }) => close(ctx, id, "fulfilled"),
});

export const expire = internalMutation({
  args: { requestId: v.id("bloodRequests") },
  handler: async (ctx, { requestId }) => {
    const r = await ctx.db.get(requestId);
    if (!r || r.status !== "searching") return;
    await ctx.db.patch(requestId, { status: "expired" });
    await ctx.db.insert("activities", {
      userId: r.requesterId,
      requestId,
      eventType: "request_expired",
      description: "Request expired without a donor response.",
    });
  },
});
