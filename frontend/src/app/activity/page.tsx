"use client";

import { useProfile } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Droplet, ArrowLeft } from "lucide-react";
import { DonorService } from "@/services/donor.service";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { BottomNav } from "@/components/nav/BottomNav";
import { EmptyStateActivity } from "@/components/ui/EmptyState";

function ActivitySkeleton() {
    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)]">
            <header
                className="sticky top-0 z-50 border-b border-[var(--color-border-subtle)] h-16"
                style={{ background: "rgba(252,252,251,0.92)" }}
            />
            <main className="max-w-[720px] mx-auto px-6 py-10">
                <div className="mb-8 space-y-2">
                    <div className="skeleton h-8 w-28 rounded-lg" />
                    <div className="skeleton h-4 w-56 rounded" />
                </div>
                <div className="card-base p-5 space-y-5">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex gap-3 items-start">
                            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2 pt-1">
                                <div className="skeleton h-3.5 rounded-full" style={{ width: `${55 + i * 5}%` }} />
                                <div className="skeleton h-3 rounded-full w-3/4" />
                                <div className="skeleton h-2.5 rounded-full w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default function ActivityPage() {
    const { user, profile, isLoading: authLoading } = useProfile();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }
    }, [authLoading, user, router]);

    if (authLoading || (!profile && user)) return <ActivitySkeleton />;

    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text-primary)] pb-24 md:pb-0">
            <header
                className="sticky top-0 z-50 border-b border-[var(--color-border-subtle)] h-16 flex justify-center"
                style={{ background: "rgba(252,252,251,0.92)", backdropFilter: "blur(12px)" }}
            >
                <nav className="w-full max-w-[1280px] px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <div className="w-px h-4 bg-[var(--color-border-subtle)]" aria-hidden="true" />
                        <Link href="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-md">
                            <Droplet className="w-4 h-4 fill-[var(--color-cta)] stroke-[var(--color-cta)]" />
                            <span className="text-[15px] font-semibold tracking-tight">Blood Axis</span>
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="max-w-[720px] mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1
                        className="font-display font-bold text-[var(--color-text-primary)] tracking-tight"
                        style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", lineHeight: 1.1 }}
                    >
                        Activity
                    </h1>
                    <p className="text-[var(--color-text-muted)] mt-1 text-[14px]">
                        Every action you've taken on Blood Axis.
                    </p>
                </div>

                {profile?.id ? (
                    <ActivityTimeline userId={profile.id} limit={50} compact />
                ) : (
                    <div className="card-base">
                        <EmptyStateActivity />
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
