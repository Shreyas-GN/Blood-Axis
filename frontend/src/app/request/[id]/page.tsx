"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProfile } from "@/context/AuthContext";
import { getProfileAction, getNearbyDonorsAction, getResponsesForRequestAction, submitDonorResponseAction } from "@/app/actions/donor.actions";
import { getRequestByIdAction, updateRequestAction } from "@/app/actions/request.actions";
import {
  AlertCircle, Phone, ArrowLeft, Heart, Share2, Shield,
  CheckCircle, XCircle, Map, MessageCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertService } from "@/services/alert.service";
import { staggerContainer, slideUpFade, fadeIn } from "@/lib/motion";

import { MissionStatusCard } from "@/components/request/MissionStatusCard";
import { EmergencyBar }      from "@/components/request/EmergencyBar";
import { RequestTimeline }   from "@/components/request/RequestTimeline";
import { ActivityFeed }      from "@/components/request/ActivityFeed";
import { SuccessCard }       from "@/components/request/SuccessCard";

// ── Types ──────────────────────────────────────────────────────

interface BloodRequest {
  id: number;
  blood_group: string;
  units: number;
  patient_name: string;
  hospital_name: string;
  city: string;
  contact_phone: string;
  requester_relation: string;
  urgency_level: "IMMEDIATE" | "TODAY" | "SCHEDULED";
  note: string;
  status: string;
  created_at: string;
  requester_name?: string;
  metadata?: { relation?: string; is_anonymous?: boolean };
  requester: { id: number; first_name: string; last_name: string; phone_number?: string };
  location?: string;
  requester_id?: number;
}

interface MatchingDonor {
  id: number; name: string; blood_group: string; city: string;
  phone_number: string; distance_km: number;
}

// ── Helpers ────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function deriveRadius(elapsedMs: number): number {
  // Starts at 5 km, grows 5 km every 2 minutes, caps at 20 km
  return Math.min(20, 5 + Math.floor(elapsedMs / (2 * 60_000)) * 5);
}

// ── Page ───────────────────────────────────────────────────────

