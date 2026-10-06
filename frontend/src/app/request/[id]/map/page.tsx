"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProfile } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Droplet } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { EmergencyMap, type DonorMarkerData, type DonorState } from "@/components/map/EmergencyMap";
import { MapBottomSheet } from "@/components/map/MapBottomSheet";
import { MapOverlayCard } from "@/components/map/MapOverlayCard";
import { SkeletonMapOverlay } from "@/components/map/SkeletonMapOverlay";

// ── Types ──────────────────────────────────────────────────────

interface BloodRequest {
  id: number;
  blood_group: string;
  units: number;
  patient_name: string;
  hospital_name: string;
  city: string;
  contact_phone: string;
  status: string;
  created_at: string;
  location?: string;
  requester_id?: number;
}

interface NearbyDonor {
  id: string;
  full_name?: string;
  name?: string;
  blood_group: string;
  distance_km: number;
  distance_meters?: number;
  latitude?: number;
  longitude?: number;
}

// ── Helpers ────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function deriveRadius(elapsedMs: number): number {
  return Math.min(20, 5 + Math.floor(elapsedMs / (2 * 60_000)) * 5);
}

function parseCenter(location?: string): [number, number] {
  if (!location) return [77.5946, 12.9716]; // Default: Bangalore
  const m = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!m) return [77.5946, 12.9716];
  return [parseFloat(m[1]), parseFloat(m[2])]; // [lng, lat]
}

function generateDonorPositions(
  center: [number, number],
  donors: NearbyDonor[],
  acceptedIds: Set<string>
): DonorMarkerData[] {
  const [lng, lat] = center;
  return donors.map((donor, i) => {
    // Spread donors evenly around center, varying by index so they don't overlap
    const angle   = ((i * 137.5 + 30) % 360) * (Math.PI / 180); // golden-angle spread
    const kmDist  = donor.distance_km || (donor.distance_meters ? donor.distance_meters / 1000 : 3 + i);
    const dLat    = kmDist / 111.32;
    const dLng    = kmDist / (111.32 * Math.cos((lat * Math.PI) / 180));
    const jitter  = 1;

    const state: DonorState = acceptedIds.has(donor.id)
      ? "accepted"
      : kmDist <= 7
      ? "available"
      : "searching";

    // Server returns coordinates rounded to ~1 km; use them when available.
    const hasCoords = donor.latitude != null && donor.longitude != null;
    return {
      id:         String(donor.id),
      lat:        hasCoords ? donor.latitude! : lat + dLat * Math.sin(angle) * jitter,
      lng:        hasCoords ? donor.longitude! : lng + dLng * Math.cos(angle) * jitter,
      name:       donor.full_name || donor.name || `Donor ${i + 1}`,
      bloodGroup: donor.blood_group,
      state,
    };
  });
}

function deriveEta(status: string, elapsedMs: number): string {
  if (status === "fulfilled")      return "Arrived";
  if (status === "cancelled")      return "—";
  if (status === "expired")        return "—";
  if (status === "donor_accepted") {
    const remain = Math.max(0, 12 * 60_000 - elapsedMs);
    return `~${Math.ceil(remain / 60_000)} min`;
  }
  return "~12 min";
}

// ── Page ───────────────────────────────────────────────────────

