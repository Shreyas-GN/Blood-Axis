"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Droplet, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

// --- Hallmark Stamp ---
/* Hallmark · macrostructure: Split Studio
 * theme: custom (bespoke) · vibe: "utilitarian mission-control meets urgent care" 
 * paper: oklch(14% 0.01 20) · accent: oklch(55% 0.18 20)
 * display: sans-serif · body: sans-serif · axes: dark / geometric-sans / chromatic-terracotta
 * gates: all-pass · studied: no
 */

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
  "--font-display": "var(--font-display, 'Inter', sans-serif)",
  "--font-body": "var(--font-body, 'Inter', sans-serif)",
  "--font-mono": "var(--font-mono, 'JetBrains Mono', monospace)",
} as React.CSSProperties;

export default function SignUpPage() {
    return (
        <div className="min-h-[100dvh] w-full flex font-sans antialiased selection:bg-red-500/30" 
             style={{ ...customTokens, backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
            
            {/* Left panel - Branding / Proof */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper-2)" }}>
                <div>
                    <Link href="/" className="inline-flex items-center gap-2 group mb-16">
                        <Droplet className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
                        <span className="text-sm font-bold tracking-widest uppercase">BloodRelay</span>
                    </Link>
                    
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <span className="font-mono text-xs font-bold uppercase tracking-widest mb-6 block" style={{ color: "var(--color-muted)" }}>
                            Network Activation
                        </span>
                        <h1 className="text-4xl xl:text-5xl font-medium leading-tight mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                            You are joining a decentralized emergency response network.
                        </h1>
                        <p className="text-lg leading-relaxed max-w-md" style={{ color: "var(--color-ink-2)" }}>
                            We bypass the middlemen. Every verified donor adds immediate operational bandwidth to hospitals and families in crisis.
                        </p>
                    </motion.div>
                </div>
                
                <div className="flex items-center gap-6 text-xs font-mono tracking-widest uppercase border-t pt-8" style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}>
                    <div>01 / Declare Need</div>
                    <div>02 / Algorithmic Match</div>
                    <div style={{ color: "var(--color-accent)" }}>03 / Direct Relay</div>
                </div>
            </div>

            {/* Right panel - Auth */}
            <div className="w-full lg:w-1/2 flex flex-col p-6 md:p-12 relative" style={{ backgroundColor: "var(--color-paper)" }}>
                <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-12">
                    <Droplet className="w-5 h-5" style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
                    <span className="text-sm font-bold tracking-widest uppercase">BloodRelay</span>
                </Link>

                <Link href="/" className="hidden lg:inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase absolute top-12 right-12 hover:opacity-80 transition-opacity" style={{ color: "var(--color-muted)" }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                </Link>

                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md">
                        <SignUp
                            routing="path"
                            path="/sign-up"
                            forceRedirectUrl="/onboarding"
                            appearance={{
                                variables: {
                                    colorPrimary: "rgb(214, 58, 58)",
                                    colorBackground: "rgb(25, 25, 25)",
                                    colorText: "rgb(242, 242, 242)",
                                    colorTextSecondary: "rgb(153, 153, 153)",
                                    colorInputBackground: "rgb(30, 30, 30)",
                                    colorInputText: "rgb(242, 242, 242)",
                                    colorDanger: "rgb(214, 58, 58)",
                                    colorSuccess: "rgb(34, 197, 94)",
                                    fontFamily: "var(--font-body, 'Inter', sans-serif)",
                                },
                                elements: {
                                    card: "bg-transparent border-0 shadow-none p-0",
                                    headerTitle: "text-2xl font-medium tracking-tight font-display mb-1 text-[var(--color-ink)]",
                                    headerSubtitle: "text-sm text-[var(--color-ink-2)]",
                                    socialButtonsBlockButton: "border border-[var(--color-rule)] hover:bg-[var(--color-paper-2)] transition-colors rounded-sm",
                                    dividerLine: "bg-[var(--color-rule)]",
                                    dividerText: "text-[var(--color-muted)]",
                                    formFieldLabel: "text-xs font-mono uppercase tracking-widest text-[var(--color-ink-2)] mb-1.5",
                                    formFieldInput: "bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-sm focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors",
                                    formButtonPrimary: "bg-[var(--color-accent)] hover:opacity-90 transition-opacity rounded-sm text-sm font-bold uppercase tracking-wider h-11",
                                    footerActionText: "text-[var(--color-muted)]",
                                    footerActionLink: "text-[var(--color-accent)] hover:text-[var(--color-ink)] transition-colors font-semibold",
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
