"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Heart, Activity } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import type { ActivityEventType } from "@/types/database.types";

interface ActivityRow {
    id: string;
    user_id: string;
    request_id: string | null;
    event_type: ActivityEventType;
    description: string;
    created_at: string;
}

type StyleKey = "request" | "response" | "fulfillment";

const EVENT_STYLE_MAP: Record<ActivityEventType, StyleKey> = {
    request_created:      "request",
    request_cancelled:    "request",
    request_expired:      "request",
    donor_accepted:       "response",
    profile_completed:    "response",
    availability_changed: "response",
    notification_sent:    "response",
    request_fulfilled:    "fulfillment",
};

const STYLE_MAP: Record<StyleKey, {
    borderColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ComponentType<any>;
}> = {
    request: {
        borderColor: "var(--color-danger)",
        iconBg: "var(--color-danger-light)",
        iconColor: "text-[var(--color-danger)]",
        icon: AlertTriangle,
    },
    response: {
        borderColor: "var(--color-primary)",
        iconBg: "var(--color-bg)",
        iconColor: "text-[var(--color-primary)]",
        icon: Heart,
    },
    fulfillment: {
        borderColor: "var(--color-success)",
        iconBg: "var(--color-success-light)",
        iconColor: "text-[var(--color-success)]",
        icon: CheckCircle2,
    },
};

interface Props {
    userId?: string;
    limit?: number;
    compact?: boolean;
}

export function ActivityTimeline({ userId, limit = 20, compact = false }: Props) {
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            try {
                let query = (supabaseClient as any)
                    .from("activities")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (userId) query = query.eq("user_id", userId);

                const { data, error } = await query;
                if (!error && data) setActivities(data as ActivityRow[]);
            } catch { /* silently fail */ }
            finally { setLoading(false); }
        }
        fetch();
    }, [userId, limit]);

    if (loading) {
        return (
            <div className="card-base p-0 flex flex-col overflow-hidden h-full min-h-[200px] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                    <div className="h-3.5 w-20 bg-[var(--color-border-subtle)] rounded-full animate-pulse" />
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="card-base p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                <div className="w-10 h-10 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] flex items-center justify-center mb-4">
                    <Activity className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <h3 className="font-display text-base text-[var(--color-text-primary)]">No activity yet</h3>
                <p className="font-body text-xs text-[var(--color-text-secondary)] mt-1">Your network activity will appear here.</p>
            </div>
        );
    }

    return (
        <div className={`card-base p-0 flex flex-col overflow-hidden relative border border-[var(--color-border)] rounded-[var(--radius-card)] ${compact ? "" : "h-full min-h-[400px]"}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 sticky top-0 bg-[var(--color-bg-elevated)] z-10 border-b border-[var(--color-border-subtle)]">
                <h3 className="font-metric text-xs uppercase tracking-widest text-[var(--color-text-primary)]">
                    {userId ? "Activity" : "Live Feed"}
                </h3>
                <div className="flex items-center gap-1.5 bg-[var(--color-success-light)] text-[var(--color-success)] text-[10px] font-metric rounded-[4px] px-2 py-0.5 uppercase tracking-wider border border-[var(--color-success)]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                    Live
                </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                <div className="pb-10">
                    {activities.map((item, i) => {
                        const styleKey = EVENT_STYLE_MAP[item.event_type] ?? "response";
                        const style = STYLE_MAP[styleKey];
                        const Icon = style.icon;
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03, duration: 0.2 }}
                                className="flex items-start gap-4 p-5 hover:bg-[var(--color-bg)] transition-colors border-l-[3px] border-b border-b-[var(--color-border-subtle)]"
                                style={{ borderLeftColor: style.borderColor }}
                            >
                                <div
                                    className="w-6 h-6 rounded-[4px] flex items-center justify-center shrink-0 border border-[var(--color-border)]"
                                    style={{ background: style.iconBg }}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${style.iconColor}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-body text-[13px] text-[var(--color-text-primary)] leading-relaxed">
                                        {item.description}
                                    </p>
                                    <div className="font-metric text-[10px] text-[var(--color-text-muted)] mt-1.5">
                                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Fade gradient */}
            <div
                className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
                style={{ background: "linear-gradient(transparent, var(--color-bg-elevated))" }}
            />
        </div>
    );
}
