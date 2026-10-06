import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { BLOOD_GROUPS, CAN_RECEIVE_FROM, haversineKm, type Blood } from "./compat";

export const DONATION_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
export const FATIGUE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type DonorMatch = { donor: Doc<"users">; distanceKm: number; exact: boolean };

/**
 * Available, compatible donors within `radiusKm`, not in cooldown. Exact blood
 * group matches rank first, then by distance. Notification fatigue is checked
 * separately (see `notifiedRecently`).
 */
export async function findDonors(
  ctx: QueryCtx,
  opts: { lat: number; lng: number; radiusKm: number; bloodGroup: Blood; excludeUserId?: string },
): Promise<DonorMatch[]> {
  const now = Date.now();
  const groups = CAN_RECEIVE_FROM[opts.bloodGroup] ?? [opts.bloodGroup];
  const matches: DonorMatch[] = [];
  for (const group of groups) {
    const donors = await ctx.db
      .query("users")
      .withIndex("by_available_group", (q) => q.eq("isAvailableDonor", true).eq("bloodGroup", group))
      .collect();
    for (const donor of donors) {
      if (donor._id === opts.excludeUserId) continue;
      if (donor.lat == null || donor.lng == null) continue;
      if (donor.cooldownUntil && donor.cooldownUntil > now) continue;
      if (donor.lastDonationDate && donor.lastDonationDate > now - DONATION_COOLDOWN_MS) continue;
      const distanceKm = haversineKm(opts.lat, opts.lng, donor.lat, donor.lng);
      if (distanceKm > opts.radiusKm) continue;
      matches.push({ donor, distanceKm, exact: group === opts.bloodGroup });
    }
  }
  matches.sort((a, b) => Number(b.exact) - Number(a.exact) || a.distanceKm - b.distanceKm);
  return matches;
}

export async function notifiedRecently(ctx: QueryCtx, donorId: Doc<"users">["_id"]) {
  const recent = await ctx.db
    .query("notificationLogs")
    .withIndex("by_donor", (q) => q.eq("donorId", donorId).gt("_creationTime", Date.now() - FATIGUE_WINDOW_MS))
    .first();
  return recent !== null;
}

export { BLOOD_GROUPS };
