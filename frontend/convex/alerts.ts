import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { findDonors, notifiedRecently } from "./lib/eligibility";
import { haversineKm } from "./lib/compat";

/** Search radius per escalation phase, in km. */
const RADIUS_KM = [5, 15, 25] as const;
const PHASE_DELAY_MS = 5 * 60 * 1000;

/**
 * One escalation step. Database work happens here, atomically; the slow network
 * I/O (push, SMS, Telegram) is handed to actions via the scheduler. Stops by
 * itself once the request is closed or has enough donors, so nothing needs to
 * be cancelled when a request is fulfilled.
 */
export const runPhase = internalMutation({
  args: { requestId: v.id("bloodRequests"), phase: v.number() },
  handler: async (ctx, { requestId, phase }) => {
    const request = await ctx.db.get(requestId);
    if (!request) return;
    if (request.status !== "searching" && request.status !== "donor_accepted") return;
    if (request.confirmedCount >= request.units) return;
    if (request.lat == null || request.lng == null) return;
    const radiusKm = RADIUS_KM[phase - 1];
    if (radiusKm === undefined) return;

    const appUrl = process.env.APP_URL ?? "";
    const link = `${appUrl}/request/${requestId}`;
    const matches = await findDonors(ctx, {
      lat: request.lat,
      lng: request.lng,
      radiusKm,
      bloodGroup: request.bloodGroup,
      excludeUserId: request.requesterId,
    });

    const logs = await ctx.db
      .query("notificationLogs")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .collect();
    const notified = new Set<string>(logs.flatMap((l) => (l.donorId ? [l.donorId] : [])));
    const smsed = new Set<string>(logs.filter((l) => l.channel === "SMS" && l.donorId).map((l) => l.donorId!));
    const responses = await ctx.db
      .query("donorResponses")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .collect();
    const responded = new Set<string>(responses.filter((r) => r.status !== "CANCELLED").map((r) => r.donorId));

    const title =
      phase === 1 ? "Urgent: Blood needed nearby 🩸"
      : phase === 2 ? "Urgent: Blood still needed 🩸"
      : "🚨 Critical: Blood urgently needed";
    const message = `${request.units} unit${request.units > 1 ? "s" : ""} of ${request.bloodGroup} needed at ${request.hospitalName}.`;

    const pushBatch: { logId: Id<"notificationLogs">; donorId: Id<"users">; tokens: string[] }[] = [];
    const smsBatch: { logId?: Id<"notificationLogs">; to: string }[] = [];
    let newlyNotified = 0;

    for (const { donor, distanceKm } of matches) {
      if (responded.has(donor._id)) continue;
      const isNew = !notified.has(donor._id);
      if (isNew && (await notifiedRecently(ctx, donor._id))) continue;

      if (isNew) {
        const tokens = donor.fcmTokens ?? [];
        await ctx.db.insert("notifications", {
          userId: donor._id,
          requestId,
          title,
          message,
          type: "emergency_request",
          status: "unread",
        });
        const logId = await ctx.db.insert("notificationLogs", {
          requestId,
          donorId: donor._id,
          channel: "PUSH",
          // In-app inbox delivery is immediate; push upgrades or downgrades it.
          status: tokens.length ? "SENT" : "DELIVERED",
          metadata: { title, body: message, isImmediate: request.urgencyLevel === "IMMEDIATE", phase, distanceKm: Math.round(distanceKm * 10) / 10, inAppOnly: tokens.length === 0 },
        });
        if (tokens.length) pushBatch.push({ logId, donorId: donor._id, tokens });
        notified.add(donor._id);
        newlyNotified++;
      }

      if (phase === 3 && donor.phone && !smsed.has(donor._id)) {
        const logId = await ctx.db.insert("notificationLogs", {
          requestId,
          donorId: donor._id,
          channel: "SMS",
          status: "SENT",
          metadata: { phase },
        });
        smsBatch.push({ logId, to: donor.phone });
        smsed.add(donor._id);
      }
    }

    let banksNotified = 0;
    if (phase === 3) {
      const banks = await ctx.db.query("bloodBanks").collect();
      for (const bank of banks) {
        if (!bank.phone || haversineKm(request.lat, request.lng, bank.lat, bank.lng) > radiusKm) continue;
        const logId = await ctx.db.insert("notificationLogs", {
          requestId,
          channel: "SMS",
          status: "SENT",
          metadata: { type: "BLOOD_BANK", name: bank.name, phase },
        });
        smsBatch.push({ logId, to: bank.phone });
        banksNotified++;
      }
    }

    if (pushBatch.length) {
      await ctx.scheduler.runAfter(0, internal.delivery.sendPush, { batch: pushBatch, title, body: message, url: link });
    }
    if (smsBatch.length) {
      await ctx.scheduler.runAfter(0, internal.delivery.sendSms, {
        items: smsBatch,
        body: `URGENT: ${request.units} unit(s) of ${request.bloodGroup} blood needed at ${request.hospitalName}. Respond on Blood Axis: ${link}`,
      });
    }
    if (phase === 3) {
      // Public broadcast: no patient name or contact number.
      await ctx.scheduler.runAfter(0, internal.delivery.sendTelegram, {
        text:
          `🚨 *URGENT BLOOD REQUEST*\n\n*Group:* ${request.bloodGroup}\n*Hospital:* ${request.hospitalName}\n` +
          `*Units:* ${request.units}\n*Urgency:* ${request.urgencyLevel ?? "—"}\n\n[Respond on Blood Axis](${link})`,
      });
    }

    await ctx.db.patch(requestId, {
      escalationPhase: phase,
      notifiedCount: request.notifiedCount + newlyNotified + banksNotified,
    });
    if (newlyNotified + banksNotified > 0) {
      await ctx.db.insert("activities", {
        userId: request.requesterId,
        requestId,
        eventType: "notification_sent",
        description: `Alerted ${newlyNotified + banksNotified} ${newlyNotified + banksNotified === 1 ? "contact" : "contacts"} within ${radiusKm} km.`,
      });
    }

    if (phase < RADIUS_KM.length) {
      await ctx.scheduler.runAfter(PHASE_DELAY_MS, internal.alerts.runPhase, { requestId, phase: phase + 1 });
    }
  },
});
