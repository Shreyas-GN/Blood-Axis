/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

// Bengaluru city centre; ~0.01° latitude is ~1.1 km.
const HOSPITAL = { lat: 12.9716, lng: 77.5946 };
const near = (km: number) => ({ lat: HOSPITAL.lat + km / 111, lng: HOSPITAL.lng });

function setup() {
  const t = convexTest(schema, modules);
  const make = (fields: Record<string, unknown>) =>
    t.run((ctx) => ctx.db.insert("users", fields as never));
  const as = (id: Id<"users">) => t.withIdentity({ subject: `${id}|session` });
  return { t, make, as };
}

const donor = (bloodGroup: string, km: number, extra: Record<string, unknown> = {}) => ({
  fullName: `Donor ${bloodGroup} ${km}km`,
  bloodGroup,
  isDonor: true,
  isAvailableDonor: true,
  phone: "+919800000000",
  ...near(km),
  ...extra,
});

const requestArgs = {
  bloodGroup: "A+" as const,
  units: 1,
  hospitalName: "Manipal Hospital",
  patientName: "Asha",
  contactPhone: "+919811111111",
  urgencyLevel: "immediate",
  ...HOSPITAL,
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("auth", () => {
  it("rejects unauthenticated writes and returns nothing for reads", async () => {
    const { t } = setup();
    await expect(t.mutation(api.requests.create, requestArgs)).rejects.toThrow(/Unauthorized/);
    expect(await t.query(api.requests.listActive, {})).toEqual([]);
    expect(await t.query(api.users.me, {})).toBeNull();
  });
});

describe("request creation and alerting", () => {
  it("alerts compatible, nearby, eligible donors only, exact match first", async () => {
    const { t, make, as } = setup();
    const requester = await make({ fullName: "Requester" });
    const exact = await make(donor("A+", 2));
    const compat = await make(donor("O-", 1));
    const tooFar = await make(donor("A+", 9)); // outside phase 1 (5 km)
    const wrongGroup = await make(donor("B+", 1));
    const cooling = await make(donor("A+", 1, { cooldownUntil: Date.now() + 86_400_000 }));
    const unavailable = await make(donor("A+", 1, { isAvailableDonor: false }));

    const req = await as(requester).mutation(api.requests.create, requestArgs);
    expect(req.status).toBe("searching");
    expect(req.urgency_level).toBe("IMMEDIATE");

    // Run only phase 1 (the scheduled run at t=0), not the later phases.
    await t.finishInProgressScheduledFunctions();
    await vi.advanceTimersByTimeAsync(1);
    await t.finishInProgressScheduledFunctions();

    const inbox = async (id: Id<"users">) => as(id).query(api.notifications.list, {});
    expect(await inbox(exact)).toHaveLength(1);
    expect(await inbox(compat)).toHaveLength(1);
    for (const id of [tooFar, wrongGroup, cooling, unavailable, requester]) {
      expect(await inbox(id)).toHaveLength(0);
    }
    const after = await as(requester).query(api.requests.get, { id: req.id });
    expect(after?.notified_count).toBe(2);
    expect(after?.escalation_phase).toBe(1);
  });

  it("escalates through three phases and does not re-alert or double count", async () => {
    const { t, make, as } = setup();
    const requester = await make({ fullName: "Requester" });
    const d5 = await make(donor("A+", 3));
    const d15 = await make(donor("A+", 10));
    const d25 = await make(donor("A+", 20));
    await t.run((ctx) => ctx.db.insert("bloodBanks", { name: "City Bank", phone: "+918000000000", ...near(4) }));

    const req = await as(requester).mutation(api.requests.create, requestArgs);
    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    for (const id of [d5, d15, d25]) {
      expect(await as(id).query(api.notifications.list, {})).toHaveLength(1);
    }
    const after = await as(requester).query(api.requests.get, { id: req.id });
    expect(after?.escalation_phase).toBe(3);
    expect(after?.notified_count).toBe(3 + 1); // 3 donors + 1 blood bank

    const logs = await t.run((ctx) => ctx.db.query("notificationLogs").collect());
    // Phase 3 texts every contactable donor once, plus the bank.
    expect(logs.filter((l) => l.channel === "SMS")).toHaveLength(4);
    expect(logs.every((l) => l.status !== "SENT")).toBe(true); // actions recorded a result
  });

  it("stops escalating once the request is fulfilled", async () => {
    const { t, make, as } = setup();
    const requester = await make({ fullName: "Requester" });
    await make(donor("A+", 3));
    const far = await make(donor("A+", 10));
    const req = await as(requester).mutation(api.requests.create, requestArgs);
    await vi.advanceTimersByTimeAsync(1);
    await t.finishInProgressScheduledFunctions();
    await as(requester).mutation(api.requests.fulfill, { id: req.id as Id<"bloodRequests"> });
    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await as(far).query(api.notifications.list, {})).toHaveLength(0);
  });

  it("expires a request nobody answers", async () => {
    const { t, make, as } = setup();
    const requester = await make({ fullName: "Requester" });
    const req = await as(requester).mutation(api.requests.create, requestArgs);
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000 + 1000);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await as(requester).query(api.requests.get, { id: req.id }))?.status).toBe("expired");
  });

  it("validates input", async () => {
    const { make, as } = setup();
    const requester = await make({ fullName: "Requester" });
    const c = as(requester);
    await expect(c.mutation(api.requests.create, { ...requestArgs, units: 0 })).rejects.toThrow();
    await expect(c.mutation(api.requests.create, { ...requestArgs, lat: 120 })).rejects.toThrow(/coordinates/);
    await expect(c.mutation(api.requests.create, { ...requestArgs, hospitalName: "  " })).rejects.toThrow();
  });
});