export default function RequestDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { user, profile: authProfile, isLoading: isLoaded } = useProfile();

  const [request,            setRequest]            = useState<BloodRequest | null>(null);
  const [donors,             setDonors]             = useState<MatchingDonor[]>([]);
  const [acceptedDonors,     setAcceptedDonors]     = useState<any[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [accepting,          setAccepting]          = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
  const [error,              setError]              = useState<string | null>(null);
  const [confirmingCancel,   setConfirmingCancel]   = useState(false);
  const [elapsedMs,          setElapsedMs]          = useState(0);

  // Live elapsed timer
  useEffect(() => {
    if (!request) return;
    const update = () => setElapsedMs(Date.now() - new Date(request.created_at).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [request]);

  // Data fetch
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const data = await getRequestByIdAction(params.id as string);
        setRequest(data as any);

        if (data.status === "searching") {
          try {
            const locMatch = data.location?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (locMatch) {
              const lng = parseFloat(locMatch[1]);
              const lat = parseFloat(locMatch[2]);
              const nearby = await getNearbyDonorsAction(lat, lng, 20, data.blood_group);
              setDonors(
                nearby.map((d: any) => ({
                  id: d.id, name: d.full_name, blood_group: d.blood_group,
                  city: "Nearby", phone_number: d.phone,
                  distance_km: Math.round(d.distance_meters / 100) / 10,
                }))
              );
            }
          } catch { /* silent */ }
        }

        try {
          const responses = await getResponsesForRequestAction(params.id as string);
          setAcceptedDonors(responses);
        } catch { /* silent */ }
      } catch {
        setError("Request not found or no longer available.");
      } finally {
        setLoading(false);
      }
    };

    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const profile = await getProfileAction();
        setCurrentUserProfile(profile);
      } catch { /* silent */ }
    };

    if (params.id) fetchRequest();
    if (isLoaded && user) fetchProfile();

    // Supabase realtime for donor responses
    let channel: any;
    const setupRealtime = async () => {
      const { supabaseClient } = await import("@/lib/supabase/client");
      channel = supabaseClient
        .channel(`request_${params.id}_responses`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "donor_responses",
          filter: `request_id=eq.${params.id}`,
        }, async () => {
          try {
            const responses = await getResponsesForRequestAction(params.id as string);
            setAcceptedDonors(responses);
          } catch { /* silent */ }
        })
        .subscribe();
    };
    if (params.id) setupRealtime();
    return () => { if (channel) channel.unsubscribe(); };
  }, [params.id, user, isLoaded]);

  // Actions
  const handleAcceptRequest = async () => {
    if (!currentUserProfile?.id) { router.push("/onboarding"); return; }
    setAccepting(true);
    try {
      await submitDonorResponseAction(params.id as string, 'ACCEPTED');
      if (request?.contact_phone) {
        await AlertService.sendSMS(
          request.contact_phone,
          `BloodRelay ALERT: ${currentUserProfile.full_name || "A donor"} has offered to donate blood for ${request?.patient_name}. They may contact you shortly.`
        );
      }
      const responses = await getResponsesForRequestAction(params.id as string);
      setAcceptedDonors(responses);
    } catch (err: any) {
      setError(err.message || "We could not process this right now. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const handleCancelRequest = async () => {
    setConfirmingCancel(false);
    try {
      await updateRequestAction(params.id as string, { status: "cancelled" });
      router.push("/dashboard");
    } catch {
      setError("Could not cancel request. Please try again.");
    }
  };

  const handleCompleteRequest = async () => {
    try {
      await updateRequestAction(params.id as string, { status: "fulfilled" });
      router.push("/dashboard");
    } catch {
      setError("Could not mark as completed. Please try again.");
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────

  if (loading || !isLoaded) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)]">
        <header className="sticky top-0 z-50 bg-[rgba(252,252,251,0.88)] backdrop-blur-[12px] border-b border-[var(--color-border)] h-14" />
        <div className="sticky top-14 z-40 bg-[var(--color-surface-zinc)] h-11 animate-pulse" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Mission card skeleton */}
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-6 sm:p-10 space-y-6">
            <div className="h-3 w-24 bg-[var(--color-border-subtle)] rounded-full animate-pulse" />
            <div className="h-24 w-32 bg-[var(--color-border-subtle)] rounded-xl animate-pulse" />
            <div className="grid grid-cols-4 gap-4 pt-5 border-t border-[var(--color-border-subtle)]">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2 w-12 bg-[var(--color-border-subtle)] rounded-full animate-pulse" />
                  <div className="h-5 w-16 bg-[var(--color-border-subtle)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Timeline skeleton */}
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-6 sm:p-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-[var(--color-border-subtle)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-[var(--color-border-subtle)] rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-[var(--color-border-subtle)] rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────

  if (!request || (error && !request)) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center">
        <div className="w-14 h-14 bg-[var(--color-border-subtle)] rounded-[var(--radius-card)] flex items-center justify-center mb-5">
          <AlertCircle className="w-7 h-7 text-[var(--color-text-muted)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          {error || "Case closed or unavailable"}
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-7 max-w-sm text-sm">
          This request may have been completed, cancelled, or the link may be incorrect.
        </p>
        <Link href="/dashboard">
          <button className="min-h-[52px] px-6 py-3 bg-[var(--color-text-primary)] text-white font-bold rounded-[var(--radius-button)] shadow-[var(--shadow-card)] text-sm">
            Return to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  // ── Derived state ─────────────────────────────────────────────

  const isRequester  = !!(currentUserProfile?.id && request.requester_id &&
    currentUserProfile.id.toString() === request.requester_id.toString());
  const isResponding = acceptedDonors.some(d => d.donor_id === currentUserProfile?.id);
  const isClosed     = request.status === "fulfilled" || request.status === "cancelled" || request.status === "expired";
  const searchRadius = deriveRadius(elapsedMs);
  const elapsedTime  = formatElapsed(elapsedMs);
  const donorName    = acceptedDonors[0]?.profiles?.full_name;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] pb-safe">

      {/* Nav header */}
      <header className="sticky top-0 z-50 bg-[rgba(252,252,251,0.88)] backdrop-blur-[12px] border-b border-[var(--color-border)] h-14 flex items-center">
        <nav className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
              Case {request.id.toString().padStart(4, "0")}
            </span>
            <Link
              href={`/request/${request.id}/map`}
              className="flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)] rounded-full transition-colors"
              aria-label="View on emergency map"
            >
              <Map className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Map</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Sticky emergency bar */}
      <EmergencyBar
        bloodGroup={request.blood_group}
        status={request.status}
        radius={searchRadius}
        donorsNotified={donors.length}
        elapsedTime={elapsedTime}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >

          {/* Inline error */}
          <AnimatePresence>
            {error && (
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-danger-light)] border border-[#FECACA] rounded-[var(--radius-card)] text-sm font-medium text-[var(--color-danger)]"
                role="alert"
              >
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="shrink-0 text-lg leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Dismiss error"
                >
                  &times;
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success state */}
          {request.status === "fulfilled" && (
            <SuccessCard
              patientName={request.patient_name}
              bloodGroup={request.blood_group}
              donorName={donorName}
            />
          )}

          {/* Mission status — hero */}
          <motion.div variants={slideUpFade}>
            <MissionStatusCard
              status={request.status}
              bloodGroup={request.blood_group}
              elapsedTime={elapsedTime}
              radius={searchRadius}
              donorsNotified={donors.length}
              patientName={request.patient_name}
              hospital={request.hospital_name}
            />
          </motion.div>

          {/* Live timeline */}
          <motion.div variants={slideUpFade}>
            <RequestTimeline
              status={request.status}
              donorsNotified={donors.length}
              elapsedMs={elapsedMs}
            />
          </motion.div>

          {/* Activity feed */}
          <motion.div variants={slideUpFade}>
            <ActivityFeed
              status={request.status}
              bloodGroup={request.blood_group}
              donorsNotified={donors.length}
              acceptedCount={acceptedDonors.length}
              elapsedMs={elapsedMs}
            />
          </motion.div>

          {/* Accepted donors */}
          {acceptedDonors.length > 0 && (
            <motion.div
              variants={slideUpFade}
              className="bg-[var(--color-success-light)] border border-[#A7F3D0] rounded-[var(--radius-card)] p-6 sm:p-8"
            >
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-success)] mb-5">
                Responding Donors
              </h2>
              <div className="space-y-3">
                {acceptedDonors.map((resp) => (
                  <div
                    key={resp.id}
                    className="bg-white border border-[#A7F3D0] rounded-[var(--radius-input)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-[var(--color-text-primary)] text-sm">
                        {resp.profiles?.full_name || "A Donor"}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Offered to help</p>
                    </div>
                    {isRequester ? (
                      <a href={`tel:${resp.profiles?.phone}`}>
                        <button className="min-h-[52px] px-4 py-3 bg-[var(--color-text-primary)] text-white font-bold rounded-[var(--radius-button)] text-xs flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call donor
                        </button>
                      </a>
                    ) : currentUserProfile?.id === resp.donor_id ? (
                      <div className="flex flex-col gap-2 items-start sm:items-end">
                        <span className="inline-flex items-center px-2 py-1 bg-[var(--color-success-light)] text-[var(--color-success)] text-xs font-bold rounded-full border border-[#A7F3D0]">
                          You are responding
                        </span>
                        <a href={`tel:${request.contact_phone}`}>
                          <button className="min-h-[44px] px-3 py-2 bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold rounded-[var(--radius-input)] text-xs flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call requester
                          </button>
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          {!isClosed && (
            <motion.div variants={slideUpFade} className="flex flex-col sm:flex-row gap-3">
              {!isRequester ? (
                !isResponding ? (
                  <button
                    onClick={handleAcceptRequest}
                    disabled={accepting}
                    className="flex-1 min-h-[52px] bg-[var(--color-cta)] text-white text-sm font-bold rounded-[var(--radius-button)] flex items-center justify-center gap-2 shadow-[var(--shadow-clay-hard)] disabled:opacity-50 transition-opacity"
                    aria-busy={accepting}
                  >
                    {accepting ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" aria-hidden="true" /> I can help
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 min-h-[52px] bg-[var(--color-success-light)] text-[var(--color-success)] text-sm font-bold rounded-[var(--radius-button)] flex items-center justify-center border border-[#A7F3D0]"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" /> You are responding
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={handleCompleteRequest}
                    className="flex-1 min-h-[52px] bg-[var(--color-text-primary)] text-white text-sm font-bold rounded-[var(--radius-button)] flex items-center justify-center gap-2 shadow-[var(--shadow-clay)]"
                  >
                    <CheckCircle className="w-4 h-4" aria-hidden="true" /> Mark as fulfilled
                  </button>

                  {confirmingCancel ? (
                    <div className="flex-1 p-4 bg-[var(--color-danger-light)] border border-[#FECACA] rounded-[var(--radius-card)]">
                      <p className="text-sm font-semibold text-[var(--color-danger)] mb-3">
                        Cancel this request? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmingCancel(false)}
                          className="flex-1 min-h-[44px] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-bold rounded-[var(--radius-input)] hover:bg-white transition-colors"
                        >
                          Keep request
                        </button>
                        <button
                          onClick={handleCancelRequest}
                          className="flex-1 min-h-[44px] bg-[var(--color-danger)] text-white text-sm font-bold rounded-[var(--radius-input)]"
                        >
                          Yes, cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingCancel(true)}
                      className="flex-1 min-h-[52px] border border-[var(--color-border)] text-[var(--color-danger)] text-sm font-bold rounded-[var(--radius-button)] flex items-center justify-center hover:bg-[var(--color-danger-light)] hover:border-[#FECACA] transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" aria-hidden="true" /> Cancel request
                    </button>
                  )}
                </>
              )}

              {/* Share */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!request) return;
                    const shareText = `🚨 URGENT: ${request.blood_group} Blood needed at ${request.hospital_name}!\n\nPatient: ${request.patient_name}\nUnits Needed: ${request.units}\n\nPlease help save a life. Click here to respond:\n${window.location.href}`;
                    if (navigator.share) {
                      navigator.share({
                        title: "Urgent Blood Request",
                        text: shareText
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(shareText);
                    }
                  }}
                  className="sm:w-14 min-h-[52px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold rounded-[var(--radius-button)] flex items-center justify-center gap-2 hover:bg-[var(--color-border-subtle)] transition-colors"
                  aria-label="Share this request"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  <span className="sm:hidden text-sm">Share</span>
                </button>
                <button
                  onClick={() => {
                    if (!request) return;
                    const shareText = `🚨 URGENT: ${request.blood_group} Blood needed at ${request.hospital_name}!\n\nPatient: ${request.patient_name}\nUnits Needed: ${request.units}\n\nPlease help save a life. Click here to respond:\n${window.location.href}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                  }}
                  className="sm:w-14 min-h-[52px] bg-[#25D366] text-white font-bold rounded-[var(--radius-button)] flex items-center justify-center gap-2 hover:bg-[#1EBE5D] transition-colors flex-1 sm:flex-none"
                  aria-label="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span className="sm:hidden text-sm">WhatsApp</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick contact (for open requests) */}
          {!isClosed && request.contact_phone && (
            <motion.div variants={slideUpFade} className="flex gap-2">
              <a href={`tel:${request.contact_phone}`} className="flex-1">
                <button className="w-full min-h-[52px] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold rounded-[var(--radius-button)] flex items-center justify-center gap-2 text-sm hover:bg-[var(--color-border-subtle)] transition-colors">
                  <Phone className="w-4 h-4" aria-hidden="true" /> Call contact
                </button>
              </a>
            </motion.div>
          )}

          {/* Safety notice */}
          <motion.div
            variants={slideUpFade}
            className="flex items-start gap-3 p-4 rounded-[var(--radius-card)] text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] border border-[var(--color-border-subtle)]"
            role="note"
          >
            <Shield className="w-4 h-4 shrink-0 text-[var(--color-text-muted)] mt-0.5" aria-hidden="true" />
            <p>
              BloodRelay does not screen donors or verify medical history. Coordinate with your
              medical professional before proceeding with any donations.
            </p>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
