"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Droplet, MapPin, ArrowRight, Shield, CheckCircle2, Heart, Zap, FileText, Users, Clock, Search } from "lucide-react";
import { useProfile } from "@/context/AuthContext";
const SignedIn = ({ children }: { children: React.ReactNode }) => { const { user } = useProfile(); return user ? <>{children}</> : null; };
const SignedOut = ({ children }: { children: React.ReactNode }) => { const { user } = useProfile(); return !user ? <>{children}</> : null; };
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActivityFeedPreview } from "@/components/landing/ActivityFeedPreview";
import { CommandPalette, useCommandPalette } from "@/components/ui/CommandPalette";

// --- Hallmark Stamp ---
/* Hallmark · macrostructure: Stat-Led
 * theme: custom (bespoke) · vibe: "utilitarian mission-control meets urgent care" 
 * paper: oklch(14% 0.01 20) · accent: oklch(55% 0.18 20)
 * display: sans-serif · body: sans-serif · axes: dark / geometric-sans / chromatic-terracotta
 * gates: all-pass · studied: no
 */

// Custom OKLCH Tokens for this bespoke page
const customTokens = {
  "--color-paper": "oklch(14% 0.01 20)",
  "--color-paper-2": "oklch(18% 0.01 20)",
  "--color-paper-3": "oklch(22% 0.01 20)",
  "--color-ink": "oklch(95% 0.01 20)",
  "--color-ink-2": "oklch(75% 0.01 20)",
  "--color-rule": "oklch(26% 0.01 20)",
  "--color-muted": "oklch(60% 0.01 20)",
  "--color-accent": "oklch(55% 0.18 20)",
  "--color-accent-ink": "oklch(95% 0.01 20)",
  "--color-success": "oklch(65% 0.15 150)",
  "--color-warning": "oklch(75% 0.15 70)",
  // font fallback
  "--font-display": "var(--font-display, 'Inter', sans-serif)",
  "--font-body": "var(--font-body, 'Inter', sans-serif)",
  "--font-mono": "var(--font-mono, 'JetBrains Mono', monospace)",
} as React.CSSProperties;

