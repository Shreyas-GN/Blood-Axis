"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Zap } from "lucide-react";
import { btnPrimary, btnSecondary, wrap } from "./styles";

const ease = [0.16, 1, 0.3, 1] as const;

function RequestCard() {
  return (
    <figure
      aria-label="Example of a live blood request"
      className="w-full max-w-[460px] rounded-2xl border p-6 sm:p-8 shadow-[0_24px_80px_-32px_color-mix(in_oklab,var(--color-accent)_55%,transparent)]"
      style={{ backgroundColor: "var(--color-paper-2)", borderColor: "var(--color-rule)" }}
    >
      <div className="flex items-center justify-between mb-8">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-2)" }}>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping motion-reduce:animate-none" style={{ backgroundColor: "var(--color-accent)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
          </span>
          Live request
        </span>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>Example</span>
      </div>

      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}>
          O−
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-tight">O− needed</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm" style={{ color: "var(--color-ink-2)" }}>
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Apollo Hospital, Chennai</span>
          </p>
        </div>
      </div>

      <dl className="flex items-baseline justify-between border-t pt-5 mb-7" style={{ borderColor: "var(--color-rule)" }}>
        <dt className="text-sm" style={{ color: "var(--color-muted)" }}>Distance</dt>
        <dd className="text-3xl font-semibold tabular-nums">1.4 km</dd>
      </dl>

      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider"
        style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
      >
        <Zap className="w-4 h-4 fill-current" /> Accept
      </motion.div>
    </figure>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className={`${wrap} pt-16 pb-24 md:pt-28 md:pb-36 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center`}>
      <div className="lg:col-span-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-6" style={{ color: "var(--color-accent-text)" }}>
          Emergency blood network
        </p>
        <h1 id="hero-title" className="font-semibold leading-[1.02] tracking-tight mb-8" style={{ fontSize: "clamp(2.75rem, 7.5vw, 5.75rem)" }}>
          Right blood. Right person. <span style={{ color: "var(--color-accent-text)" }}>Right now.</span>
        </h1>
        <p className="text-lg md:text-xl leading-relaxed max-w-xl mb-10" style={{ color: "var(--color-ink-2)" }}>
          BloodAxis finds compatible donors near the hospital and alerts them instantly. You watch them come.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link href="/emergency" className={btnPrimary}>I need blood <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
          <Link href="/login" className={btnSecondary}>Become a donor</Link>
        </div>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>Free. Private. Any phone.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease }} className="lg:col-span-5 flex justify-center lg:justify-end">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="w-full flex justify-center lg:justify-end">
          <RequestCard />
        </motion.div>
      </motion.div>
    </section>
  );
}
