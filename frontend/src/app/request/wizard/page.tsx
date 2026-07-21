"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/AuthContext";
import { logActivityAction } from "@/app/actions/activity.actions";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldAlert,
  Clock,
  Calendar,
  CheckCircle2,
  Phone,
  Loader2,
  AlertTriangle,
  Sparkles,
  SkipForward,
  Search,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { supabaseClient as supabase } from "@/lib/supabase/client";
import { DonorService } from "@/services/donor.service";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { BloodGroupCard } from "@/components/wizard/BloodGroupCard";
import { HospitalResultCard, type Hospital } from "@/components/wizard/HospitalResultCard";
import { UrgencyCard } from "@/components/wizard/UrgencyCard";
import { ReviewCard } from "@/components/wizard/ReviewCard";
import { slideUpFade, staggerContainer } from "@/lib/motion";

// ── Constants ────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const STATIC_HOSPITALS: Hospital[] = [
  { id: "aiims-delhi", name: "AIIMS Delhi", city: "New Delhi", distance: "3.1 km" },
  { id: "apollo-hyd", name: "Apollo Hospitals", city: "Hyderabad", distance: "2.4 km" },
  { id: "fortis-gurgaon", name: "Fortis Memorial Research Institute", city: "Gurugram", distance: "5.7 km" },
  { id: "manipal-blr", name: "Manipal Hospital", city: "Bengaluru", distance: "1.9 km" },
  { id: "kims-hyd", name: "KIMS Hospital", city: "Hyderabad", distance: "3.3 km" },
  { id: "lilavati-mum", name: "Lilavati Hospital", city: "Mumbai", distance: "4.2 km" },
  { id: "pgimer-chd", name: "PGIMER", city: "Chandigarh", distance: "0.8 km" },
  { id: "cmc-vellore", name: "CMC Vellore", city: "Vellore", distance: "6.5 km" },
  { id: "medanta-grg", name: "Medanta – The Medicity", city: "Gurugram", distance: "8.1 km" },
  { id: "narayana-blr", name: "Narayana Health City", city: "Bengaluru", distance: "11.2 km" },
  { id: "tata-kol", name: "Tata Medical Center", city: "Kolkata", distance: "7.4 km" },
  { id: "max-delhi", name: "Max Super Speciality Hospital", city: "New Delhi", distance: "4.9 km" },
  { id: "ruby-kol", name: "Ruby General Hospital", city: "Kolkata", distance: "9.0 km" },
  { id: "care-hyd", name: "CARE Hospitals", city: "Hyderabad", distance: "5.2 km" },
];

const URGENCY_OPTIONS = [
  {
    id: "IMMEDIATE" as const,
    label: "Immediate",
    description: "Critical — needed within hours.",
    icon: ShieldAlert,
    colorClass: "text-[var(--color-blood)]",
    borderClass: "border-[var(--color-blood)]",
    bgClass: "bg-[var(--color-blood-light)]",
  },
  {
    id: "TODAY" as const,
    label: "Today",
    description: "Required within the next 24 hours.",
    icon: Clock,
    colorClass: "text-[var(--color-warn)]",
    borderClass: "border-[var(--color-warn)]",
    bgClass: "bg-[var(--color-warn-light)]",
  },
  {
    id: "SCHEDULED" as const,
    label: "Scheduled",
    description: "Planned surgery or future need.",
    icon: Calendar,
    colorClass: "text-[var(--color-base-500)]",
    borderClass: "border-[var(--color-base-500)]",
    bgClass: "bg-[var(--color-base-100)]",
  },
] as const;

// Steps 1–5 shown in the indicator (Step 0 = AI parser, Step 6 = OTP)
const WIZARD_STEPS = ["Blood Group", "Hospital", "Urgency", "Patient", "Review"];

// ── Slide variants for step transitions ─────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 48 : -48, opacity: 0 }),
};

// ── Page ─────────────────────────────────────────────────────

