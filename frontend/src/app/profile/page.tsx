"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Droplet, MapPin, Shield, ArrowLeft, Heart, CheckCircle2,
    Calendar, Edit2, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "@/components/nav/BottomNav";
import { Switch } from "@/components/ui/Switch";
import { slideUpFade, staggerContainer, defaultTransition } from "@/lib/motion";

interface UserProfile {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    blood_group: string;
    location: string;
    is_available_donor: boolean;
    created_at: string;
    last_donation_date: string | null;
    donation_count?: number;
}

/* ── Skeleton ─────────────────────────────────────────────── */
function ProfileSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)]">
            <header
                className="sticky top-0 z-50 h-16 border-b border-[var(--color-border-subtle)]"
                style={{ background: "rgba(252,252,251,0.92)" }}
            />
            <main className="max-w-[640px] mx-auto px-6 py-10 space-y-4">
                {/* Hero card skeleton */}
                <div className="card-base flex items-center gap-5">
                    <div className="skeleton w-16 h-16 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="skeleton h-5 w-40 rounded-full" />
                        <div className="skeleton h-3.5 w-28 rounded-full" />
                        <div className="skeleton h-3 w-20 rounded-full" />
                    </div>
                </div>
                {/* Stat cards skeleton */}
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card-base p-5 flex flex-col gap-2">
                            <div className="skeleton h-3 w-16 rounded-full" />
                            <div className="skeleton h-7 w-10 rounded-full" />
                        </div>
                    ))}
                </div>
                {/* Info card skeleton */}
                <div className="card-base space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-b-0">
                            <div className="skeleton h-3.5 w-24 rounded-full" />
                            <div className="skeleton h-3.5 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({
    label,
    value,
    icon: Icon,
    accent = false,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    accent?: boolean;
}) {
    return (
        <div className="card-base p-5 flex flex-col gap-3">
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                    background: accent
                        ? "rgba(214,58,58,0.08)"
                        : "var(--color-base-100)",
                }}
            >
                <Icon
                    className="w-4 h-4"
                    style={{ color: accent ? "var(--color-cta)" : "var(--color-text-muted)" }}
                />
            </div>
            <div>
                <p
                    className="font-metric font-bold text-[var(--color-text-primary)] leading-none"
                    style={{ fontSize: "1.5rem", letterSpacing: "-0.03em" }}
                >
                    {value}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1 leading-tight">{label}</p>
            </div>
        </div>
    );
}

