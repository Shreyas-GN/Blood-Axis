"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { staggerContainer, slideUpFade, timelineDot } from "@/lib/motion";

type StageState = "complete" | "active" | "pending";

interface Stage {
  id: string;
  label: string;
  description: string;
  state: StageState;
}

interface Props {
  status: string;
  donorsNotified: number;
  elapsedMs: number;
}

function deriveStages(status: string, donorsNotified: number, elapsedMs: number): Stage[] {
  const isSearching    = status === "searching";
  const isAccepted     = status === "donor_accepted" || status === "fulfilled";
  const isFulfilled    = status === "fulfilled";
  const isClosed       = status === "cancelled" || status === "expired";
  const radiusExpanded = donorsNotified > 0 || elapsedMs > 3 * 60_000;

  const stageOf = (
    completedWhen: boolean,
    activeWhen: boolean,
  ): StageState => {
    if (isClosed) return "pending";
    if (completedWhen) return "complete";
    if (activeWhen) return "active";
    return "pending";
  };

  return [
    {
      id: "created",
      label: "Request Created",
      description: "BloodRelay received your request and began coordinating.",
      state: "complete",
    },
    {
      id: "searching",
      label: "Searching Nearby Donors",
      description: "Scanning for compatible donors within your area.",
      state: stageOf(!isSearching && !isClosed, isSearching),
    },
    {
      id: "radius",
      label: "Radius Expanded",
      description: "Search area extended to reach more donors.",
      state: stageOf(radiusExpanded && !isClosed, isSearching && !radiusExpanded),
    },
    {
      id: "notified",
      label: "Donors Notified",
      description: donorsNotified > 0
        ? `${donorsNotified} donor${donorsNotified > 1 ? "s" : ""} have been alerted.`
        : "Alerting all nearby donors now.",
      state: stageOf((donorsNotified > 0 || isAccepted) && !isClosed, isSearching && donorsNotified === 0),
    },
    {
      id: "accepted",
      label: "Donor Accepted",
      description: "A donor confirmed availability and is on the way.",
      state: stageOf(isFulfilled, isAccepted && !isFulfilled),
    },
    {
      id: "fulfilled",
      label: "Fulfilled",
      description: "The request has been completed successfully.",
      state: stageOf(isFulfilled, false),
    },
  ];
}

export function RequestTimeline({ status, donorsNotified, elapsedMs }: Props) {
  const stages = deriveStages(status, donorsNotified, elapsedMs);

  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 sm:p-8">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-7">
        Mission Timeline
      </h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        role="list"
        aria-label="Mission progress stages"
      >
        {stages.map((stage, i) => {
          const isLast     = i === stages.length - 1;
          const isComplete = stage.state === "complete";
          const isActive   = stage.state === "active";
          const isPending  = stage.state === "pending";

          return (
            <motion.div
              key={stage.id}
              variants={slideUpFade}
              role="listitem"
              aria-label={`${stage.label}: ${stage.state}`}
              className="flex gap-4"
            >
              {/* Dot + connector */}
              <div className="flex flex-col items-center shrink-0" aria-hidden="true">
                <motion.div
                  variants={timelineDot}
                  initial={isActive ? "active" : isComplete ? "complete" : "inactive"}
                  animate={isActive ? "active" : isComplete ? "complete" : "inactive"}
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0",
                    isComplete
                      ? "bg-[var(--color-success)] border-[var(--color-success)] text-white"
                      : isActive
                      ? "bg-[var(--color-warning-light)] border-[var(--color-warning)]"
                      : "bg-[var(--color-bg)] border-[var(--color-border)]",
                  ].join(" ")}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-border)]" />
                  )}
                </motion.div>

                {!isLast && (
                  <div
                    className={[
                      "w-px flex-1 mt-1 mb-1 min-h-[32px]",
                      isComplete
                        ? "bg-[var(--color-success)] opacity-25"
                        : "bg-[var(--color-border-subtle)]",
                    ].join(" ")}
                  />
                )}
              </div>

              {/* Stage content */}
              <div className={`pb-7 ${isLast ? "pb-0" : ""} min-w-0`}>
                <p
                  className={[
                    "text-sm font-bold leading-tight mb-1",
                    isComplete
                      ? "text-[var(--color-text-primary)]"
                      : isActive
                      ? "text-[var(--color-warning)]"
                      : "text-[var(--color-text-muted)]",
                  ].join(" ")}
                >
                  {stage.label}
                </p>
                <p
                  className={[
                    "text-xs leading-relaxed",
                    isPending
                      ? "text-[var(--color-text-muted)] opacity-40"
                      : "text-[var(--color-text-secondary)]",
                  ].join(" ")}
                >
                  {stage.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