describe("responses and privacy", () => {
  async function scenario() {
    const s = setup();
    const requester = await s.make({ fullName: "Requester" });
    const d1 = await s.make(donor("A+", 1));
    const d2 = await s.make(donor("O+", 2));
    const outsider = await s.make(donor("A+", 1));
    const req = await s.as(requester).mutation(api.requests.create, { ...requestArgs, units: 2 });
    return { ...s, requester, d1, d2, outsider, id: req.id as Id<"bloodRequests"> };
  }

  it("keeps counts and status in sync as donors accept and withdraw", async () => {
    const { as, requester, d1, d2, id } = await scenario();
    await as(d1).mutation(api.responses.respond, { requestId: id });
    let r = await as(requester).query(api.requests.get, { id });
    expect([r?.confirmed_count, r?.status]).toEqual([1, "donor_accepted"]);

    await as(d2).mutation(api.responses.respond, { requestId: id });
    // Re-accepting must not inflate the count (the old RPC bug).
    await as(d2).mutation(api.responses.respond, { requestId: id, status: "CONFIRMED" });
    await as(d2).mutation(api.responses.respond, { requestId: id, status: "ARRIVED" });
    r = await as(requester).query(api.requests.get, { id });
    expect(r?.confirmed_count).toBe(2);

    await as(d1).mutation(api.responses.cancel, { requestId: id });
    await as(d2).mutation(api.responses.cancel, { requestId: id });
    r = await as(requester).query(api.requests.get, { id });
    expect([r?.confirmed_count, r?.status]).toEqual([0, "searching"]);
  });

  it("blocks self-response, incompatible donors and closed requests", async () => {
    const { make, as, requester, id } = await scenario();
    await expect(as(requester).mutation(api.responses.respond, { requestId: id })).rejects.toThrow(/own request/);
    const bPos = await make(donor("B+", 1));
    await expect(as(bPos).mutation(api.responses.respond, { requestId: id })).rejects.toThrow(/not compatible/);
    const okDonor = await make(donor("A-", 1));
    await as(requester).mutation(api.requests.cancel, { id });
    await expect(as(okDonor).mutation(api.responses.respond, { requestId: id })).rejects.toThrow(/no longer active/);
  });

  it("only shows responders to the requester and hides contact details until accepted", async () => {
    const { as, requester, d1, d2, outsider, id } = await scenario();
    await as(d1).mutation(api.responses.respond, { requestId: id });
    await as(d2).mutation(api.responses.respond, { requestId: id });

    expect(await as(requester).query(api.responses.listForRequest, { requestId: id })).toHaveLength(2);
    expect(await as(d1).query(api.responses.listForRequest, { requestId: id })).toHaveLength(1);
    expect(await as(outsider).query(api.responses.listForRequest, { requestId: id })).toHaveLength(0);

    expect((await as(outsider).query(api.requests.get, { id }))?.contact_phone).toBeNull();
    expect((await as(d1).query(api.requests.get, { id }))?.contact_phone).toBe("+919811111111");
    expect((await as(requester).query(api.requests.get, { id }))?.donor_phone).not.toBeNull();
    expect((await as(d1).query(api.requests.get, { id }))?.donor_phone).toBeNull();
  });

  it("only the requester can edit, close or see nearby donors", async () => {
    const { as, outsider, requester, id } = await scenario();
    await expect(as(outsider).mutation(api.requests.cancel, { id })).rejects.toThrow(/Forbidden/);
    await expect(as(outsider).mutation(api.requests.update, { id, note: "x" })).rejects.toThrow(/Forbidden/);
    expect(await as(outsider).query(api.donors.nearbyForRequest, { requestId: id })).toEqual([]);
    const nearby = await as(requester).query(api.donors.nearbyForRequest, { requestId: id });
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby.every((d) => !("phone" in d))).toBe(true);
  });
});

describe("profile", () => {
  it("cannot be used to grant roles or verification", async () => {
    const { t, make, as } = setup();
    const u = await make({ fullName: "U" });
    await expect(
      as(u).mutation(api.users.update, { role: "admin", isVerified: true } as never),
    ).rejects.toThrow();
    await as(u).mutation(api.users.update, { fullName: "New", bloodGroup: "O+", isAvailableDonor: true });
    const doc = await t.run((ctx) => ctx.db.get(u));
    expect(doc?.role).toBeUndefined();
    expect(doc?.isDonor).toBe(true);
  });

  it("marks notifications read only for their owner", async () => {
    const { t, make, as } = setup();
    const a = await make({ fullName: "A" });
    const b = await make({ fullName: "B" });
    const nid = await t.run((ctx) =>
      ctx.db.insert("notifications", { userId: a, title: "t", message: "m", type: "system", status: "unread" }),
    );
    await expect(as(b).mutation(api.notifications.markRead, { id: nid })).rejects.toThrow();
    await as(a).mutation(api.notifications.markRead, { id: nid });
    expect((await as(a).query(api.notifications.list, {}))[0].status).toBe("read");
  });
});

void internal;