export default function RequestWizardPage() {
  const router = useRouter();
  const { user } = useProfile();

  // Step 0 = AI parser, 1–5 = wizard, 6 = OTP
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isMockMode, setIsMockMode] = useState(false);

  // AI parser
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  // Hospital search
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patient_name: "",
    hospital_name: "",
    contact_phone: "",
    blood_group: "",
    units: 1,
    urgency_level: "IMMEDIATE",
    city: "",
  });

  // ── Navigation helpers ─────────────────────────────────────

  function goTo(step: number) {
    setStepDir(step > currentStep ? 1 : -1);
    setError(null);
    setCurrentStep(step);
  }

  function handleNext() {
    goTo(currentStep + 1);
  }

  function handleBack() {
    if (currentStep > 0) goTo(currentStep - 1);
  }

  // ── Validation ─────────────────────────────────────────────

  function isNextDisabled(): boolean {
    if (currentStep === 1) return !formData.blood_group;
    if (currentStep === 2) return !formData.hospital_name;
    if (currentStep === 3) return !formData.urgency_level;
    if (currentStep === 4) return !formData.patient_name || !formData.contact_phone;
    return false;
  }

  // ── Hospital selection ─────────────────────────────────────

  const filteredHospitals = STATIC_HOSPITALS.filter(
    (h) =>
      h.name.toLowerCase().includes(hospitalQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(hospitalQuery.toLowerCase())
  );

  function selectHospital(hospital: Hospital) {
    setSelectedHospitalId(hospital.id);
    setFormData((prev) => ({
      ...prev,
      hospital_name: hospital.name,
      city: hospital.city,
    }));
  }

  // ── AI Parser ──────────────────────────────────────────────

  async function handleAiParse() {
    if (!aiInput.trim() || aiInput.trim().length < 5) {
      setError("Please describe your emergency in a bit more detail.");
      return;
    }
    setAiParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "AI parsing failed. You can fill the form manually.");
        return;
      }
      const d = json.data;
      const filled = new Set<string>();
      const updates: Partial<typeof formData> = {};

      if (d.blood_group) { updates.blood_group = d.blood_group; filled.add("blood_group"); }
      if (d.urgency_level) { updates.urgency_level = d.urgency_level; filled.add("urgency_level"); }
      if (d.hospital_name) { updates.hospital_name = d.hospital_name; filled.add("hospital_name"); }
      if (d.units && d.units > 1) { updates.units = d.units; filled.add("units"); }
      if (d.patient_name) { updates.patient_name = d.patient_name; filled.add("patient_name"); }

      setFormData((prev) => ({ ...prev, ...updates }));
      setAiFilledFields(filled);
      goTo(1);
    } catch {
      setError("Could not reach AI service. Please fill the form manually.");
    } finally {
      setAiParsing(false);
    }
  }

  // ── OTP & Submission ───────────────────────────────────────

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formData.contact_phone,
      });
      if (otpError) {
        setIsMockMode(true);
      }
      goTo(6);
    } catch {
      setIsMockMode(true);
      goTo(6);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndSubmit() {
    setLoading(true);
    setError(null);
    let finalUserId = user?.id;

    try {
      if (!user) {
        if (isMockMode) {
          const { data, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) throw anonError;
          finalUserId = data.user?.id;
        } else {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            phone: formData.contact_phone,
            token: otpCode,
            type: "sms",
          });
          if (verifyError) throw verifyError;
          finalUserId = data.user?.id;
        }

        if (finalUserId) {
          await DonorService.updateProfile(finalUserId, {
            full_name: formData.patient_name + " (Requester)",
            phone: formData.contact_phone,
            city: formData.city,
            blood_group: formData.blood_group as any,
            is_donor: false,
          });
        }
      }

      if (!finalUserId) throw new Error("Authentication failed.");

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: finalUserId,
          patient_name: formData.patient_name,
          hospital_name: formData.hospital_name,
          city: formData.city,
          contact_phone: formData.contact_phone,
          blood_group: formData.blood_group as any,
          units: formData.units,
          urgency_level: formData.urgency_level as any,
          status: "searching",
          note: "",
          requester_relation: "OTHER",
          location: "POINT(0 0)",
          latitude: null,
          longitude: null,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to create request');
      }
      const newRequest = json.request;

      await logActivityAction(
        'request_created',
        `Created a blood request for ${formData.patient_name} at ${formData.hospital_name} (${formData.blood_group}, ${formData.urgency_level}).`,
        newRequest?.id?.toString() ?? null
      );

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "We couldn't submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitClick() {
    if (!user) {
      handleSendOtp();
    } else {
      handleVerifyAndSubmit();
    }
  }

  // ── Render ─────────────────────────────────────────────────

  const showStepIndicator = currentStep >= 1 && currentStep <= 5;

  return (
    <div className="min-h-[100dvh] bg-[var(--color-base-50)] flex flex-col items-center">

      {/* ── Sticky header ───────────────────────────────────── */}
      <header className="w-full sticky top-0 z-50 bg-[rgba(252,252,251,0.90)] backdrop-blur-[14px] border-b border-[var(--color-base-200)]">
        <div className="w-full max-w-[720px] mx-auto px-6 pt-4 pb-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`inline-flex items-center text-[0.875rem] font-bold text-[var(--color-base-500)] hover:text-[var(--color-base-900)] transition-colors ${currentStep === 0 ? "invisible" : ""}`}
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Back
          </button>

          <span className="font-display font-bold text-[1.0625rem] text-[var(--color-base-900)]">
            Emergency Request
          </span>

          <Link
            href="/dashboard"
            className="text-[0.875rem] font-bold text-[var(--color-base-500)] hover:text-[var(--color-base-900)] transition-colors"
          >
            Cancel
          </Link>
        </div>

        {showStepIndicator && (
          <div className="w-full max-w-[720px] mx-auto px-6 pb-4">
            <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
          </div>
        )}
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="w-full max-w-[720px] mx-auto px-6 py-10 flex-1 flex flex-col">

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mb-6 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[var(--radius-card)] text-[var(--color-danger)] text-[0.875rem] font-semibold flex items-center gap-2.5"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait" custom={stepDir}>

          {/* ── STEP 0: AI Parser ─────────────────────────── */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-10">
                <div
                  className="w-16 h-16 mx-auto mb-5 bg-[var(--color-base-900)] rounded-[20px] flex items-center justify-center"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
                >
                  <Sparkles className="w-8 h-8 text-white" aria-hidden="true" />
                </div>
                <h1 className="font-display font-bold text-[1.625rem] text-[var(--color-base-900)] tracking-tight mb-2.5">
                  Describe Your Emergency
                </h1>
                <p className="text-[0.9375rem] text-[var(--color-base-500)] max-w-sm mx-auto leading-relaxed">
                  Type what you need in plain language. Our AI will fill the
                  request for you.
                </p>
              </div>

              <div className="space-y-4">
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder='e.g. "Need O- blood urgently at Apollo Hospital for ICU patient, 2 units"'
                  rows={4}
                  className="w-full bg-white border-[1.5px] border-[var(--color-base-200)] rounded-[var(--radius-card)] shadow-[var(--shadow-clay)] p-4 text-[1rem] text-[var(--color-base-900)] placeholder:text-[var(--color-base-400)] focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/10 transition-all resize-none outline-none leading-relaxed"
                  autoFocus
                  aria-label="Describe your emergency"
                />

                <button
                  onClick={handleAiParse}
                  disabled={aiParsing || aiInput.trim().length < 5}
                  className="w-full h-[52px] bg-[var(--color-base-900)] text-white font-bold text-[1rem] rounded-[var(--radius-button)] hover:bg-[#2a2a2a] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
                >
                  {aiParsing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      Parsing your request…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                      Parse with AI
                    </>
                  )}
                </button>

                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--color-base-200)]" />
                  </div>
                  <span className="relative bg-[var(--color-base-50)] px-4 text-[0.75rem] font-bold text-[var(--color-base-400)] uppercase tracking-widest">
                    or
                  </span>
                </div>

                <button
                  onClick={() => goTo(1)}
                  className="w-full h-[52px] bg-transparent border-[1.5px] border-[var(--color-base-200)] text-[var(--color-base-700)] font-bold text-[0.9375rem] rounded-[var(--radius-button)] hover:border-[var(--color-base-400)] transition-all flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-4 h-4" aria-hidden="true" />
                  Fill manually
                </button>
              </div>

              {aiFilledFields.size > 0 && (
                <div className="mt-6 p-4 bg-[var(--color-base-100)] border border-[var(--color-base-200)] rounded-[var(--radius-card)] text-[0.875rem] text-[var(--color-base-500)] font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-base-900)]" aria-hidden="true" />
                  {aiFilledFields.size} field{aiFilledFields.size > 1 ? "s" : ""} pre-filled. Review them in the next steps.
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 1: Blood Group ───────────────────────── */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-base-400)] font-bold mb-2">
                  Step 1 of 5
                </p>
                <h2 className="font-display font-bold text-[1.5rem] text-[var(--color-base-900)] tracking-tight">
                  Which blood group is needed?
                </h2>
                {aiFilledFields.has("blood_group") && (
                  <p className="text-[0.8125rem] text-[var(--color-base-500)] mt-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[var(--color-base-400)]" aria-hidden="true" />
                    Pre-filled by AI — review your selection.
                  </p>
                )}
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                {BLOOD_GROUPS.map((group) => (
                  <motion.div key={group} variants={slideUpFade}>
                    <BloodGroupCard
                      group={group}
                      isSelected={formData.blood_group === group}
                      onClick={() => setFormData((p) => ({ ...p, blood_group: group }))}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {formData.blood_group && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 flex items-center gap-2.5 text-[0.875rem] font-semibold text-[var(--color-base-500)]"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--color-blood)] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <span>
                    <span className="font-mono font-bold text-[var(--color-base-900)]">{formData.blood_group}</span>
                    {" "}selected
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STEP 2: Hospital Search ───────────────────── */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-6">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-base-400)] font-bold mb-2">
                  Step 2 of 5
                </p>
                <h2 className="font-display font-bold text-[1.5rem] text-[var(--color-base-900)] tracking-tight">
                  Where is the patient?
                </h2>
                <p className="text-[0.9375rem] text-[var(--color-base-500)] mt-1.5 leading-relaxed">
                  Select the hospital to help us find nearby donors.
                </p>
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-base-400)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={hospitalQuery}
                  onChange={(e) => setHospitalQuery(e.target.value)}
                  placeholder="Search by hospital name or city…"
                  className="w-full h-[52px] pl-10 pr-4 bg-white border-[1.5px] border-[var(--color-base-200)] rounded-[var(--radius-input)] shadow-[var(--shadow-clay)] text-[1rem] text-[var(--color-base-900)] placeholder:text-[var(--color-base-400)] focus:border-[var(--color-blood)] focus:ring-[3px] focus:ring-[rgba(214,58,58,0.1)] transition-all outline-none"
                  aria-label="Search hospitals"
                />
              </div>

              {/* Results list */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                {filteredHospitals.length === 0 ? (
                  <div className="py-12 text-center text-[var(--color-base-400)] text-[0.9375rem] font-medium">
                    No hospitals found for "{hospitalQuery}"
                  </div>
                ) : (
                  filteredHospitals.map((h) => (
                    <HospitalResultCard
                      key={h.id}
                      hospital={h}
                      isSelected={selectedHospitalId === h.id}
                      onClick={() => selectHospital(h)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Urgency ───────────────────────────── */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-base-400)] font-bold mb-2">
                  Step 3 of 5
                </p>
                <h2 className="font-display font-bold text-[1.5rem] text-[var(--color-base-900)] tracking-tight">
                  How urgent is this?
                </h2>
                <p className="text-[0.9375rem] text-[var(--color-base-500)] mt-1.5 leading-relaxed">
                  This helps us prioritize and notify the right donors.
                </p>
              </div>

              <div className="space-y-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <UrgencyCard
                    key={opt.id}
                    {...opt}
                    isSelected={formData.urgency_level === opt.id}
                    onClick={() => setFormData((p) => ({ ...p, urgency_level: opt.id }))}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Patient Details ───────────────────── */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-base-400)] font-bold mb-2">
                  Step 4 of 5
                </p>
                <h2 className="font-display font-bold text-[1.5rem] text-[var(--color-base-900)] tracking-tight">
                  Patient details
                </h2>
                <p className="text-[0.9375rem] text-[var(--color-base-500)] mt-1.5 leading-relaxed">
                  Donors will use this information to coordinate with you.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="patient-name"
                    className="block text-[0.875rem] font-bold text-[var(--color-base-900)] mb-2"
                  >
                    Patient name
                    {aiFilledFields.has("patient_name") && (
                      <span className="ml-2 text-[0.625rem] font-mono text-[var(--color-base-400)] bg-[var(--color-base-100)] px-1.5 py-0.5 rounded uppercase">
                        AI filled
                      </span>
                    )}
                  </label>
                  <Input
                    id="patient-name"
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={formData.patient_name}
                    onChange={(e) => setFormData((p) => ({ ...p, patient_name: e.target.value }))}
                    className="h-[56px] bg-white border-[1.5px] border-[var(--color-base-200)] rounded-[var(--radius-input)] shadow-[var(--shadow-clay)] px-4 focus:border-[var(--color-blood)] focus:ring-[3px] focus:ring-[rgba(214,58,58,0.1)] transition-all text-[1rem]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-[0.875rem] font-bold text-[var(--color-base-900)] mb-2"
                  >
                    Contact phone
                  </label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="10-digit number"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData((p) => ({ ...p, contact_phone: e.target.value }))}
                    className="h-[56px] bg-white border-[1.5px] border-[var(--color-base-200)] rounded-[var(--radius-input)] shadow-[var(--shadow-clay)] px-4 focus:border-[var(--color-blood)] focus:ring-[3px] focus:ring-[rgba(214,58,58,0.1)] transition-all text-[1rem]"
                  />
                </div>

                <div>
                  <label className="block text-[0.875rem] font-bold text-[var(--color-base-900)] mb-2">
                    Units required
                    {aiFilledFields.has("units") && (
                      <span className="ml-2 text-[0.625rem] font-mono text-[var(--color-base-400)] bg-[var(--color-base-100)] px-1.5 py-0.5 rounded uppercase">
                        AI filled
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-4 bg-white border-[1.5px] border-[var(--color-base-200)] rounded-[var(--radius-input)] shadow-[var(--shadow-clay)] p-2 w-fit">
                    <button
                      onClick={() => setFormData((p) => ({ ...p, units: Math.max(1, p.units - 1) }))}
                      className="w-11 h-11 rounded-[10px] bg-[var(--color-base-100)] hover:bg-[var(--color-base-200)] flex items-center justify-center font-bold text-xl text-[var(--color-base-900)] transition-colors"
                      aria-label="Decrease units"
                    >
                      −
                    </button>
                    <span className="font-mono font-bold text-[1.625rem] w-12 text-center text-[var(--color-base-900)]">
                      {formData.units}
                    </span>
                    <button
                      onClick={() => setFormData((p) => ({ ...p, units: Math.min(10, p.units + 1) }))}
                      className="w-11 h-11 rounded-[10px] bg-[var(--color-base-100)] hover:bg-[var(--color-base-200)] flex items-center justify-center font-bold text-xl text-[var(--color-base-900)] transition-colors"
                      aria-label="Increase units"
                    >
                      +
                    </button>
                  </div>
                  {formData.units > 6 && (
                    <p className="text-[var(--color-warn)] text-[0.8125rem] font-semibold mt-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      High unit requests may take longer to fulfill.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: Review ────────────────────────────── */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-base-400)] font-bold mb-2">
                  Step 5 of 5
                </p>
                <h2 className="font-display font-bold text-[1.5rem] text-[var(--color-base-900)] tracking-tight">
                  Review your request
                </h2>
                <p className="text-[0.9375rem] text-[var(--color-base-500)] mt-1.5 leading-relaxed">
                  Everything looks right? Tap below to alert nearby donors.
                </p>
              </div>

              <ReviewCard
                bloodGroup={formData.blood_group}
                units={formData.units}
                hospitalName={formData.hospital_name}
                urgencyLevel={formData.urgency_level as any}
                patientName={formData.patient_name}
                contactPhone={formData.contact_phone}
                location={formData.city}
                className="mb-6"
              />

              <div className="flex items-start gap-3 p-4 bg-[var(--color-safe-light)] border border-[rgba(16,185,129,0.2)] rounded-[var(--radius-card)]">
                <div className="w-6 h-6 rounded-full bg-[var(--color-safe)] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                </div>
                <p className="text-[0.875rem] font-semibold text-[var(--color-safe)] leading-snug">
                  Nearby donors will be alerted immediately after you submit.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP 6: OTP (unauthenticated only) ──────── */}
          {currentStep === 6 && !user && (
            <motion.div
              key="step-6"
              custom={stepDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-center pt-8"
            >
              <div className="w-16 h-16 bg-white shadow-[var(--shadow-clay)] border border-[var(--color-base-200)] text-[var(--color-base-900)] rounded-[18px] flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="font-display font-bold text-[1.5rem] text-[var(--color-base-900)] mb-2 tracking-tight">
                Verify your phone
              </h2>
              <p className="text-[0.9375rem] text-[var(--color-base-500)] mb-8 leading-relaxed max-w-sm mx-auto">
                We sent a 6-digit code to{" "}
                <strong className="text-[var(--color-base-900)] font-bold">
                  {formData.contact_phone}
                </strong>
                .
                {isMockMode && (
                  <span className="block mt-3 text-[var(--color-warn)] text-[0.8125rem] bg-[var(--color-warn-light)] p-2.5 rounded-[10px]">
                    SMS unavailable — enter any 6 digits to continue.
                  </span>
                )}
              </p>

              <div className="max-w-[240px] mx-auto">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className="text-center text-[2rem] font-mono tracking-[0.5em] h-[68px] bg-white border-[1.5px] border-[var(--color-base-200)] rounded-[var(--radius-input)] shadow-[var(--shadow-clay)]"
                  autoFocus
                  aria-label="One-time password"
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Sticky footer ────────────────────────────────────── */}
      <footer className="w-full sticky bottom-0 z-50 bg-[rgba(252,252,251,0.90)] backdrop-blur-[14px] border-t border-[var(--color-base-200)]">
        <div className="w-full max-w-[720px] mx-auto px-6 py-4">

          {/* Steps 1–4: Next button */}
          {currentStep >= 1 && currentStep <= 4 && (
            <button
              onClick={handleNext}
              disabled={isNextDisabled()}
              className="w-full h-[56px] bg-[var(--color-base-900)] text-white font-bold text-[1rem] rounded-[var(--radius-button)] shadow-[var(--shadow-clay-hard)] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Step 5: Submit */}
          {currentStep === 5 && (
            <button
              onClick={handleSubmitClick}
              disabled={loading}
              className="w-full h-[56px] bg-[var(--color-blood)] text-white font-bold text-[1rem] rounded-[var(--radius-button)] shadow-[var(--shadow-clay-hard)] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : null}
              Send Emergency Request
            </button>
          )}

          {/* Step 6: Verify & Submit */}
          {currentStep === 6 && !user && (
            <button
              onClick={handleVerifyAndSubmit}
              disabled={loading || otpCode.length < 6}
              className="w-full h-[56px] bg-[var(--color-blood)] text-white font-bold text-[1rem] rounded-[var(--radius-button)] shadow-[var(--shadow-clay-hard)] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : null}
              Verify &amp; Submit Request
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
