"use client";

import { useState } from "react";
import { useProfile } from "@/context/AuthContext";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { User } from "@/types";

interface Props {
    profile: User | null;
    onToggle: () => void;
}

export function AvailabilityCard({ profile, onToggle }: Props) {
    const { user, profile: authProfile, isLoading: isLoaded } = useProfile();
    const updateProfile = useMutation(api.users.update);
    const logActivity = useMutation(api.activities.log);
    const [isAvailable, setIsAvailable] = useState(profile?.is_available_donor ?? false);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!user || loading || !profile) return;
        setLoading(true);
        const next = !isAvailable;
        try {
            await updateProfile({ isAvailableDonor: next });
            await logActivity({
                eventType: "availability_changed",
                description: next ? "You turned on donor availability." : "You turned off donor availability.",
            });
            setIsAvailable(next);
            onToggle();
        } catch {
            /* silently ignore */
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between w-full h-full bg-[var(--color-bg-elevated)]">
            <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                    <div className="relative w-2 h-2 shrink-0">
                        <span className={`absolute inset-0 rounded-full transition-colors ${isAvailable ? "bg-[var(--color-success)]" : "bg-[var(--color-text-muted)]"}`} />
                        {isAvailable && <span className="absolute inset-0 rounded-full bg-[var(--color-success)] animate-ping opacity-40" />}
                    </div>
                    <span className="text-sm font-metric text-[var(--color-text-primary)] uppercase tracking-wider">
                        {isAvailable ? "Status: Active" : "Status: Paused"}
                    </span>
                </div>
                <p className="text-[13px] font-body text-[var(--color-text-secondary)] max-w-[200px]">
                    {isAvailable
                        ? `Monitoring ${profile?.blood_group ?? ""} emergencies.`
                        : "Not receiving requests."}
                </p>
            </div>

            <button
                onClick={handleToggle}
                disabled={loading || !profile}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isAvailable ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-subtle)]'}`}
                role="switch"
                aria-checked={isAvailable}
            >
                {loading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin absolute" />
                ) : (
                    <span
                        className={`pointer-events-none absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                )}
            </button>
        </div>
    );
}
