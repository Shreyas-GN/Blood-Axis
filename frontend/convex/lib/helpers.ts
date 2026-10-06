import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const id = await getAuthUserId(ctx);
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const id = await requireUserId(ctx);
  const user = await ctx.db.get(id);
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOwnedRequest(ctx: Ctx, requestId: Id<"bloodRequests">) {
  const userId = await requireUserId(ctx);
  const request = await ctx.db.get(requestId);
  if (!request) throw new Error("Request not found");
  if (request.requesterId !== userId) throw new Error("Forbidden: not your request");
  return { userId, request };
}

const iso = (ms?: number | null) => (ms == null ? null : new Date(ms).toISOString());

/** Own profile. Row shape matches the frontend `User` type (snake_case). */
export function toProfile(u: Doc<"users">) {
  return {
    id: u._id,
    email: u.email ?? null,
    full_name: u.fullName ?? u.name ?? "",
    phone: u.phone ?? null,
    blood_group: u.bloodGroup ?? null,
    is_donor: u.isDonor ?? false,
    is_available_donor: u.isAvailableDonor ?? false,
    city: u.city ?? null,
    profile_completed: u.profileCompleted ?? false,
    location: u.location ?? null,
    latitude: u.lat ?? null,
    longitude: u.lng ?? null,
    age: u.age ?? null,
    last_donation_date: iso(u.lastDonationDate),
    cooldown_until: iso(u.cooldownUntil),
    is_verified: u.isVerified ?? false,
    role: u.role ?? "donor",
    is_anonymous: u.isAnonymous ?? false,
    created_at: iso(u._creationTime)!,
  };
}

/** What other users may see about someone. */
export function toPublicProfile(u: Doc<"users">) {
  return {
    id: u._id,
    full_name: u.fullName ?? u.name ?? "Donor",
    phone: u.phone ?? null,
    blood_group: u.bloodGroup ?? null,
  };
}

export function toRequest(r: Doc<"bloodRequests">, viewerId: Id<"users"> | null) {
  const isOwner = viewerId !== null && r.requesterId === viewerId;
  return {
    id: r._id,
    requester_id: r.requesterId,
    blood_group: r.bloodGroup,
    units: r.units,
    patient_name: r.patientName ?? null,
    hospital_name: r.hospitalName,
    city: r.city ?? null,
    contact_phone: r.contactPhone ?? null,
    urgency_level: r.urgencyLevel ?? null,
    location: r.location ?? null,
    latitude: r.lat ?? null,
    longitude: r.lng ?? null,
    status: r.status,
    escalation_phase: r.escalationPhase,
    notified_count: r.notifiedCount,
    confirmed_count: r.confirmedCount,
    donor_name: isOwner ? (r.donorName ?? null) : null,
    donor_phone: isOwner ? (r.donorPhone ?? null) : null,
    note: r.note ?? null,
    requester_relation: r.requesterRelation ?? null,
    created_at: iso(r._creationTime)!,
  };
}

export function toResponse(
  r: Doc<"donorResponses">,
  profile?: ReturnType<typeof toPublicProfile> | null,
) {
  return {
    id: r._id,
    request_id: r.requestId,
    donor_id: r.donorId,
    status: r.status,
    distance_meters: r.distanceMeters ?? null,
    eta_minutes: r.etaMinutes ?? null,
    responded_at: iso(r.respondedAt),
    created_at: iso(r._creationTime)!,
    ...(profile !== undefined ? { profiles: profile } : {}),
  };
}

export function toNotification(n: Doc<"notifications">) {
  return {
    id: n._id,
    user_id: n.userId,
    request_id: n.requestId ?? null,
    title: n.title,
    message: n.message,
    type: n.type,
    status: n.status,
    sent_at: iso(n._creationTime)!,
    read_at: iso(n.readAt),
  };
}

export function toActivity(a: Doc<"activities">) {
  return {
    id: a._id,
    user_id: a.userId,
    request_id: a.requestId ?? null,
    event_type: a.eventType,
    description: a.description,
    created_at: iso(a._creationTime)!,
  };
}
