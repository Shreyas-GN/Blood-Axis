/* Hallmark · genre: modern-minimal · macrostructure: Bento Grid · theme: Cobalt · enrichment: A · nav: N5 · footer: Ft2 */
"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProfileAction, getResponsesForDonorAction, submitDonorResponseAction } from "@/app/actions/donor.actions";
import { getActiveRequestsAction } from "@/app/actions/request.actions";
import { getRecentActivitiesAction, logActivityAction } from "@/app/actions/activity.actions";

import {
    Droplet, Settings, AlertTriangle, Heart, CheckCircle2, Activity, UserCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertService } from "@/services/alert.service";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RequestDetailDrawer } from "@/components/request/RequestDetailDrawer";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { BentoRequestCard } from "@/components/dashboard/BentoRequestCard";
import { AvailabilityCard } from "@/components/dashboard/AvailabilityCard";
import { ImpactCard } from "@/components/dashboard/ImpactCard";
import { FilterPills, type FilterOption } from "@/components/dashboard/FilterPills";
import type { BloodRequest, User } from "@/types";
import { supabaseClient } from "@/lib/supabase/client";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { NotificationPrompt } from "@/components/notifications/NotificationPrompt";
import { BottomNav } from "@/components/nav/BottomNav";
import { CommandPalette, useCommandPalette } from "@/components/ui/CommandPalette";

