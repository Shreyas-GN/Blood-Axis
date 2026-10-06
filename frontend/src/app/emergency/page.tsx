/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: system
 * Pre-emit self-critique: P5 H4 E5 S5 R5 V5
 * Audience: Distressed individuals needing immediate blood requests
 * Use case: Extremely rapid emergency blood request formulation
 * Tone: Utilitarian — no fluff, stark contrast, dense functionality
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Mic, ArrowRight, AlertTriangle, CheckCircle, Droplet, X } from "lucide-react";
import { OTPVerification } from "@/components/auth/OTPVerification";

type Step = "input" | "otp" | "submitting" | "done";

interface ParsedRequest {
    blood_group: string | null;
    urgency_level: string;
    hospital_name: string | null;
    units: number;
    patient_name: string | null;
    requester_name: string | null;
    relation: string | null;
    reason: string | null;
}

const fieldClass =
    "w-full h-12 bg-[var(--color-bg-elevated)] border-b border-x-0 border-t-0 border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] px-0 text-[15px] font-body rounded-none focus:outline-none focus:border-[var(--color-primary)] transition-colors hover:border-[var(--color-border-subtle)]";

const labelClass = "block text-[11px] font-metric text-[var(--color-text-secondary)] uppercase tracking-wide mb-1";

export default function EmergencyPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("input");
    const [text, setText] = useState("");
    const [phone, setPhone] = useState("");
    const [requesterName, setRequesterName] = useState("");
    const [parsed, setParsed] = useState<ParsedRequest | null>(null);
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState<string>("Detecting location...");
    const [isManualLocation, setIsManualLocation] = useState(false);
    const [manualCity, setManualCity] = useState("Bangalore");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [entryMode, setEntryMode] = useState<"ai" | "manual">("ai");
    const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocationLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                },
                () => setLocationLabel("Location unavailable — enter manually")
            );
        }
    }, []);

    const handleVoice = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { setParseError("Voice input isn't supported in this browser. Please type your request."); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = false;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
            return;
        }
        setIsListening(true);
        recognition.start();
        recognition.onresult = (e: any) => {
            setText((prev) => prev + " " + e.results[0][0].transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
    };

    const handleParse = async () => {
        if (!text.trim()) return;
        setParsing(true);
        setParseError(null);
        try {
            const res = await fetch("/api/ai/parse-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setParsed(json.data);
            if (json.data.requester_name) setRequesterName(json.data.requester_name);
        } catch (e: any) {
            setParseError(e.message || "Couldn't parse your request. Try again.");
        } finally {
            setParsing(false);
        }
    };

    const handleOTPVerified = async () => {
        if (!parsed) return;
        setStep("submitting");
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    blood_group: parsed.blood_group || "O+",
                    units: parsed.units,
                    patient_name: isAnonymous
                        ? "Anonymous Patient"
                        : parsed.patient_name || requesterName || "Emergency Patient",
                    hospital_name: parsed.hospital_name || "Unknown Hospital",
                    city: isManualLocation ? manualCity : parsed.hospital_name || "Bangalore",
                    contact_phone: phone,
                    urgency_level: parsed.urgency_level,
                    requester_relation: parsed.relation || null,
                    status: "searching",
                    latitude: location?.lat || 12.9716,
                    longitude: location?.lng || 77.5946,
                    location: location
                        ? `POINT(${location.lng} ${location.lat})`
                        : `POINT(77.5946 12.9716)`,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Submission failed");
            setCreatedRequestId(data.request?.id);
            setStep("done");
        } catch (e: any) {
            setParseError(e.message);
            setStep("input");
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex flex-col md:flex-row overflow-hidden">
            {/* Nav Archetype: Edge-aligned minimal (N9) */}
            <div className="md:fixed top-0 left-0 w-full p-6 z-50 pointer-events-none">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm font-metric pointer-events-auto"
                >
                    <span className="w-2 h-2 rounded-none bg-[var(--color-primary)]"></span>
                    Blood Axis
                </Link>
            </div>

            {/* Left Pane: Context & Status */}
            <div className="w-full md:w-[40%] md:h-screen md:sticky top-0 p-6 pt-24 md:p-12 md:pt-24 border-b md:border-b-0 md:border-r border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between">
                <div>
                    <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-[var(--color-text-primary)] leading-none tracking-tight">
                        Need blood<br />
                        <span className="text-[var(--color-primary)]">right now.</span>
                    </h1>
                    <p className="mt-6 text-base font-body text-[var(--color-text-secondary)] max-w-sm">
                        Create an emergency request. We will ping every available donor in your radius instantly. No account required.
                    </p>
                </div>
                
                <div className="hidden md:block">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse-breath"></div>
                            <span className="font-metric text-xs text-[var(--color-text-secondary)] tracking-wide">SYSTEM READY</span>
                        </div>
                        <p className="font-metric text-xs text-[var(--color-text-muted)]">
                            {locationLabel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Pane: Workbench Area */}
            <div className="w-full md:w-[60%] min-h-screen bg-[var(--color-bg-elevated)] p-6 md:p-12 pt-12 md:pt-24">
                <div className="max-w-xl mx-auto">
                    <AnimatePresence mode="wait">
                        
                        {/* ─── INPUT STEP ─────────────────────────────────────────── */}
                        {step === "input" && (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                {/* Location Row Mobile */}
                                <div className="md:hidden flex items-center justify-between py-3 border-b border-[var(--color-border)] mb-8">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <MapPin className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                                        <span className="text-sm font-metric text-[var(--color-text-secondary)] truncate">{locationLabel}</span>
                                    </div>
                                    <button
                                        onClick={() => setIsManualLocation(!isManualLocation)}
                                        className="font-metric text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors shrink-0 ml-3"
                                    >
                                        {isManualLocation ? "USE GPS" : "MANUAL OVERRIDE"}
                                    </button>
                                </div>
                                <div className="hidden md:flex justify-end mb-8">
                                    <button
                                        onClick={() => setIsManualLocation(!isManualLocation)}
                                        className="font-metric text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                    >
                                        {isManualLocation ? "REVERT TO GPS" : "MANUAL LOCATION OVERRIDE"}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {isManualLocation && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-8 overflow-hidden"
                                        >
                                            <div className="border-l-2 border-[var(--color-primary)] pl-4 py-1 space-y-4">
                                                <div>
                                                    <p className={labelClass}>City / Area</p>
                                                    <div className="flex items-end gap-4">
                                                        <input
                                                            type="text"
                                                            value={manualCity}
                                                            onChange={(e) => setManualCity(e.target.value)}
                                                            placeholder="e.g. Indiranagar, Bangalore"
                                                            className={fieldClass}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                setLocationLabel(`📍 ${manualCity}`);
                                                                setIsManualLocation(false);
                                                            }}
                                                            className="h-12 px-6 bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body font-semibold text-sm hover:bg-black transition-colors"
                                                        >
                                                            Set
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Mode Switcher (Workbench Tabs) */}
                                <div className="flex border-b border-[var(--color-border)] mb-8">
                                    <button
                                        onClick={() => setEntryMode("ai")}
                                        className={`pb-3 pr-6 text-sm font-metric transition-colors border-b-2 -mb-[1px] ${
                                            entryMode === "ai"
                                                ? "text-[var(--color-text-primary)] border-[var(--color-text-primary)]"
                                                : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]"
                                        }`}
                                    >
                                        01 — ASSISTANT
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEntryMode("manual");
                                            if (!parsed)
                                                setParsed({
                                                    blood_group: "O+",
                                                    units: 1,
                                                    patient_name: "",
                                                    hospital_name: "",
                                                    requester_name: "",
                                                    relation: "Unspecified",
                                                    reason: "",
                                                    urgency_level: "IMMEDIATE",
                                                });
                                        }}
                                        className={`pb-3 px-6 text-sm font-metric transition-colors border-b-2 -mb-[1px] ${
                                            entryMode === "manual"
                                                ? "text-[var(--color-text-primary)] border-[var(--color-text-primary)]"
                                                : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]"
                                        }`}
                                    >
                                        02 — MANUAL ENTRY
                                    </button>
                                </div>

                                {/* ── AI mode ── */}
                                {entryMode === "ai" && (
                                    <div className="space-y-8">
                                        <div className="relative">
                                            <p className={labelClass}>Describe the emergency</p>
                                            <textarea
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                placeholder={`"Need 2 units of B+ blood urgently at Manipal Hospital for my father in ICU"`}
                                                rows={4}
                                                className="w-full bg-[var(--color-bg-elevated)] border-b border-x-0 border-t-0 border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] p-0 pt-2 pb-2 pr-12 text-[15px] font-body resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors hover:border-[var(--color-border-subtle)]"
                                            />
                                            <button
                                                onClick={handleVoice}
                                                title={isListening ? "Stop listening" : "Speak"}
                                                className={`absolute right-0 bottom-3 p-2 transition-colors ${
                                                    isListening
                                                        ? "text-[var(--color-primary)] animate-pulse"
                                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                                                }`}
                                            >
                                                <Mic className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {!parsed && (
                                            <button
                                                onClick={handleParse}
                                                disabled={parsing || !text.trim()}
                                                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed group"
                                            >
                                                {parsing ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                        ANALYZING
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 font-metric">
                                                        ANALYZE INPUT
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                )}
                                            </button>
                                        )}

                                        {/* Detected details */}
                                        <AnimatePresence>
                                            {parsed && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border border-[var(--color-border)] bg-[var(--color-bg)]">
                                                        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                                                            <p className="font-metric text-xs text-[var(--color-text-secondary)] tracking-widest">
                                                                EXTRACTED DATA
                                                            </p>
                                                            <button
                                                                onClick={() => setParsed(null)}
                                                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                                                            {[
                                                                { label: "BLOOD", value: parsed.blood_group || "—" },
                                                                { label: "UNITS", value: String(parsed.units) },
                                                                { label: "URGENCY", value: parsed.urgency_level?.replace(/_/g, " ") || "—" },
                                                                { label: "HOSPITAL", value: parsed.hospital_name || "Not detected" },
                                                                { label: "FOR", value: parsed.patient_name || "Patient" },
                                                                { label: "RELATION", value: parsed.relation || "—" },
                                                            ].map((item) => (
                                                                <div key={item.label} className="min-w-0">
                                                                    <p className="font-metric text-[10px] text-[var(--color-text-muted)] mb-1">
                                                                        {item.label}
                                                                    </p>
                                                                    <p className="font-body text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                                                        {item.value}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {!parsed.blood_group && (
                                                            <div className="px-4 pb-4">
                                                                <p className="text-xs text-[var(--color-warning)] font-body flex items-center gap-1.5">
                                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                                    Blood group missing. Please add it to your description.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* ── Manual form ── */}
                                {entryMode === "manual" && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelClass}>Blood Group</label>
                                                <select
                                                    value={parsed?.blood_group || "O+"}
                                                    onChange={(e) =>
                                                        setParsed({ ...parsed!, blood_group: e.target.value })
                                                    }
                                                    className={fieldClass + " cursor-pointer bg-transparent appearance-none rounded-none"}
                                                >
                                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                                        <option key={bg} value={bg}>{bg}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Units</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={parsed?.units || 1}
                                                    onChange={(e) =>
                                                        setParsed({
                                                            ...parsed!,
                                                            units: parseInt(e.target.value) || 1,
                                                        })
                                                    }
                                                    className={fieldClass}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Hospital Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Apollo Hospital"
                                                value={parsed?.hospital_name || ""}
                                                onChange={(e) =>
                                                    setParsed({ ...parsed!, hospital_name: e.target.value })
                                                }
                                                className={fieldClass}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelClass}>Patient Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Required"
                                                    value={parsed?.patient_name || ""}
                                                    onChange={(e) =>
                                                        setParsed({ ...parsed!, patient_name: e.target.value })
                                                    }
                                                    className={fieldClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Relation</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Friend, Parent"
                                                    value={parsed?.relation || ""}
                                                    onChange={(e) =>
                                                        setParsed({ ...parsed!, relation: e.target.value })
                                                    }
                                                    className={fieldClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error message */}
                                {parseError && (
                                    <p className="mt-6 text-sm text-[var(--color-danger)] font-body flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        {parseError}
                                    </p>
                                )}

                                {/* ── Contact section ── */}
                                <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
                                    <div className="flex items-center justify-between mb-6">
                                        <p className="font-metric text-xs text-[var(--color-text-primary)] tracking-widest uppercase">
                                            Verification
                                        </p>
                                        <button
                                            onClick={() => setIsAnonymous(!isAnonymous)}
                                            className="flex items-center gap-2 font-metric text-[10px] tracking-wide transition-colors group"
                                        >
                                            <span
                                                className={`w-3.5 h-3.5 border flex items-center justify-center transition-colors ${
                                                    isAnonymous
                                                        ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)]"
                                                        : "border-[var(--color-border-subtle)] group-hover:border-[var(--color-text-muted)]"
                                                }`}
                                            >
                                                {isAnonymous && <span className="w-1.5 h-1.5 bg-[var(--color-bg)]" />}
                                            </span>
                                            <span className={isAnonymous ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
                                                POST ANONYMOUSLY
                                            </span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Your Name</label>
                                            <input
                                                type="text"
                                                value={requesterName}
                                                onChange={(e) => setRequesterName(e.target.value)}
                                                placeholder="John Doe"
                                                className={fieldClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Phone Number</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+91 98765..."
                                                className={fieldClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Primary CTA ── */}
                                <div className="mt-10">
                                    {entryMode === "ai" && parsed ? (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setParsed(null)}
                                                className="btn-secondary font-metric text-xs"
                                            >
                                                RESET
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!phone.trim()) return setParseError("Phone number required.");
                                                    if (!parsed.blood_group) return setParseError("Blood group required.");
                                                    setParseError(null);
                                                    setStep("otp");
                                                }}
                                                className="btn-primary flex-1 group font-metric text-xs"
                                            >
                                                VERIFY & BROADCAST
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    ) : entryMode === "manual" ? (
                                        <button
                                            onClick={() => {
                                                if (!phone.trim()) return setParseError("Phone number required.");
                                                if (!parsed?.blood_group || !parsed?.hospital_name)
                                                    return setParseError("Blood group and hospital name required.");
                                                setParseError(null);
                                                setStep("otp");
                                            }}
                                            className="btn-primary w-full group font-metric text-xs tracking-wider"
                                        >
                                            VERIFY & BROADCAST
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : null}
                                </div>
                            </motion.div>
                        )}

                        {/* ─── OTP STEP ───────────────────────────────────────────── */}
                        {step === "otp" && (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="pt-4"
                            >
                                <OTPVerification
                                    phone={phone}
                                    onVerified={handleOTPVerified}
                                    onBack={() => setStep("input")}
                                />
                            </motion.div>
                        )}

                        {/* ─── SUBMITTING STEP ────────────────────────────────────── */}
                        {step === "submitting" && (
                            <motion.div
                                key="submitting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-start justify-center min-h-[50vh] gap-6"
                            >
                                <div className="flex gap-4 items-center">
                                    <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="font-metric text-sm tracking-widest text-[var(--color-primary)]">BROADCASTING</p>
                                </div>
                                <div>
                                    <p className="font-display font-bold text-3xl text-[var(--color-text-primary)]">Writing to network...</p>
                                    <p className="font-body text-[var(--color-text-secondary)] mt-2">Alerting registered donors in your vicinity.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── DONE STEP ──────────────────────────────────────────── */}
                        {step === "done" && (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-start justify-center min-h-[50vh] gap-8"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-4 text-[var(--color-success)]">
                                        <CheckCircle className="w-6 h-6" />
                                        <span className="font-metric text-sm tracking-widest">CONFIRMED</span>
                                    </div>
                                    <p className="font-display font-bold text-4xl md:text-5xl text-[var(--color-text-primary)] leading-none">
                                        Signal Sent.
                                    </p>
                                    <p className="font-body text-[var(--color-text-secondary)] text-lg mt-4 max-w-sm">
                                        Donors are being notified right now. We will text you as soon as someone accepts.
                                    </p>
                                </div>
                                {createdRequestId && (
                                    <button
                                        onClick={() => router.push(`/request/${createdRequestId}`)}
                                        className="btn-primary font-metric text-xs tracking-wider"
                                    >
                                        MONITOR STATUS
                                    </button>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
