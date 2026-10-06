"use client";

import { motion } from "framer-motion";
import { staggerContainer, slideUpFade } from "@/lib/motion";

interface Event {
  id: string;
  emoji: string;
  text: string;
  timeAgo: string;
}

interface Props {
  status: string;
  bloodGroup: string;
  donorsNotified: number;
  acceptedCount: number;
  elapsedMs: number;
}

function buildEvents(
  status: string,
  bloodGroup: string,
  donorsNotified: number,
  acceptedCount: number,
  elapsedMs: number,
): Event[] {
  const min = Math.floor(elapsedMs / 60_000);
  const ago = (offset: number) => {
    const t = Math.max(0, min - offset);
    return t === 0 ? "Just now" : `${t}m ago`;
  };

  const events: Event[] = [];

  events.push({
    id: "created",
    emoji: "🩸",
    text: `${bloodGroup} blood request created`,
    timeAgo: ago(min),
  });

  if (status !== "cancelled") {
    events.push({
      id: "scanning",
      emoji: "📡",
      text: "BloodRelay began scanning nearby donors",
      timeAgo: ago(min - 1),
    });
  }

  if (donorsNotified > 0 || elapsedMs > 3 * 60_000) {
    events.push({
      id: "radius",
      emoji: "📍",
      text: "Search radius expanded to reach more donors",
      timeAgo: ago(Math.max(min - 3, 0)),
    });
  }

  if (donorsNotified > 0) {
    events.push({
      id: "notified",
      emoji: "🔔",
      text: `${donorsNotified} donor${donorsNotified > 1 ? "s" : ""} notified`,
      timeAgo: ago(Math.max(min - 4, 0)),
    });
  }

  if (acceptedCount > 0 || status === "donor_accepted" || status === "fulfilled") {
    events.push({
      id: "accepted",
      emoji: "❤️",
      text: "Donor accepted — help is on the way",
      timeAgo: ago(Math.max(min - 5, 0)),
    });
  }

  if (status === "fulfilled") {
    events.push({ id: "fulfilled", emoji: "✓", text: "Request fulfilled — mission complete", timeAgo: "Just now" });
  }

  if (status === "cancelled") {
    events.push({ id: "cancelled", emoji: "✕", text: "Request was cancelled", timeAgo: "Just now" });
  }

  return events.reverse();
}

export function ActivityFeed({ status, bloodGroup, donorsNotified, acceptedCount, elapsedMs }: Props) {
  const events = buildEvents(status, bloodGroup, donorsNotified, acceptedCount, elapsedMs);

  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 sm:p-8">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-5">
        Activity
      </h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
        role="feed"
        aria-label="Request activity feed"
      >
        {events.map((event) => (
          <motion.div
            key={event.id}
            variants={slideUpFade}
            className="flex items-start gap-3"
            role="article"
          >
            <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">{event.emoji}</span>
            <p className="flex-1 min-w-0 text-sm text-[var(--color-text-primary)] leading-snug">
              {event.text}
            </p>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono shrink-0 mt-0.5 whitespace-nowrap">
              {event.timeAgo}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