export default function EmergencyMapPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isLoaded } = useProfile();

  const { profile: currentProfile } = useProfile();
  const requestData = useQuery(api.requests.get, params.id ? { id: String(params.id) } : "skip");
  const request = (requestData ?? null) as unknown as BloodRequest | null;
  const requestId = requestData?.id as Id<"bloodRequests"> | undefined;
  const isOwn = !!requestData && requestData.requester_id === currentProfile?.id;
  const open = requestData?.status === "searching" || requestData?.status === "donor_accepted";
  const nearby = useQuery(api.donors.nearbyForRequest, requestId && isOwn && open ? { requestId, radiusKm: 20 } : "skip");
  const responses = useQuery(api.responses.listForRequest, requestId ? { requestId } : "skip");
  const respond = useMutation(api.responses.respond);
  const [accepting,        setAccepting]         = useState(false);
  const [elapsedMs,        setElapsedMs]         = useState(0);
  const loading = requestData === undefined;
  const acceptedDonors = useMemo(() => (responses ?? []).filter((r) => r.status !== "CANCELLED") as any[], [responses]);
  const donorsNotified = nearby?.length ?? 0;

  useEffect(() => {
    if (requestData === null) router.push("/dashboard");
  }, [requestData, router]);

  const donorMarkers = useMemo<DonorMarkerData[]>(() => {
    if (!requestData || !nearby) return [];
    const center = parseCenter(requestData.location ?? (requestData.latitude != null ? `POINT(${requestData.longitude} ${requestData.latitude})` : undefined));
    const acceptedIds = new Set<string>(acceptedDonors.map((r: any) => r.donor_id));
    const normalized: NearbyDonor[] = nearby.map((d) => ({
      id: d.id as any,
      full_name: d.full_name,
      blood_group: d.blood_group,
      distance_km: d.distance_meters / 1000,
      distance_meters: d.distance_meters,
      latitude: d.latitude,
      longitude: d.longitude,
    }));
    return generateDonorPositions(center, normalized, acceptedIds);
  }, [requestData, nearby, acceptedDonors]);

  // Elapsed timer
  useEffect(() => {
    if (!request) return;
    const tick = () => setElapsedMs(Date.now() - new Date(request.created_at).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [request]);

  const handleHelp = useCallback(async () => {
    if (!currentProfile?.id) { router.push("/settings"); return; }
    setAccepting(true);
    try {
      if (!requestId) return;
      await respond({ requestId, status: "ACCEPTED" });
      router.push(`/request/${params.id}`);
    } catch {
      setAccepting(false);
    }
  }, [currentProfile, params.id, requestId, respond, router]);

  // ── Derived ──────────────────────────────────────────────────

  const center        = parseCenter(request?.location);
  const radius        = deriveRadius(elapsedMs);
  const elapsedTime   = formatElapsed(elapsedMs);
  const eta           = deriveEta(request?.status ?? "searching", elapsedMs);
  const isClosed      = ["fulfilled", "cancelled", "expired"].includes(request?.status ?? "");
  const isRequester   = !!(currentProfile?.id && request?.requester_id &&
    currentProfile.id.toString() === request.requester_id.toString());
  const isResponding  = acceptedDonors.some((d) => d.donor_id === currentProfile?.id);
  const canHelp       = !isClosed && !isRequester && !isResponding;
  const hasNoDonors   = !loading && donorMarkers.length === 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[var(--color-bg)]">

      {/* ── Map fill ─────────────────────────────────────────── */}
      {!loading && (
        <div className="absolute inset-0">
          <EmergencyMap
            center={center}
            activeRadius={radius}
            donors={donorMarkers}
            onDonorClick={(id) => {
              const donor = donorMarkers.find((d) => d.id === id);
              if (donor && request?.contact_phone) {
                // Donor click: no action, just visual feedback (no API changes)
              }
            }}
          />
        </div>
      )}

      {/* ── Map loading background ────────────────────────────── */}
      {loading && (
        <div className="absolute inset-0 bg-[#F5F3F0] animate-pulse" />
      )}

      {/* ── Back button ──────────────────────────────────────── */}
      <div className="absolute top-4 z-40"
           style={{ left: loading || typeof window === "undefined" ? "1rem" : "1rem" }}>
        <Link
          href={`/request/${params.id}`}
          className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 bg-white/90 backdrop-blur-sm border border-white/50 rounded-full text-sm font-semibold text-[var(--color-text-primary)] shadow-[0_2px_12px_rgba(0,0,0,0.10)] hover:bg-white transition-colors"
          aria-label="Back to request detail"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      {/* ── Legend pill (desktop) ─────────────────────────────── */}
      {!loading && (
        <div className="hidden md:flex absolute top-4 right-4 z-20 items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <LegendDot color="#E4E4E7" border="#A1A1AA" label="Searching" />
          <LegendDot color="#FEF3C7" border="#FCD34D" label="Available" />
          <LegendDot color="#DCFCE7" border="#86EFAC" label="Accepted" />
        </div>
      )}

      {/* ── Overlay card (desktop) ────────────────────────────── */}
      {loading ? (
        <SkeletonMapOverlay />
      ) : request ? (
        <>
          <MapOverlayCard
            bloodGroup={request.blood_group}
            status={request.status}
            radius={radius}
            donorsNotified={donorsNotified}
            elapsedTime={elapsedTime}
            eta={eta}
            hospital={request.hospital_name}
          />

          {/* ── Empty state (no donors nearby, mobile+desktop) ── */}
          {hasNoDonors && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 px-6 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-[var(--radius-card)] px-6 py-5 text-center max-w-xs shadow-[0_8px_30px_rgba(0,0,0,0.10)]">
                <div className="w-10 h-10 rounded-full bg-[var(--color-border-subtle)] flex items-center justify-center mx-auto mb-3">
                  <Droplet className="w-5 h-5 text-[var(--color-cta)]" aria-hidden="true" />
                </div>
                <p className="font-bold text-[var(--color-text-primary)] text-sm mb-1">
                  Expanding the search
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  No donors in this area yet. Blood Axis is widening the radius. Stay close — help is on the way.
                </p>
              </div>
            </div>
          )}

          {/* ── Bottom sheet (mobile) ─────────────────────────── */}
          <MapBottomSheet
            bloodGroup={request.blood_group}
            hospital={request.hospital_name}
            status={request.status}
            donorsNotified={donorsNotified}
            eta={eta}
            elapsedTime={elapsedTime}
            radius={radius}
            contactPhone={request.contact_phone}
            canHelp={canHelp}
            onHelp={accepting ? undefined : handleHelp}
          />
        </>
      ) : null}

      {/* ── Radius legend bar (mobile, above bottom sheet) ───── */}
      {!loading && request && (
        <div className="md:hidden absolute bottom-[232px] inset-x-0 flex justify-center z-20 px-5 pointer-events-none">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            {[5, 10, 15, 20].map((km) => (
              <div key={km} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full border"
                  style={{
                    background: km <= radius ? "rgba(185,28,28,0.12)" : "transparent",
                    borderColor: km <= radius ? "rgba(185,28,28,0.5)" : "#D4D4D8",
                  }}
                  aria-hidden="true"
                />
                <span className="text-[9px] font-mono font-bold text-[var(--color-text-muted)]">{km}km</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded-full border shrink-0"
        style={{ background: color, borderColor: border }}
        aria-hidden="true"
      />
      <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}
