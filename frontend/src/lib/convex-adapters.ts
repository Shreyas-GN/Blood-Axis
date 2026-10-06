import type { Doc } from "../../convex/_generated/dataModel";

type ProfileArgs = {
  fullName?: string;
  phone?: string;
  bloodGroup?: Doc<"users">["bloodGroup"];
  isAvailableDonor?: boolean;
  city?: string;
  location?: string;
  lat?: number;
  lng?: number;
  age?: number;
  lastDonationDate?: number;
  profileCompleted?: boolean;
};

const nn = <T,>(v: T | null | undefined) => (v === null || v === undefined || (v as unknown) === "" ? undefined : v);

/** Converts a snake_case profile patch (the shape UI forms use) to `users.update` args. */
export function toProfileArgs(d: Record<string, any>): ProfileArgs {
  const out: ProfileArgs = {};
  if (nn(d.full_name) !== undefined) out.fullName = d.full_name;
  if (nn(d.phone) !== undefined) out.phone = d.phone;
  if (nn(d.blood_group) !== undefined) out.bloodGroup = d.blood_group;
  if (typeof d.is_available_donor === "boolean") out.isAvailableDonor = d.is_available_donor;
  if (nn(d.city) !== undefined) out.city = d.city;
  if (nn(d.location) !== undefined) out.location = d.location;
  if (typeof d.latitude === "number") out.lat = d.latitude;
  if (typeof d.longitude === "number") out.lng = d.longitude;
  if (nn(d.age) !== undefined) out.age = Number(d.age);
  if (nn(d.last_donation_date) !== undefined) {
    const t = Date.parse(d.last_donation_date);
    if (!Number.isNaN(t)) out.lastDonationDate = t;
  }
  if (typeof d.profile_completed === "boolean") out.profileCompleted = d.profile_completed;
  return out;
}

const URGENCY: Record<string, string> = { immediate: "IMMEDIATE", high: "TODAY", medium: "SCHEDULED" };

/** Converts a snake_case request patch to `requests.create` / `requests.update` args. */
export function toRequestArgs(d: Record<string, any>) {
  const out: Record<string, unknown> = {};
  if (nn(d.blood_group) !== undefined) out.bloodGroup = d.blood_group;
  if (nn(d.units) !== undefined) out.units = Number(d.units);
  if (nn(d.hospital_name) !== undefined) out.hospitalName = d.hospital_name;
  if (nn(d.patient_name) !== undefined) out.patientName = d.patient_name;
  if (nn(d.city) !== undefined) out.city = d.city;
  if (nn(d.contact_phone) !== undefined) out.contactPhone = d.contact_phone;
  if (nn(d.urgency_level) !== undefined) out.urgencyLevel = URGENCY[String(d.urgency_level).toLowerCase()] ?? d.urgency_level;
  if (nn(d.note) !== undefined) out.note = d.note;
  if (nn(d.requester_relation) !== undefined) out.requesterRelation = d.requester_relation;
  if (nn(d.location) !== undefined) out.location = d.location;
  if (typeof d.latitude === "number") out.lat = d.latitude;
  if (typeof d.longitude === "number") out.lng = d.longitude;
  return out;
}
