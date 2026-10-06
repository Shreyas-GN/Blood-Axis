"use client";

import { useEffect, useState, useCallback } from "react";
import { useProfile } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, MapPin, Droplet, Clock, Phone, User, Heart, CheckCircle,
    AlertCircle, Share2, Shield, Loader2, MessageCircle
} from "lucide-react";
import { getProfileAction, getResponsesForRequestAction, submitDonorResponseAction, cancelResponseAction } from "@/app/actions/donor.actions";
import { getRequestByIdAction, updateRequestAction } from "@/app/actions/request.actions";
import { logActivityAction } from "@/app/actions/activity.actions";
import { AlertService } from "@/services/alert.service";
import type { BloodRequest, DonorResponse } from "@/types";
import Map from "@/components/map/Map";
import { formatDistance, estimateETA, calculateDistance } from "@/lib/geolocation";

const parseLocation = (locStr: string | null) => {
    if (!locStr) return null;
    const match = locStr.match(/POINT\s*\(([^ ]+)\s+([^ )]+)\)/i);
    if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    return null;
};

const URGENCY_COLOR: Record<string, string> = {
    IMMEDIATE: "bg-rose-500 text-white border-rose-500",
    TODAY:     "bg-amber-500 text-[var(--color-base-900)] border-amber-500",
    SCHEDULED: "bg-blue-500 text-white border-blue-500",
};

interface Props {
    requestId: string | number | null;
    onClose: () => void;
    onActionComplete?: () => void;
}