/* ─── Helpers ─── */
function isToday(date: Date): boolean {
    const now = new Date();
    return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    useRealtimeAlerts();

    const [profile, setProfile] = useState<User | null>(null);
    const [allRequests, setAllRequests] = useState<BloodRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState<number | string | null>(null);
    const [acceptedIds, setAcceptedIds] = useState<Set<number | string>>(new Set());
    const [selectedRequestId, setSelectedRequestId] = useState<string | number | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
    const [boardError, setBoardError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [profileData, requestsData] = await Promise.all([
                getProfileAction().catch(() => null),
                getActiveRequestsAction().catch(() => []),
            ]);
            setProfile(profileData as any);
            setAllRequests(requestsData as any);

            if (profileData) {
                try {
                    const data = await getResponsesForDonorAction();
                    setAcceptedIds(new Set(data.filter((r: any) => r.status !== 'CANCELLED').map((r: any) => r.request_id)));
                } catch { /* ignore */ }
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => {
        if (!isLoaded) return;
        if (!user) { router.push("/"); return; }
        fetchData();

        const channel = supabaseClient
            .channel("dashboard_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => fetchData())
            .on("postgres_changes", { event: "*", schema: "public", table: "donor_responses" }, () => fetchData())
            .subscribe();

        return () => { supabaseClient.removeChannel(channel); };
    }, [isLoaded, user, fetchData, router]);

    const handleAccept = async (requestId: any) => {
        setAcceptingId(requestId);
        setBoardError(null);
        try {
            await submitDonorResponseAction(requestId.toString(), 'ACCEPTED');

            const req = allRequests.find((r: any) => r.id === requestId);
            if (req?.contact_phone) {
                await AlertService.sendSMS(
                    req.contact_phone,
                    `BloodRelay ALERT: ${profile?.full_name || "A donor"} has offered to donate blood for ${req.patient_name || "your request"}. Check your dashboard for details.`
                );
            }

            await logActivityAction(
                "donor_accepted",
                `You offered to donate blood for ${req?.patient_name || "a patient"} at ${req?.hospital_name || "the hospital"}.`,
                requestId.toString()
            );

            setAcceptedIds((prev) => new Set(prev).add(requestId));
            await fetchData();
        } catch (err: any) {
            setBoardError(err.message || "We encountered an issue. Please try again.");
        } finally {
            setAcceptingId(null);
        }
    };

    useEffect(() => {
        if (!loading && profile && profile.profile_completed === false) {
            router.push("/onboarding");
        }
    }, [loading, profile, router]);

    const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

    if (!isLoaded || loading) return <div className="min-h-screen bg-[var(--color-bg)]" />;

    const donateRequests = profile?.is_available_donor ? allRequests.filter(
        (r) =>
            r.requester_id !== (profile?.id ?? -1) &&
            (r.blood_group === profile?.blood_group || r.requester_id === null) &&
            (r.status === "searching" || r.status === "donor_accepted" || acceptedIds.has(r.id))
    ) : [];

    const myRequests = allRequests.filter(
        (r) => r.requester_id === profile?.id
    );

    const filteredRequests = (() => {
        if (activeFilter === "Emergency")
            return donateRequests.filter((r) => r.urgency_level === "IMMEDIATE");
        if (activeFilter === "My Requests")
            return myRequests;
        if (activeFilter === "Today")
            return donateRequests.filter((r) => isToday(new Date(r.created_at)));
        if (activeFilter === "Fulfilled")
            return allRequests.filter((r) => acceptedIds.has(r.id) && r.status === "fulfilled");
        return donateRequests;
    })();

    const filterCounts: Partial<Record<FilterOption, number>> = {
        Emergency: donateRequests.filter((r) => r.urgency_level === "IMMEDIATE").length,
        "My Requests": myRequests.length,
        Today: donateRequests.filter((r) => isToday(new Date(r.created_at))).length,
        Fulfilled: allRequests.filter((r) => acceptedIds.has(r.id) && r.status === "fulfilled").length,
    };

    const livesSupported = acceptedIds.size;
    const successfulDonations = allRequests.filter(
        (r) => acceptedIds.has(r.id) && r.status === "fulfilled"
    ).length;
    const activeNow = allRequests.filter((r) => r.status === "searching").length;
    const hasEmergency = donateRequests.some((r) => r.urgency_level === "IMMEDIATE");

    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)] flex flex-col pb-24 md:pb-0">
            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

            {/* N5: Floating Pill Nav */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-3xl px-4 flex justify-center">
                <nav className="inline-flex items-center gap-6 px-3.5 py-2.5 bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-full shadow-[0_8px_24px_-12px_rgba(0,0,0,0.1)] pointer-events-auto">
                    <Link href="/" className="flex items-center gap-2 pl-2">
                        <Droplet className="w-4 h-4 fill-[var(--color-primary)] stroke-[var(--color-primary)]" />
                        <span className="font-display font-bold text-sm tracking-tight text-[var(--color-text-primary)]">BloodRelay</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-4 border-l border-[var(--color-border)] pl-4">
                        <button
                            onClick={() => setCmdOpen(true)}
                            className="text-xs font-metric text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                        >
                            Search <kbd className="font-mono bg-[var(--color-border-subtle)] px-1 rounded ml-1">⌘K</kbd>
                        </button>
                        <Link href="/activity" className="text-xs font-body font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                            Activity
                        </Link>
                    </div>
                    <div className="flex items-center gap-3 border-l border-[var(--color-border)] pl-4">
                        <NotificationBell />
                        <Link href="/settings" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors" title="Settings">
                            <Settings className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/request/wizard"
                            className="bg-[var(--color-text-primary)] text-white px-3.5 py-1.5 rounded-full text-xs font-body font-medium flex items-center gap-1.5 hover:bg-black transition-colors"
                        >
                            <AlertTriangle className={`w-3.5 h-3.5 ${hasEmergency ? "text-[var(--color-danger)] animate-pulse" : ""}`} />
                            Request
                        </Link>
                    </div>
                </nav>
            </div>

            {/* Hero (Fixed Height) */}
            <header className="pt-32 pb-12 px-6 flex flex-col items-center text-center">
                <h1 className="font-display text-4xl md:text-5xl tracking-tight text-[var(--color-text-primary)]">
                    Donor Dashboard
                </h1>
                <p className="font-body text-base text-[var(--color-text-secondary)] mt-4 max-w-md">
                    Review active requests, manage your availability, and track your lifetime impact on the network.
                </p>
            </header>

            {/* Bento Grid Body */}
            <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-min gap-4">
                    
                    {/* Bento Span 2x1: Availability */}
                    <div className="md:col-span-2 card-base flex items-center p-6 border border-[var(--color-border)] rounded-[var(--radius-card)]">
                        <AvailabilityCard profile={profile} onToggle={fetchData} />
                    </div>

                    {/* Bento Span 1x1: Impact 1 */}
                    <div className="card-base p-6 border border-[var(--color-border)] rounded-[var(--radius-card)]">
                        <ImpactCard label="Lives Supported" value={livesSupported} icon={Heart} />
                    </div>

                    {/* Bento Span 1x1: Impact 2 */}
                    <div className="card-base p-6 border border-[var(--color-border)] rounded-[var(--radius-card)]">
                        <ImpactCard label="Active Network" value={activeNow} icon={Activity} />
                    </div>

                    {/* Filters Span Full */}
                    <div className="lg:col-span-4 py-2">
                        <FilterPills active={activeFilter} onChange={setActiveFilter} counts={filterCounts} />
                    </div>

                    {/* Bento Requests (varying spans based on content) */}
                    {filteredRequests.map((req, idx) => {
                        // Irregular rhythm: first item spans 2 on tablet, 1 on desktop
                        // Alternate spans to create a true bento grid feel instead of uniform cards
                        const isWide = idx === 0 || idx % 5 === 0;
                        return (
                            <div key={req.id} className={`card-interactive p-0 overflow-hidden border border-[var(--color-border)] rounded-[var(--radius-card)] ${isWide ? 'md:col-span-2 lg:col-span-2' : 'lg:col-span-1'}`}>
                                <BentoRequestCard
                                    request={req}
                                    onClick={() => setSelectedRequestId(req.id)}
                                    onAccept={() => handleAccept(req.id)}
                                    isAccepting={acceptingId === req.id}
                                    isAccepted={acceptedIds.has(req.id)}
                                />
                            </div>
                        );
                    })}

                    {!profile?.is_available_donor && activeFilter !== "My Requests" && (
                        <div className="lg:col-span-4 card-base p-12 text-center border border-[var(--color-border)] rounded-[var(--radius-card)] bg-[var(--color-bg-elevated)]">
                            <p className="font-display font-medium text-lg mb-2">You're currently offline.</p>
                            <p className="font-body text-[var(--color-text-secondary)] text-sm">Toggle your availability above to start receiving match requests.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Ft2: Inline Rule Single Line Footer */}
            <footer className="w-full max-w-[1280px] mx-auto px-6 py-8 border-t border-[var(--color-border-subtle)]">
                <p className="font-metric text-xs text-[var(--color-text-muted)] text-center">
                    © 2026 · BloodRelay Core · Encrypted Network
                </p>
            </footer>

            <RequestDetailDrawer
                requestId={selectedRequestId}
                onClose={() => setSelectedRequestId(null)}
                onActionComplete={() => { fetchData(); setSelectedRequestId(null); }}
            />
            <NotificationPrompt />
            <BottomNav />
        </div>
    );
}