/* ── Info row ─────────────────────────────────────────────── */
function InfoRow({
    label,
    value,
    last = false,
}: {
    label: string;
    value: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between py-3.5 ${
                !last ? "border-b border-[var(--color-border-subtle)]" : ""
            }`}
        >
            <span className="text-[13px] text-[var(--color-text-muted)] font-medium">{label}</span>
            <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">{value || "—"}</span>
        </div>
    );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function ProfilePage() {
    const { user, profile: authProfile, isLoading: authLoading, updateProfile } = useProfile();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ blood_group: "", location: "" });
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }

        if (!authProfile) return;
        const p = { ...authProfile, location: authProfile.city ?? "" };
        setProfile(p as unknown as UserProfile);
        if (!isEditing) setFormData({ blood_group: p.blood_group || "", location: p.location || "" });
        setLoading(false);
    }, [authLoading, user, authProfile, isEditing, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;
        setSaving(true);
        setError(null);
        try {
            await updateProfile({ blood_group: formData.blood_group as any, city: formData.location });
            setProfile((p) => ({ ...p!, ...formData }));
            setSuccessMsg("Profile updated.");
            setIsEditing(false);
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            setError(err.message || "Couldn't save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = async () => {
        if (!user?.id || !profile) return;
        const next = !profile.is_available_donor;
        setProfile((p) => p ? { ...p, is_available_donor: next } : p);
        try {
            await updateProfile({ is_available_donor: next });
        } catch {
            setProfile((p) => p ? { ...p, is_available_donor: !next } : p);
        }
    };

    if (authLoading || loading) return <ProfileSkeleton />;
    if (!profile) return null;

    const displayName = profile.full_name ||
        user?.user_metadata?.full_name || user?.email ||
        "Your Profile";
    const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        : null;

    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)] pb-24 md:pb-10">

            {/* ── Nav ───────────────────────────────────────── */}
            <header
                className="sticky top-0 z-50 h-16 border-b border-[var(--color-border-subtle)] flex justify-center"
                style={{ background: "rgba(252,252,251,0.92)", backdropFilter: "blur(16px)" }}
            >
                <nav className="w-full max-w-[640px] px-6 h-full flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Dashboard
                    </Link>
                    <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">Profile</span>
                    <div className="w-20" />
                </nav>
            </header>

            <main className="max-w-[640px] mx-auto px-6 py-8">
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                >

                    {/* ── Hero identity card ──────────────────── */}
                    <motion.div variants={slideUpFade} className="card-base">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-[var(--color-border)]">
                                {user?.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt={`${displayName}'s profile`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center font-bold text-[var(--color-text-muted)]"
                                        style={{ background: "var(--color-base-100)", fontSize: "1.25rem" }}
                                        aria-hidden="true"
                                    >
                                        {initials}
                                    </div>
                                )}
                            </div>

                            {/* Identity */}
                            <div className="flex-1 min-w-0">
                                <h1 className="text-[18px] font-bold text-[var(--color-text-primary)] truncate">
                                    {displayName}
                                </h1>
                                <p className="text-[13px] text-[var(--color-text-muted)] truncate mt-0.5">
                                    {user?.email}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {profile.blood_group && (
                                        <span
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                                            style={{
                                                background: "rgba(214,58,58,0.06)",
                                                borderColor: "rgba(214,58,58,0.2)",
                                                color: "var(--color-cta)",
                                            }}
                                        >
                                            <Droplet className="w-3 h-3" aria-hidden="true" />
                                            {profile.blood_group}
                                        </span>
                                    )}
                                    <span
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                                        style={{
                                            background: "var(--color-success-light)",
                                            borderColor: "rgba(16,185,129,0.2)",
                                            color: "#065F46",
                                        }}
                                    >
                                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                        Verified
                                    </span>
                                    {memberSince && (
                                        <span className="text-[11px] text-[var(--color-text-muted)]">
                                            Since {memberSince}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Impact stats ────────────────────────── */}
                    <motion.div
                        variants={slideUpFade}
                        className="grid grid-cols-3 gap-3"
                        aria-label="Your impact stats"
                    >
                        <StatCard
                            label="Lives Supported"
                            value={profile.donation_count ?? 0}
                            icon={Heart}
                            accent
                        />
                        <StatCard
                            label="Days Active"
                            value={
                                profile.created_at
                                    ? Math.floor(
                                          (Date.now() - new Date(profile.created_at).getTime()) /
                                              (1000 * 60 * 60 * 24)
                                      )
                                    : 0
                            }
                            icon={Calendar}
                        />
                        <StatCard
                            label="Last Donation"
                            value={
                                profile.last_donation_date
                                    ? new Date(profile.last_donation_date).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                      })
                                    : "—"
                            }
                            icon={CheckCircle2}
                        />
                    </motion.div>

                    {/* ── Availability card ────────────────────── */}
                    <motion.div variants={slideUpFade} className="card-base">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                                    Available to donate
                                </p>
                                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                                    {profile.is_available_donor
                                        ? "You're receiving nearby requests"
                                        : "You're paused — no requests sent"}
                                </p>
                            </div>
                            <Switch
                                checked={profile.is_available_donor}
                                onCheckedChange={toggleAvailability}
                                aria-label="Toggle donor availability"
                            />
                        </div>
                    </motion.div>

                    {/* ── Blood + location info card ──────────── */}
                    <motion.div variants={slideUpFade} className="card-base">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                                Your Details
                            </h2>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setIsEditing(false); setError(null); }}
                                        className="flex items-center gap-1 h-8 px-3 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                        aria-label="Cancel editing"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1 h-8 px-3 text-[12px] font-semibold text-white rounded-[var(--radius-input)] transition-colors disabled:opacity-50"
                                        style={{ background: "var(--color-text-primary)" }}
                                        aria-label="Save changes"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {saving ? "Saving…" : "Save"}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1 h-8 px-3 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                    aria-label="Edit profile"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            )}
                        </div>

                        {/* Error/success feedback */}
                        {error && (
                            <p
                                className="text-[12px] font-medium mb-3 px-3 py-2 rounded-xl"
                                style={{
                                    background: "var(--color-danger-light)",
                                    color: "var(--color-danger)",
                                }}
                                role="alert"
                            >
                                {error}
                            </p>
                        )}
                        {successMsg && (
                            <p
                                className="text-[12px] font-medium mb-3 px-3 py-2 rounded-xl"
                                style={{
                                    background: "var(--color-success-light)",
                                    color: "#065F46",
                                }}
                                role="status"
                            >
                                {successMsg}
                            </p>
                        )}

                        {/* Fields */}
                        {isEditing ? (
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="blood_group"
                                        className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide"
                                    >
                                        Blood Group
                                    </label>
                                    <select
                                        id="blood_group"
                                        value={formData.blood_group}
                                        onChange={(e) =>
                                            setFormData((f) => ({ ...f, blood_group: e.target.value }))
                                        }
                                        className="mt-1.5 w-full h-11 px-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[14px] font-semibold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 transition"
                                    >
                                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="location"
                                        className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide"
                                    >
                                        City
                                    </label>
                                    <input
                                        id="location"
                                        value={formData.location}
                                        onChange={(e) =>
                                            setFormData((f) => ({ ...f, location: e.target.value }))
                                        }
                                        placeholder="Your city"
                                        className="mt-1.5 w-full h-11 px-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[14px] font-semibold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 transition"
                                    />
                                </div>
                            </form>
                        ) : (
                            <>
                                <InfoRow label="Blood Group" value={
                                    profile.blood_group ? (
                                        <span className="font-metric font-bold text-[var(--color-cta)]">
                                            {profile.blood_group}
                                        </span>
                                    ) : "Not set"
                                } />
                                <InfoRow
                                    label="City"
                                    value={
                                        profile.location ? (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                                                {profile.location}
                                            </span>
                                        ) : "Not set"
                                    }
                                />
                                <InfoRow label="Phone" value={profile.phone || "Not set"} />
                                <InfoRow
                                    label="Privacy"
                                    last
                                    value={
                                        <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                                            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                                            Shared after acceptance
                                        </span>
                                    }
                                />
                            </>
                        )}
                    </motion.div>

                    {/* ── Donation history placeholder ─────────── */}
                    <motion.div variants={slideUpFade} className="card-base">
                        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
                            Donation History
                        </h2>
                        {profile.last_donation_date ? (
                            <div
                                className="flex items-center gap-4 p-4 rounded-[var(--radius-input)]"
                                style={{ background: "var(--color-success-light)" }}
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                    style={{ background: "rgba(16,185,129,0.15)" }}
                                >
                                    <Heart className="w-5 h-5 text-[var(--color-success)]" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-semibold" style={{ color: "#065F46" }}>
                                        Last donation
                                    </p>
                                    <p className="text-[13px]" style={{ color: "#065F46", opacity: 0.8 }}>
                                        {new Date(profile.last_donation_date).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="text-center py-8 rounded-[var(--radius-input)]"
                                style={{ background: "var(--color-base-100)" }}
                            >
                                <Heart
                                    className="w-8 h-8 mx-auto mb-3"
                                    style={{ color: "var(--color-text-muted)" }}
                                    aria-hidden="true"
                                />
                                <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                                    Your first donation is ahead
                                </p>
                                <p className="text-[13px] text-[var(--color-text-muted)] mt-1 max-w-[220px] mx-auto leading-relaxed">
                                    Accept a request from the dashboard to begin your story.
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* ── Settings shortcut ───────────────────── */}
                    <motion.div variants={slideUpFade}>
                        <Link
                            href="/settings"
                            className="card-interactive flex items-center justify-between p-5 group block"
                        >
                            <div>
                                <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                                    Notifications & Privacy
                                </p>
                                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                                    Adjust distance, alerts, and data preferences
                                </p>
                            </div>
                            <span
                                className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors"
                                aria-hidden="true"
                            >
                                →
                            </span>
                        </Link>
                    </motion.div>

                </motion.div>
            </main>

            <BottomNav />
        </div>
    );
}