export function RequestDetailDrawer({ requestId, onClose, onActionComplete }: Props) {
    const { user, isLoading: isLoaded } = useProfile();
    const router = useRouter();

    const [request, setRequest] = useState<any | null>(null);
    const [acceptedDonors, setAcceptedDonors] = useState<DonorResponse[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [confirmingCancel, setConfirmingCancel] = useState(false);

    const fetchRequest = useCallback(async () => {
        if (!requestId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getRequestByIdAction(requestId.toString());
            setRequest(data);
            try {
                const responses = await getResponsesForRequestAction(requestId.toString());
                setAcceptedDonors(responses);
            } catch { }
        } catch {
            setError("Could not load request details.");
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        if (isLoaded && user?.id) {
            getProfileAction().then(setCurrentUserProfile).catch(() => { });
        }
    }, [user?.id, isLoaded]);

    useEffect(() => {
        if (requestId) {
            fetchRequest();
        } else {
            setRequest(null);
            setAcceptedDonors([]);
            setError(null);
        }
    }, [requestId, fetchRequest]);

    useEffect(() => {
        if (!requestId) return;
        let channel: any;
        const setup = async () => {
            const { supabaseClient } = await import("@/lib/supabase/client");
            channel = supabaseClient
                .channel(`drawer_${requestId}_responses`)
                .on("postgres_changes", {
                    event: "*", schema: "public", table: "donor_responses",
                    filter: `request_id=eq.${requestId}`
                }, async () => {
                    try {
                        const responses = await getResponsesForRequestAction(requestId.toString());
                        setAcceptedDonors(responses);
                    } catch { }
                })
                .subscribe();
        };
        setup();
        return () => { if (channel) channel.unsubscribe(); };
    }, [requestId]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleAccept = async () => {
        if (!currentUserProfile?.id) { router.push("/settings"); return; }
        setAccepting(true);
        try {
            let distance = null;
            let eta = null;
            if (currentUserProfile.latitude && currentUserProfile.longitude && request?.latitude && request?.longitude) {
                distance = calculateDistance(currentUserProfile.latitude, currentUserProfile.longitude, request.latitude, request.longitude);
                eta = estimateETA(distance);
            } else if (currentUserProfile.location && request?.location && request.location !== 'POINT(0 0)') {
                const userLoc = parseLocation(currentUserProfile.location);
                const reqLoc = parseLocation(request.location);
                if (userLoc && reqLoc) {
                    distance = calculateDistance(userLoc.lat, userLoc.lng, reqLoc.lat, reqLoc.lng);
                    eta = estimateETA(distance);
                }
            }

            await submitDonorResponseAction(requestId!.toString(), 'ACCEPTED', distance, eta);
            if (request?.contact_phone) {
                await AlertService.sendSMS(
                    request.contact_phone,
                    `BloodRelay ALERT: ${currentUserProfile.full_name || "A donor"} has offered to donate blood for ${request.patient_name}. They may contact you shortly.`
                );
            }
            await logActivityAction(
                'donor_accepted',
                `You offered to donate blood for ${request?.patient_name || 'a patient'} at ${request?.hospital_name || 'the hospital'}.`,
                requestId!.toString()
            );
            await fetchRequest();
            onActionComplete?.();
        } catch (err: any) {
            setError(err.message || "We couldn't process this right now. Please try again.");
        } finally {
            setAccepting(false);
        }
    };

    const handleComplete = async () => {
        try {
            await updateRequestAction(requestId!.toString(), { status: "fulfilled" });
            if (currentUserProfile?.id) {
                await logActivityAction(
                    'request_fulfilled',
                    `Request for ${request?.patient_name || 'a patient'} at ${request?.hospital_name || 'the hospital'} was marked as fulfilled.`,
                    requestId!.toString()
                );
            }
            onClose();
            onActionComplete?.();
        } catch { setError("Could not mark as fulfilled. Please try again."); }
    };

    const handleCancel = async () => {
        setConfirmingCancel(false);
        try {
            await updateRequestAction(requestId!.toString(), { status: "cancelled" });
            if (currentUserProfile?.id) {
                await logActivityAction(
                    'request_cancelled',
                    `Request for ${request?.patient_name || 'a patient'} at ${request?.hospital_name || 'the hospital'} was cancelled.`,
                    requestId!.toString()
                );
            }
            onClose();
            onActionComplete?.();
        } catch { setError("Could not cancel request. Please try again."); }
    };

    const handleWithdraw = async () => {
        if (!currentUserProfile?.id) return;
        try {
            await cancelResponseAction(requestId!.toString());
            await fetchRequest();
            onActionComplete?.();
        } catch { setError("Could not withdraw. Please try again."); }
    };

    const isOpen = !!requestId;
    const isClosed = request && (request.status === "fulfilled" || request.status === "cancelled" || request.status === "expired");
    const isRequester = currentUserProfile?.id && request?.requester_id &&
        currentUserProfile.id.toString() === request.requester_id.toString();
    const activeResponses = acceptedDonors.filter(d => d.status !== 'CANCELLED');
    const isResponding = activeResponses.some(d => d.donor_id?.toString() === currentUserProfile?.id?.toString());
    const userResponseStatus = acceptedDonors.find(d => d.donor_id?.toString() === currentUserProfile?.id?.toString())?.status;
    const canSeeContact = isRequester || userResponseStatus === 'ACCEPTED' || userResponseStatus === 'CONFIRMED' || userResponseStatus === 'ARRIVED';
    const canSupport = !isRequester && !isResponding && !isClosed && userResponseStatus !== 'CANCELLED';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        key="drawer-panel"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 35 }}
                        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[var(--color-base-50)] shadow-2xl overflow-y-auto flex flex-col"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-[rgba(250,250,250,0.92)] backdrop-blur-xl border-b border-[var(--color-base-200)] px-6 h-14 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-mono font-bold text-[var(--color-base-400)] uppercase tracking-widest">
                                {request ? `Case ${String(request.id).padStart(4, "0")}` : "Loading…"}
                            </span>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-[var(--color-base-100)] flex items-center justify-center text-[var(--color-base-500)] hover:bg-[var(--color-base-200)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 p-5 space-y-5">
                            {loading && (
                                <div className="space-y-5">
                                    {/* Skeleton for case card */}
                                    <div className="h-10 w-32 bg-[var(--color-base-100)] rounded-[var(--radius-card)] animate-pulse" />
                                    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-base-200)] rounded-[var(--radius-card)] p-5 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 rounded-[var(--radius-card)] bg-[var(--color-base-100)] animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-5 bg-[var(--color-base-100)] rounded animate-pulse w-3/4" />
                                                <div className="h-4 bg-[var(--color-base-100)] rounded animate-pulse w-1/2" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="h-7 bg-[var(--color-base-100)] rounded-lg animate-pulse flex-1" />
                                            ))}
                                        </div>
                                        <div className="pt-4 border-t border-[var(--color-base-100)] space-y-3">
                                            <div className="h-4 bg-[var(--color-base-100)] rounded animate-pulse w-full" />
                                            <div className="h-4 bg-[var(--color-base-100)] rounded animate-pulse w-2/3" />
                                        </div>
                                    </div>
                                    <div className="h-12 bg-[var(--color-base-100)] rounded-[var(--radius-card)] animate-pulse" />
                                </div>
                            )}

                            {error && !loading && (
                                <div
                                    className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-blood-light)] border border-rose-200 rounded-[var(--radius-card)] text-sm font-medium text-[var(--color-blood)]"
                                >
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                    <button onClick={() => setError(null)} className="shrink-0 text-[var(--color-blood)] hover:opacity-70">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {request && !loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-4"
                                >
                                    {/* Critical banner */}
                                    {request.urgency_level === "IMMEDIATE" && !isClosed && (
                                        <div className="bg-[var(--color-blood-light)] border border-rose-200 p-3.5 rounded-[var(--radius-card)] flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-[var(--color-blood)] animate-pulse shrink-0" />
                                            <div>
                                                <p className="font-bold text-[var(--color-blood)] text-sm">Critical case</p>
                                                <p className="text-xs text-[var(--color-blood)] opacity-70">Blood needed in the next few hours.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick actions */}
                                    {!isClosed && (
                                        <div className="flex gap-2">
                                            <a href={`tel:${request.contact_phone}`} className="flex-1">
                                                <button className="w-full h-10 bg-[var(--color-base-900)] text-white font-bold rounded-[var(--radius-card)] flex items-center justify-center gap-2 text-sm shadow-[var(--shadow-clay)] clay-button-hover">
                                                    <Phone className="w-4 h-4" /> Call
                                                </button>
                                            </a>
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(request.hospital_name + " " + request.city)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1"
                                            >
                                                <button className="w-full h-10 bg-[var(--color-bg-elevated)] border border-[var(--color-base-200)] text-[var(--color-base-900)] font-bold rounded-[var(--radius-card)] flex items-center justify-center gap-2 text-sm clay-button-hover">
                                                    <MapPin className="w-4 h-4" /> Directions
                                                </button>
                                            </a>
                                        </div>
                                    )}

                                    {/* Case card */}
                                    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-base-200)] rounded-[var(--radius-card)] shadow-[var(--shadow-clay)] overflow-hidden relative">
                                        {isClosed && (
                                            <div className="absolute inset-0 bg-[var(--color-bg)]/75 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                                <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-base-200)] px-4 py-2.5 rounded-[var(--radius-card)] shadow-[var(--shadow-clay)] flex items-center gap-2.5">
                                                    {String(request.status) === "cancelled" ? (
                                                        <><AlertCircle className="w-4 h-4 text-[var(--color-base-400)]" /><span className="font-bold text-[var(--color-base-900)] text-sm">Cancelled</span></>
                                                    ) : (
                                                        <><CheckCircle className="w-4 h-4 text-[var(--color-safe)]" /><span className="font-bold text-[var(--color-base-900)] text-sm">Fulfilled</span></>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-5">
                                            {/* Blood group + patient */}
                                            <div className="flex items-start gap-4 mb-5">
                                                <div className={`shrink-0 w-16 h-16 rounded-[var(--radius-card)] flex flex-col items-center justify-center border-2 ${URGENCY_COLOR[request.urgency_level ?? ""] ?? "bg-[var(--color-base-100)] text-[var(--color-base-900)] border-[var(--color-base-200)]"}`}>
                                                    <span className="text-xl font-black tracking-tighter">{request.blood_group}</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">Needed</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h2 className="text-xl font-extrabold text-[var(--color-base-900)] tracking-tight mb-0.5 truncate">{request.patient_name}</h2>
                                                    <p className="text-[0.875rem] text-[var(--color-base-500)] truncate">{request.hospital_name}</p>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1.5 mb-5">
                                                <div className="inline-flex items-center gap-1.5 bg-[var(--color-base-50)] border border-[var(--color-base-200)] px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--color-base-700)]">
                                                    <MapPin className="w-3 h-3" /> {request.city}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 bg-[var(--color-base-50)] border border-[var(--color-base-200)] px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--color-base-700)]">
                                                    <Droplet className="w-3 h-3" /> {request.units} unit{request.units > 1 ? "s" : ""}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 bg-[var(--color-base-50)] border border-[var(--color-base-200)] px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--color-base-700)]">
                                                    <Clock className="w-3 h-3" /> {new Date(request.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>

                                            <div className="border-t border-[var(--color-base-100)] pt-4 space-y-3.5">
                                                {/* Contact */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-[var(--radius-input)] bg-[var(--color-base-50)] border border-[var(--color-base-200)] flex items-center justify-center shrink-0">
                                                        <Phone className="w-4 h-4 text-[var(--color-base-500)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-base-400)] mb-0.5">Contact</p>
                                                        {canSeeContact ? (
                                                            <p className="font-bold text-[var(--color-base-900)] font-mono text-sm">{request.contact_phone}</p>
                                                        ) : (
                                                            <p className="font-bold text-[var(--color-base-900)] font-mono text-sm tracking-[0.2em] blur-[3px] select-none">XXXXXX0000</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Requester relation */}
                                                {request.requester_relation && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-[var(--radius-input)] bg-[var(--color-base-50)] border border-[var(--color-base-200)] flex items-center justify-center shrink-0">
                                                            <User className="w-4 h-4 text-[var(--color-base-500)]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-base-400)] mb-0.5">Relation</p>
                                                            <p className="font-bold text-[var(--color-base-900)] text-sm capitalize">{request.requester_relation.toLowerCase()}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Note */}
                                                {request.note && (
                                                    <div className="bg-[var(--color-base-50)] border border-[var(--color-base-200)] rounded-[var(--radius-input)] p-3.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-base-400)] mb-1">Note</p>
                                                        <p className="text-sm text-[var(--color-base-700)]">{request.note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map */}
                                    {(() => {
                                        const loc = parseLocation(request.location);
                                        if (!loc || (loc.lat === 0 && loc.lng === 0)) return null;
                                        return (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <p className="text-[10px] font-bold text-[var(--color-base-400)] uppercase tracking-widest">Hospital location</p>
                                                    {!showMap && (
                                                        <button
                                                            onClick={() => setShowMap(true)}
                                                            className="text-[10px] font-bold text-[var(--color-blood)] hover:underline uppercase tracking-wider"
                                                        >
                                                            View map
                                                        </button>
                                                    )}
                                                </div>
                                                {showMap ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "192px" }}
                                                        className="h-48 w-full rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-base-200)]"
                                                    >
                                                        <Map
                                                            center={[loc.lng, loc.lat]}
                                                            zoom={14}
                                                            markers={[{
                                                                id: 'hospital',
                                                                lat: loc.lat,
                                                                lng: loc.lng,
                                                                label: request.hospital_name,
                                                                type: 'hospital'
                                                            }]}
                                                            className="h-full w-full"
                                                        />
                                                    </motion.div>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowMap(true)}
                                                        className="w-full h-11 bg-[var(--color-base-50)] border border-dashed border-[var(--color-base-200)] rounded-[var(--radius-card)] flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-base-500)] hover:bg-[var(--color-base-100)] transition-colors"
                                                    >
                                                        <MapPin className="w-4 h-4" /> Load map
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Donor responses */}
                                    {activeResponses.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-[var(--color-safe-light)] border border-emerald-200 rounded-[var(--radius-card)] p-5"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-[var(--radius-input)] bg-[var(--color-bg-elevated)] border border-emerald-200 flex items-center justify-center shrink-0">
                                                    <CheckCircle className="w-4 h-4 text-[var(--color-safe)]" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[var(--color-safe)] text-sm">Help is on the way</h3>
                                                    <p className="text-xs text-[var(--color-safe)] opacity-70">{activeResponses.length} donor{activeResponses.length > 1 ? "s" : ""} responding</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {activeResponses.map((resp) => (
                                                    <div key={resp.id} className="bg-[var(--color-bg-elevated)] border border-emerald-100 p-3 rounded-[var(--radius-input)] flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="font-bold text-[var(--color-base-900)] text-sm">{resp.profiles?.full_name || "A Donor"}</p>
                                                            {resp.distance_meters != null && (
                                                                <p className="text-[10px] text-[var(--color-base-500)]">
                                                                    {formatDistance(resp.distance_meters)} · ETA ~{estimateETA(resp.distance_meters)} min
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isRequester && (
                                                                <a href={`tel:${resp.profiles?.phone}`}>
                                                                    <button className="px-3 py-1.5 bg-[var(--color-base-900)] text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                                                                        <Phone className="w-3 h-3" /> Call
                                                                    </button>
                                                                </a>
                                                            )}
                                                            {currentUserProfile?.id?.toString() === resp.donor_id?.toString() && (
                                                                <span className="text-[10px] px-2 py-1 bg-[var(--color-safe-light)] text-[var(--color-safe)] font-bold rounded-md border border-emerald-200">You</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Actions */}
                                    {!isClosed && (
                                        <div className="space-y-2.5">
                                            {canSupport ? (
                                                <button
                                                    onClick={handleAccept}
                                                    disabled={accepting}
                                                    className="w-full py-3.5 bg-[var(--color-blood)] text-white text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center shadow-[var(--shadow-clay-hard)] clay-button-hover disabled:opacity-50"
                                                >
                                                    {accepting ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                                                    ) : (
                                                        <><Heart className="w-4 h-4 mr-2" />I can help</>
                                                    )}
                                                </button>
                                            ) : isResponding ? (
                                                <div className="space-y-2">
                                                    <div className="w-full py-3 bg-[var(--color-safe-light)] text-[var(--color-safe)] text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center border border-emerald-200">
                                                        <CheckCircle className="w-4 h-4 mr-2" /> You are responding
                                                    </div>
                                                    <button
                                                        onClick={handleWithdraw}
                                                        className="w-full py-2.5 border border-[var(--color-base-200)] text-[var(--color-base-500)] text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center hover:bg-[var(--color-base-50)] transition-colors"
                                                    >
                                                        Withdraw
                                                    </button>
                                                </div>
                                            ) : userResponseStatus === 'CANCELLED' && !isRequester ? (
                                                <div className="space-y-2">
                                                    <div className="w-full py-3 bg-[var(--color-base-50)] text-[var(--color-base-500)] text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center border border-[var(--color-base-200)]">
                                                        <X className="w-4 h-4 mr-2" /> You withdrew your help
                                                    </div>
                                                    <button
                                                        onClick={handleAccept}
                                                        disabled={accepting}
                                                        className="w-full py-2.5 border border-[var(--color-base-200)] text-[var(--color-blood)] text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center hover:bg-[var(--color-blood-light)] transition-colors disabled:opacity-50"
                                                    >
                                                        {accepting ? "Processing…" : "Offer help again"}
                                                    </button>
                                                </div>
                                            ) : isRequester ? (
                                                <div className="p-4 bg-[var(--color-base-50)] border border-[var(--color-base-200)] rounded-[var(--radius-card)] text-center">
                                                    <p className="text-sm font-bold text-[var(--color-base-500)]">This is your request</p>
                                                </div>
                                            ) : null}

                                            {isRequester && !isClosed && (
                                                <>
                                                    <button
                                                        onClick={handleComplete}
                                                        className="w-full py-3.5 bg-[var(--color-base-900)] text-white text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center shadow-[var(--shadow-clay)] clay-button-hover"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Mark as fulfilled
                                                    </button>
                                                    {confirmingCancel ? (
                                                        <div className="p-4 bg-[var(--color-blood-light)] border border-rose-200 rounded-[var(--radius-card)]">
                                                            <p className="text-sm font-semibold text-[var(--color-blood)] mb-3">Cancel this request? This cannot be undone.</p>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setConfirmingCancel(false)}
                                                                    className="flex-1 py-2 border border-[var(--color-base-200)] text-[var(--color-base-700)] text-sm font-bold rounded-[var(--radius-input)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                                                                >
                                                                    Keep request
                                                                </button>
                                                                <button
                                                                    onClick={handleCancel}
                                                                    className="flex-1 py-2 bg-[var(--color-blood)] text-white text-sm font-bold rounded-[var(--radius-input)] hover:bg-[var(--color-blood-dark)] transition-colors"
                                                                >
                                                                    Yes, cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmingCancel(true)}
                                                            className="w-full py-2.5 border border-[var(--color-base-200)] text-[var(--color-blood)] text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center hover:bg-[var(--color-blood-light)] hover:border-rose-200 transition-colors"
                                                        >
                                                            Cancel request
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (!request) return;
                                                        const shareText = `🚨 URGENT: ${request.blood_group} Blood needed at ${request.hospital_name}!\n\nPatient: ${request.patient_name}\nUnits Needed: ${request.units}\n\nPlease help save a life. Click here to respond:\n${window.location.origin}/request/${requestId}`;
                                                        if (navigator.share) {
                                                            navigator.share({
                                                                title: "Urgent Blood Request",
                                                                text: shareText
                                                            }).catch(() => {});
                                                        } else {
                                                            navigator.clipboard.writeText(shareText);
                                                        }
                                                    }}
                                                    className="w-full py-2.5 bg-[var(--color-base-50)] border border-[var(--color-base-200)] text-[var(--color-base-900)] text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center hover:bg-[var(--color-base-100)] transition-colors"
                                                >
                                                    <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (!request) return;
                                                        const shareText = `🚨 URGENT: ${request.blood_group} Blood needed at ${request.hospital_name}!\n\nPatient: ${request.patient_name}\nUnits Needed: ${request.units}\n\nPlease help save a life. Click here to respond:\n${window.location.origin}/request/${requestId}`;
                                                        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                                                    }}
                                                    className="w-full py-2.5 bg-[#25D366] text-white text-sm font-bold rounded-[var(--radius-card)] flex items-center justify-center hover:bg-[#1EBE5D] transition-colors"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5 mr-2" /> WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Safety notice */}
                                    <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] text-xs text-[var(--color-base-500)] bg-[var(--color-base-50)] border border-[var(--color-base-200)]">
                                        <Shield className="w-4 h-4 shrink-0 text-[var(--color-base-400)] mt-0.5" />
                                        <p>BloodRelay does not screen donors or verify medical history. Coordinate with your medical professional before proceeding.</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
