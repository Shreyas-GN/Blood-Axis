"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE_EVENTS = [
  { icon: "❤️", text: "O+ donor accepted in Bangalore", time: "just now" },
  { icon: "🩸", text: "B+ request created in Mumbai", time: "2m ago" },
  { icon: "✓", text: "A− request fulfilled in Chennai", time: "5m ago" },
  { icon: "❤️", text: "AB+ donor accepted in Hyderabad", time: "8m ago" },
  { icon: "🩸", text: "O− urgent request in Delhi", time: "11m ago" },
  { icon: "✓", text: "B+ request fulfilled in Pune", time: "14m ago" },
  { icon: "❤️", text: "A+ donor accepted in Kochi", time: "17m ago" },
  { icon: "🩸", text: "O+ request created in Ahmedabad", time: "20m ago" },
];

type FeedItem = { uid: number; icon: string; text: string; time: string };

export function ActivityFeedPreview() {
  const [visible, setVisible] = useState<FeedItem[]>(() =>
    BASE_EVENTS.slice(0, 4).map((e, i) => ({ ...e, uid: i }))
  );
  const [cursor, setCursor] = useState(4);
  const [uid, setUid] = useState(100);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible((prev) => {
        const next = BASE_EVENTS[cursor % BASE_EVENTS.length];
        return [{ ...next, time: "just now", uid }, ...prev.slice(0, 3)];
      });
      setCursor((c) => c + 1);
      setUid((u) => u + 1);
    }, 2800);
    return () => clearInterval(id);
  }, [cursor, uid]);

  return (
    <div
      className="w-full rounded-sm border overflow-hidden"
      style={{ backgroundColor: "var(--color-paper-2, #1c1717)", borderColor: "var(--color-rule, #2e2828)" }}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-rule,#2e2828)]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-70" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
        </span>
        <span className="text-[11px] font-semibold text-[var(--color-muted,#8a8282)] uppercase tracking-[0.1em]">
          Live activity
        </span>
      </div>

      <ul className="overflow-hidden" role="log" aria-live="polite" aria-label="Live activity feed">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((item) => (
            <motion.li
              key={item.uid}
              initial={{ opacity: 0, y: -28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-rule,#2e2828)] last:border-0"
            >
              <span className="text-sm shrink-0 w-5 text-center">{item.icon}</span>
              <span className="text-[13px] text-[var(--color-ink,#f2eded)] flex-1 leading-snug font-medium">
                {item.text}
              </span>
              <span className="text-[11px] text-[var(--color-muted,#8a8282)] font-[var(--font-mono)] shrink-0 tabular-nums">
                {item.time}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
