"use client";

import { motion } from "framer-motion";
import { Phone, Heart, Droplet, MapPin, Clock, Users } from "lucide-react";
import { sheetSlideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface MapBottomSheetProps {
  bloodGroup: string;
  hospital: string;
  status: string;
  donorsNotified: number;
  eta: string;
  elapsedTime: string;
  radius: number;
  contactPhone?: string;
  canHelp?: boolean;
  onHelp?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  searching:      "BloodAxis is actively searching",
  donor_accepted: "A donor has accepted",
  fulfilled:      "Request fulfilled",
  cancelled:      "Request cancelled",
  expired:        "Search expired",
};

const STATUS_DOT: Record<string, string> = {
  searching:      "bg-[var(--color-warning)] animate-pulse",
  donor_accepted: "bg-[var(--color-success)]",
  fulfilled:      "bg-[var(--color-success)]",
  cancelled:      "bg-[var(--color-text-muted)]",
  expired:        "bg-[var(--color-text-muted)]",
};

export function MapBottomSheet({
  bloodGroup,
  hospital,
  status,
  donorsNotified,
  eta,
  elapsedTime,
  radius,
  contactPhone,
  canHelp,
  onHelp,
}: MapBottomSheetProps) {
  const statusLabel = STATUS_LABEL[status] ?? "Active";
  const dotClass    = STATUS_DOT[status] ?? "bg-[var(--color-warning)]";
  const isLive      = status === "searching" || status === "donor_accepted";

  return (
    <motion.div
      variants={sheetSlideUp}
      initial="hidden"
      animate="visible"
      className="fixed bottom-0 inset-x-0 z-30 md:hidden"
      role="complementary"
      aria-label="Request status"
    >
      {/* Sheet surface */}
      <div
        className="bg-[var(--color-bg-elevated)] rounded-t-[28px] px-5 pt-3 pb-safe"
        style={{ boxShadow: "0 -4px 40px rgba(0,0,0,0.10)" }}
      >
        {/* Drag handle */}
        <div className="w-9 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-5" aria-hidden="true" />

        {/* Blood group + hospital row */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl bg-[var(--color-danger-light)] flex items-center justify-center shrink-0"
              aria-label={`Blood group ${bloodGroup}`}
            >
              <span className="font-mono font-black text-xl text-[var(--color-danger)] leading-none tracking-tight">
                {bloodGroup}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[var(--color-text-primary)] text-sm leading-tight truncate">
                {hospital}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
                <span className="text-xs text-[var(--color-text-secondary)]">{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <Stat icon={<MapPin className="w-3.5 h-3.5" />} label="Radius" value={`${radius}km`} />
          <Stat icon={<Users className="w-3.5 h-3.5" />} label="Notified" value={String(donorsNotified)} />
          <Stat className="col-span-2 flex-row items-center justify-between" icon={<Clock className="w-3.5 h-3.5" />} label="Elapsed" value={elapsedTime} />
        </div>

        {/* ETA row */}
        {isLive && (
          <div className="flex items-center justify-between py-3 px-4 bg-[var(--color-border-subtle)] rounded-[14px] mb-4">
            <span className="text-xs text-[var(--color-text-secondary)]">Estimated arrival</span>
            <span className="font-mono font-bold text-sm text-[var(--color-text-primary)]">{eta}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {canHelp && onHelp && (
            <button
              onClick={onHelp}
              className="flex-1 min-h-[52px] bg-[var(--color-cta)] text-white font-bold text-sm rounded-[var(--radius-button)] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(214,58,58,0.25)] active:scale-[0.99] transition-transform"
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              I can help
            </button>
          )}

          {contactPhone && (
            <a href={`tel:${contactPhone}`} className="flex-1">
              <button className="w-full min-h-[52px] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-sm rounded-[var(--radius-button)] flex items-center justify-center gap-2 hover:bg-[var(--color-border-subtle)] transition-colors">
                <Phone className="w-4 h-4" aria-hidden="true" />
                Call contact
              </button>
            </a>
          )}

          {!canHelp && !contactPhone && (
            <div className="flex-1 min-h-[52px] flex items-center justify-center text-sm text-[var(--color-text-muted)]">
              <Droplet className="w-4 h-4 mr-2 text-[var(--color-cta)]" aria-hidden="true" />
              Searching for donors…
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={cn("bg-[var(--color-border-subtle)] rounded-[14px] p-3 flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1 text-[var(--color-text-muted)]">{icon}</div>
      <p className="font-mono font-bold text-base text-[var(--color-text-primary)] leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
