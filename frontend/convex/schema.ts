import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const bloodGroup = v.union(
  v.literal("A+"), v.literal("A-"), v.literal("B+"), v.literal("B-"),
  v.literal("AB+"), v.literal("AB-"), v.literal("O+"), v.literal("O-"),
);
export const requestStatus = v.union(
  v.literal("searching"), v.literal("donor_accepted"), v.literal("fulfilled"),
  v.literal("cancelled"), v.literal("expired"),
);
export const urgencyLevel = v.union(
  v.literal("IMMEDIATE"), v.literal("TODAY"), v.literal("SCHEDULED"),
);
export const responseStatus = v.union(
  v.literal("ACCEPTED"), v.literal("CONFIRMED"), v.literal("ARRIVED"), v.literal("CANCELLED"),
);
export const channel = v.union(v.literal("PUSH"), v.literal("SMS"), v.literal("WHATSAPP"));
export const logStatus = v.union(v.literal("SENT"), v.literal("DELIVERED"), v.literal("FAILED"));
export const notificationType = v.union(
  v.literal("emergency_request"), v.literal("request_update"), v.literal("system"),
);
export const activityType = v.union(
  v.literal("profile_completed"), v.literal("availability_changed"),
  v.literal("request_created"), v.literal("notification_sent"),
  v.literal("donor_accepted"), v.literal("request_fulfilled"),
  v.literal("request_cancelled"), v.literal("request_expired"),
);
export const role = v.union(v.literal("donor"), v.literal("hospital"), v.literal("admin"));

export default defineSchema({
  ...authTables,

  // Extends the Convex Auth `users` table. The auth fields (name, email, phone,
  // isAnonymous, ...) are declared here because defineTable replaces the default.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    fullName: v.optional(v.string()),
    bloodGroup: v.optional(bloodGroup),
    isDonor: v.optional(v.boolean()),
    isAvailableDonor: v.optional(v.boolean()),
    city: v.optional(v.string()),
    profileCompleted: v.optional(v.boolean()),
    location: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    age: v.optional(v.number()),
    lastDonationDate: v.optional(v.number()),
    cooldownUntil: v.optional(v.number()),
    isVerified: v.optional(v.boolean()),
    role: v.optional(role),
    fcmTokens: v.optional(v.array(v.string())),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_available_group", ["isAvailableDonor", "bloodGroup"]),

  bloodRequests: defineTable({
    requesterId: v.id("users"),
    bloodGroup,
    units: v.number(),
    patientName: v.optional(v.string()),
    hospitalName: v.string(),
    city: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    urgencyLevel: v.optional(urgencyLevel),
    location: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    status: requestStatus,
    escalationPhase: v.number(),
    notifiedCount: v.number(),
    confirmedCount: v.number(),
    donorName: v.optional(v.string()),
    donorPhone: v.optional(v.string()),
    note: v.optional(v.string()),
    requesterRelation: v.optional(v.string()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_status", ["status"]),

  donorResponses: defineTable({
    requestId: v.id("bloodRequests"),
    donorId: v.id("users"),
    status: responseStatus,
    distanceMeters: v.optional(v.number()),
    etaMinutes: v.optional(v.number()),
    respondedAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_donor", ["donorId"])
    .index("by_request_donor", ["requestId", "donorId"]),

  notificationLogs: defineTable({
    requestId: v.id("bloodRequests"),
    donorId: v.optional(v.id("users")),
    channel,
    status: logStatus,
    metadata: v.optional(v.any()),
  })
    .index("by_request", ["requestId"])
    .index("by_donor", ["donorId"]),

  notifications: defineTable({
    userId: v.id("users"),
    requestId: v.optional(v.id("bloodRequests")),
    title: v.string(),
    message: v.string(),
    type: notificationType,
    status: v.union(v.literal("unread"), v.literal("read")),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  activities: defineTable({
    userId: v.id("users"),
    requestId: v.optional(v.id("bloodRequests")),
    eventType: activityType,
    description: v.string(),
  }).index("by_user", ["userId"]),

  bloodBanks: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
  }),
});