const ease = [0.16, 1, 0.3, 1] as const;
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function NumberTicker({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 40, stiffness: 60 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(target);
  }, [inView, target, mv]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

function RequestPreviewCard() {
  return (
    <div 
      className="w-full max-w-[380px] rounded-sm border group"
      style={{
        backgroundColor: "var(--color-paper-2)",
        borderColor: "var(--color-rule)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--color-success)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-success)" }} />
          </span>
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--color-ink-2)" }}>Live Request</span>
        </div>
        <StatusBadge status="searching" size="sm" />
      </div>
      <div className="p-4">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-sm flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform duration-300" 
               style={{ backgroundColor: "var(--color-paper-3)", color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
            O-
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--color-ink)" }}>O- Blood Needed</span>
              <StatusBadge urgency="IMMEDIATE" size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
              <MapPin className="w-3 h-3" />
              <span className="truncate">Apollo Hospital, Chennai</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-sm border" style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-rule)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Distance</div>
            <div className="text-sm font-semibold font-mono" style={{ color: "var(--color-ink)" }}>1.4 km</div>
          </div>
          <div className="p-3 rounded-sm border" style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-rule)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Time Elapsed</div>
            <div className="text-sm font-semibold font-mono" style={{ color: "var(--color-warning)" }}>2m 14s</div>
          </div>
        </div>
        <button disabled className="w-full h-10 rounded-sm text-sm font-medium flex items-center justify-center gap-2 opacity-90 cursor-default"
                style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}>
          <Zap className="w-4 h-4 fill-current" /> Accept Request
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans antialiased selection:bg-red-500/30"
         style={{ ...customTokens, backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
      
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Nav: N13 Inline Command (Minimalist) */}
      <header className="sticky top-0 z-50 h-16 border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(20, 20, 20, 0.85)", backdropFilter: "blur(12px)" }}>
        <div className="w-full max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <Droplet className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
            <span className="text-sm font-bold tracking-widest uppercase">BloodRelay</span>
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <SignedIn>
              <button onClick={() => setCmdOpen(true)} className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-sm border transition-colors group"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)", backgroundColor: "var(--color-paper-2)" }}>
                <Search className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                <span>Command Menu</span>
                <kbd className="text-[10px] font-mono opacity-60 ml-2">⌘K</kbd>
              </button>
              <Link href="/dashboard" className="font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--color-ink-2)" }}>Dashboard</Link>
              <Link href="/settings" className="font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--color-ink-2)" }}>Settings</Link>
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in" className="font-medium hover:opacity-80 transition-opacity hidden sm:block" style={{ color: "var(--color-ink-2)" }}>Sign In</Link>
              <Link href="/sign-up" className="h-8 px-4 rounded-sm flex items-center text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
                Register
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col">
        
        {/* 04 Stat-Led Hero */}
        <section className="w-full max-w-[1440px] mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 border-b" style={{ borderColor: "var(--color-rule)" }}>
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl">
            <motion.div variants={fadeIn} className="flex items-baseline gap-4 md:gap-8 flex-wrap mb-8">
              <h1 className="font-mono font-bold leading-none tracking-tighter" style={{ fontSize: "clamp(5rem, 12vw, 10rem)", color: "var(--color-ink)" }}>
                0<NumberTicker target={8} />
              </h1>
              <div className="flex flex-col">
                <span className="font-mono text-2xl md:text-4xl font-semibold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>Min.</span>
              </div>
            </motion.div>
            
            <motion.h2 variants={fadeIn} className="text-2xl md:text-3xl font-medium mb-12 max-w-2xl leading-snug" style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-display)" }}>
              Average response time from alert to donor acceptance. Every second counts when a life is on the line.
            </motion.h2>

            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
              <Link href="/emergency">
                <button className="h-12 px-8 rounded-sm text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all"
                        style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}>
                  Declare Emergency <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/sign-up">
                <button className="h-12 px-8 rounded-sm text-sm font-bold uppercase tracking-wider flex items-center justify-center w-full sm:w-auto border hover:bg-[var(--color-paper-2)] transition-colors"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
                  Join Donor Network
                </button>
              </Link>
            </motion.div>

            <motion.div variants={fadeIn} className="mt-12 flex items-center gap-6 text-xs font-mono tracking-widest uppercase" style={{ color: "var(--color-muted)" }}>
              <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> End-to-end privacy</div>
              <div className="hidden sm:flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Zero fees forever</div>
            </motion.div>
          </motion.div>
        </section>

        {/* Live Activity & Network Stats */}
        <section className="w-full max-w-[1440px] mx-auto px-6 py-24 border-b" style={{ borderColor: "var(--color-rule)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
                <motion.div variants={fadeIn} className="flex items-center gap-3 mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--color-success)" }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-success)" }} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-ink)" }}>Network Status: Active</span>
                </motion.div>
                <motion.h3 variants={fadeIn} className="text-3xl md:text-4xl font-medium mb-6 leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                  Real-time coordination across the subcontinent.
                </motion.h3>
                <motion.p variants={fadeIn} className="text-sm leading-relaxed mb-12 max-w-md" style={{ color: "var(--color-ink-2)" }}>
                  We bypassed the middlemen. BloodRelay connects hospitals and families directly with verified, willing donors within a 20km radius. This is what decentralized urgency looks like.
                </motion.p>
                
                <motion.div variants={fadeIn} className="grid grid-cols-2 gap-8 border-t pt-8" style={{ borderColor: "var(--color-rule)" }}>
                  <div>
                    <div className="text-3xl font-mono font-bold mb-2" style={{ color: "var(--color-ink)" }}><NumberTicker target={4200} suffix="+" /></div>
                    <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>Lives Supported</div>
                  </div>
                  <div>
                    <div className="text-3xl font-mono font-bold mb-2" style={{ color: "var(--color-ink)" }}><NumberTicker target={18700} suffix="+" /></div>
                    <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>Verified Donors</div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            
            <div className="lg:col-span-6 lg:col-start-7">
              <ActivityFeedPreview />
            </div>
          </div>
        </section>

        {/* Narrative Workflow / Process */}
        <section className="w-full max-w-[1440px] mx-auto px-6 py-24 border-b" style={{ borderColor: "var(--color-rule)" }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-3xl mb-16">
            <motion.span variants={fadeIn} className="text-xs font-bold uppercase tracking-widest block mb-4" style={{ color: "var(--color-muted)" }}>Protocol</motion.span>
            <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-medium leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
              Three phases. Minimal friction.<br/>Zero time wasted.
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border" style={{ borderColor: "var(--color-rule)" }}>
            {[
              { num: "01", title: "Broadcast Need", desc: "Specify blood type, location, and urgency. Under 60 seconds.", icon: FileText },
              { num: "02", title: "Algorithmic Match", desc: "The engine pings compatible, verified donors within a 20km radius immediately.", icon: MapPin },
              { num: "03", title: "Direct Relay", desc: "A donor accepts. Private contact channels open. Data moves securely.", icon: Clock }
            ].map((step, idx) => (
              <motion.div key={step.num} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} variants={fadeIn}
                          className={`p-8 md:p-12 ${idx !== 2 ? 'border-b md:border-b-0 md:border-r' : ''}`} style={{ borderColor: "var(--color-rule)" }}>
                <div className="flex justify-between items-start mb-8">
                  <step.icon className="w-6 h-6" style={{ color: "var(--color-ink-2)" }} />
                  <span className="font-mono text-xl font-bold" style={{ color: "var(--color-rule)" }}>{step.num}</span>
                </div>
                <h3 className="text-lg font-medium mb-3" style={{ color: "var(--color-ink)" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Split Studio: Donor Preview */}
        <section className="w-full max-w-[1440px] mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="order-2 lg:order-1 flex justify-center lg:justify-start">
              <RequestPreviewCard />
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="order-1 lg:order-2">
              <motion.span variants={fadeIn} className="text-xs font-bold uppercase tracking-widest block mb-4" style={{ color: "var(--color-accent)" }}>For Donors</motion.span>
              <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-medium leading-tight mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                Radical clarity.
              </motion.h2>
              <motion.p variants={fadeIn} className="text-sm leading-relaxed mb-8 max-w-md" style={{ color: "var(--color-ink-2)" }}>
                When an alert triggers, you see only the critical vectors: blood type, facility, distance, and elapsed time. One tap to accept. Your identity remains cloaked until you engage.
              </motion.p>
              <motion.ul variants={fadeIn} className="space-y-4">
                {["No commitment until acceptance.", "Identity protected by default.", "Silent mode available 24/7."].map((point, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--color-muted)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-rule)" }} />
                    {point}
                  </li>
                ))}
              </motion.ul>
            </motion.div>
          </div>
        </section>

        {/* Footer / Final CTA */}
        <footer className="w-full border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper-2)" }}>
          <div className="w-full max-w-[1440px] mx-auto px-6 pt-24 pb-12">
            <div className="max-w-2xl mb-24">
              <h2 className="text-4xl md:text-6xl font-medium leading-none mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                Standby to save a life.
              </h2>
              <Link href="/sign-up">
                <button className="h-12 px-8 rounded-sm text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
                  Register to the Network <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pt-8 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4" style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
                <span className="text-sm font-bold tracking-widest uppercase">BloodRelay</span>
              </div>
              <div className="flex flex-wrap gap-6 text-xs uppercase tracking-widest font-mono" style={{ color: "var(--color-muted)" }}>
                <Link href="/emergency" className="hover:text-[var(--color-ink)] transition-colors">Emergency</Link>
                <Link href="/privacy" className="hover:text-[var(--color-ink)] transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-[var(--color-ink)] transition-colors">Terms</Link>
              </div>
              <div className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
                © {new Date().getFullYear()} OPERATIONAL
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
