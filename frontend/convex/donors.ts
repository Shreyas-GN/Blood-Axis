import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/helpers";
import { findDonors } from "./lib/eligibility";

/**
 * Donors near a request, for the requester's map. Only the owner can call it,
 * phone numbers are never returned and coordinates are rounded (~1 km).
 */
export const nearbyForRequest = query({
  args: { requestId: v.id("bloodRequests"), radiusKm: v.optional(v.number()) },
  handler: async (ctx, { requestId, radiusKm }) => {
    const userId = await requireUserId(ctx);
    const request = await ctx.db.get(requestId);
    if (!request || request.requesterId !== userId || request.lat == null || request.lng == null) return [];
    const matches = await findDonors(ctx, {
      lat: request.lat,
      lng: request.lng,
      radiusKm: Math.min(radiusKm ?? 20, 50),
      bloodGroup: request.bloodGroup,
      excludeUserId: userId,
    });
    const round = (n: number) => Math.round(n * 100) / 100;
    return matches.map(({ donor, distanceKm }) => ({
      id: donor._id,
      full_name: donor.fullName ?? donor.name ?? "Donor",
      blood_group: donor.bloodGroup!,
      latitude: round(donor.lat!),
      longitude: round(donor.lng!),
      distance_meters: Math.round(distanceKm * 1000),
    }));
  },
});
