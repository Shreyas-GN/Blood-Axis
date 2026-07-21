"use client";

import { motion } from "framer-motion";
import { MapPin, Droplet, Clock, Phone, ChevronRight } from "lucide-react";
import type { BloodRequest } from "@/types";

interface BentoRequestCardProps {
    request: BloodRequest;
    onClick: () => void;
    onAccept: (e: React.MouseEvent) => void;
    isAccepting: boolean;
    isAccepted: boolean;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    IMMEDIATE: { bg: "bg-[var(--color-danger-light)]", text: "text-[var(--color-danger)]", label: "Critical" },
    TODAY:     { bg: "bg-[var(--color-warning-light)]", text: "text-[var(--color-warning)]", label: "Today" },
    SCHEDULED: { bg: "bg-[var(--color-border-subtle)]", text: "text-[var(--color-text-secondary)]",  label: "Scheduled" },
};

export function BentoRequestCard({ request, onClick, onAccept, isAccepting, isAccepted }: BentoRequestCardProps) {
    const urgency = URGENCY_STYLES[request.urgency_level ?? ""] ?? {
        bg: "bg-[var(--color-border-subtle)]",
        text: "text-[var(--color-text-secondary)]",
        label: "Standard",
    };

    return (
        <motion.article
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="h-full cursor-pointer flex flex-col bg-[var(--color-bg-elevated)] group"
            onClick={onClick}
            aria-label={`Blood request for ${request.blood_group} at ${request.hospital_name}`}
        >
            <div className="p-6 flex flex-col h-full justify-between gap-6">
                <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col gap-2">
                            <span className={`w-fit px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-metric tracking-wider ${urgency.bg} ${urgency.text}`}>
                                {urgency.label}
                            </span>
                            <h3 className="font-display text-xl text-[var(--color-text-primary)] leading-tight">
                                {request.patient_name}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-[6px] border border-[var(--color-border)] flex items-center justify-center shrink-0 ml-3 bg-[var(--color-bg)] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <span className="text-base font-bold font-metric text-[var(--color-primary)]">{request.blood_group}</span>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[13px] font-body text-[var(--color-text-primary)] truncate">{request.hospital_name}</p>
                            <p className="text-[11px] font-body text-[var(--color-text-muted)]">{request.city}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 border-l-2 border-[var(--color-border)] pl-3">
                            <span className="text-[10px] font-metric text-[var(--color-text-muted)] uppercase tracking-wider">Units</span>
                            <span className="text-sm font-metric text-[var(--color-text-primary)]">{request.units}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-l-2 border-[var(--color-border)] pl-3">
                            <span className="text-[10px] font-metric text-[var(--color-text-muted)] uppercase tracking-wider">Responses</span>
                            <span className="text-sm font-metric text-[var(--color-text-primary)]">
                                {request.confirmed_count || 0}/{request.notified_count || 0}
                            </span>
                        </div>
                    </div>

                    {/* Action */}
                    <div>
                        {isAccepted ? (
                            <div className="flex items-center justify-between gap-3 bg-[var(--color-success-light)] p-3 rounded-[6px] border border-[var(--color-success)]/20">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-metric text-[var(--color-success)] mb-1 uppercase tracking-wider">You are helping</p>
                                    <a
                                        href={`tel:${request.contact_phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs font-metric text-[var(--color-success)] flex items-center gap-1.5"
                                    >
                                        <Phone className="w-3 h-3" />
                                        {request.contact_phone}
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAccept(e); }}
                                disabled={isAccepting}
                                className="w-full h-10 bg-[var(--color-text-primary)] text-white rounded-[6px] text-[13px] font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors"
                            >
                                {isAccepting ? (
                                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                ) : (
                                    "I can help"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.article>
    );
}
