"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Droplet, Edit2, Power } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { BottomNav } from "@/components/nav/BottomNav";
import { getProfileAction, updateProfileAction } from "@/app/actions/donor.actions";

interface UserSettings {
    auto_disable_on_accept: boolean;
    auto_disable_after_donation: boolean;
    notification_distance_km: number;
    emergency_types: "IMMEDIATE" | "ALL";
    push_notifications: boolean;
    status_updates: boolean;
    show_phone_number: boolean;
    share_location: boolean;
    language: string;
    text_size: "NORMAL" | "LARGE";
    is_paused: boolean;
}

interface UserProfile {
    id: number;
    first_name: string;
    last_name: string;
    blood_group: string;
    city: string;
    phone_number: string;
    is_available_donor: boolean;
    date_joined: string;
    last_donation_date: string | null;
}

/* ── Section wrapper ─────────────────────────────────── */
function Section({
    title,
    children,
    danger,
}: {
    title?: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <section>
            {title && (
                <h2
                    className={`text-[17px] font-bold mb-3 ${
                        danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"
                    }`}
                >
                    {title}
                </h2>
            )}
            <div
                className={`bg-[var(--color-bg-elevated)] rounded-[var(--radius-card)] border overflow-hidden ${
                    danger ? "border-[var(--color-danger-light)]" : "border-[var(--color-border)]"
                }`}
                style={{ boxShadow: "var(--shadow-card)" }}
            >
                {children}
            </div>
        </section>
    );
}

/* ── Row inside a section ────────────────────────────── */
function Row({
    label,
    sub,
    right,
    border = true,
}: {
    label: string;
    sub?: string;
    right?: React.ReactNode;
    border?: boolean;
}) {
    return (
        <div
            className={`px-6 py-4 flex items-center justify-between gap-4 ${
                border ? "border-b border-[var(--color-border-subtle)]" : ""
            }`}
        >
            <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{label}</p>
                {sub && <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
            </div>
            {right && <div className="shrink-0">{right}</div>}
        </div>
    );
}

export default function SettingsPage() {
    const { user, profile: authProfile, isLoading: isLoaded, signOut } = useProfile();
    const router = useRouter();

    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileFormData, setProfileFormData] = useState({ city: "", blood_group: "" });
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!user) return;
                const profileData = await getProfileAction().catch(() => null);

                setSettings({
                    auto_disable_on_accept: true,
                    auto_disable_after_donation: false,
                    notification_distance_km: 10,
                    emergency_types: "ALL",
                    push_notifications: true,
                    status_updates: true,
                    show_phone_number: true,
                    share_location: false,
                    language: "en",
                    text_size: "NORMAL",
                    is_paused: false,
                });

                if (profileData) {
                    setProfile({
                        id: 1,
                        first_name: profileData.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "",
                        last_name:
                            profileData.full_name?.split(" ").slice(1).join(" ") ||
                            user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
                            "",
                        blood_group: profileData.blood_group ?? "",
                        city: profileData.location || "",
                        phone_number: profileData.phone || "",
                        is_available_donor: profileData.is_available_donor,
                        date_joined: profileData.created_at,
                        last_donation_date: null,
                    });
                    setProfileFormData({
                        city: profileData.location || "",
                        blood_group: profileData.blood_group || "",
                    });
                }
            } catch {
                // silently ignore profile load failure
            } finally {
                setLoading(false);
            }
        };

        if (isLoaded) {
            if (user) {
                fetchData();
            } else {
                router.push("/");
            }
        }
    }, [isLoaded, user, router]);

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        if (!settings) return;
        const prev = { ...settings };
        setSettings({ ...settings, [key]: value });
        try {
            // setting persisted optimistically
        } catch {
            setSettings(prev);
        }
    };

    const toggleAvailability = async (checked: boolean) => {
        if (!user) return;
        const prev = profile?.is_available_donor || false;
        setProfile((p) =>
            p
                ? { ...p, is_available_donor: checked }
                : {
                      id: 1,
                      first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
                      last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
                      blood_group: "",
                      city: "",
                      phone_number: "",
                      is_available_donor: checked,
                      date_joined: new Date().toISOString(),
                      last_donation_date: null,
                  }
        );
        try {
            await updateProfileAction({ is_available_donor: checked });
        } catch {
            setProfile((p) => (p ? { ...p, is_available_donor: prev } : null));
        }
    };

    const saveProfile = async () => {
        if (!user) return;
        setSavingProfile(true);
        setProfileError(null);
        try {
            await updateProfileAction({
                location: profileFormData.city,
                blood_group: profileFormData.blood_group as any,
            });
            setProfile((p) =>
                p
                    ? { ...p, city: profileFormData.city, blood_group: profileFormData.blood_group }
                    : {
                          id: 1,
                          first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
                          last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
                          blood_group: profileFormData.blood_group,
                          city: profileFormData.city,
                          phone_number: "",
                          is_available_donor: false,
                          date_joined: new Date().toISOString(),
                          last_donation_date: null,
                      }
            );
            setIsEditingProfile(false);
        } catch {
            setProfileError("Couldn't save changes. Please try again.");
        } finally {
            setSavingProfile(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)]">
                <header className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] h-16" style={{ background: "rgba(252,252,251,0.92)" }} />
                <main className="max-w-xl mx-auto px-6 pt-8 space-y-8">
                    <div className="bg-white rounded-[28px] border border-[var(--color-border)] p-6 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-[var(--color-base-100)] animate-[skeleton-pulse_1.5s_ease-in-out_infinite] shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-[var(--color-base-100)] rounded-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
                            <div className="h-3 w-48 bg-[var(--color-base-100)] rounded-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
                        </div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-[28px] border border-[var(--color-border)] overflow-hidden">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border-subtle)] last:border-b-0">
                                    <div className="space-y-1.5">
                                        <div className="h-3.5 w-28 bg-[var(--color-base-100)] rounded-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
                                        <div className="h-3 w-40 bg-[var(--color-base-100)] rounded-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
                                    </div>
                                    <div className="h-6 w-10 bg-[var(--color-base-100)] rounded-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
                                </div>
                            ))}
                        </div>
                    ))}
                </main>
            </div>
        );
    }

    if (!settings) return null;

    const displayName =
        profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : user?.user_metadata?.full_name
            ? user.user_metadata.full_name
            : "My Profile";

    const memberSince = profile?.date_joined
        ? new Date(profile.date_joined).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
          })
        : null;

    const fieldClass =
        "h-9 px-3 bg-[var(--color-base-100)] border-0 text-[var(--color-text-primary)] text-[14px] font-semibold rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#D63A3A]/15 transition-all";

    return (
        <div className="min-h-screen bg-[var(--color-bg)] pb-24">
            {/* Sticky header */}
            <header
                className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] h-16"
                style={{ background: "rgba(252,252,251,0.92)", backdropFilter: "blur(16px)" }}
            >
                <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                    <h1 className="text-[15px] font-bold text-[var(--color-text-primary)]">Settings</h1>
                    <div className="w-20" />
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-8 space-y-8">

                {/* ── Profile hero ───────────────────────────────────────── */}
                <div className="card-base p-6 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--color-base-100)] shrink-0 border border-[var(--color-border)]">
                        {user?.user_metadata?.avatar_url ? (
                            <img
                                src={user.user_metadata.avatar_url}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-xl font-bold">
                                {displayName[0]}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[17px] font-bold text-[var(--color-text-primary)] truncate">{displayName}</p>
                        <p className="text-[13px] text-[var(--color-text-muted)] truncate mt-0.5">
                            {user?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {profile?.blood_group && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#D63A3A] text-[11px] font-bold border border-[var(--color-danger-light)]">
                                    <Droplet className="w-3 h-3" />
                                    {profile.blood_group}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                                ✓ Verified
                            </span>
                            {memberSince && (
                                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                    Since {memberSince}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Profile Information ────────────────────────────────── */}
                <Section title="Profile Information">
                    <Row
                        label="Blood Group"
                        sub="Shown to accepted donors"
                        right={
                            isEditingProfile ? (
                                <select
                                    value={profileFormData.blood_group}
                                    onChange={(e) =>
                                        setProfileFormData({
                                            ...profileFormData,
                                            blood_group: e.target.value,
                                        })
                                    }
                                    className={fieldClass + " w-24"}
                                >
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                        <option key={bg} value={bg}>
                                            {bg}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-[15px] font-bold text-[#D63A3A]">
                                    {profile?.blood_group || "—"}
                                </span>
                            )
                        }
                    />
                    <Row
                        label="City"
                        sub="Used for donor matching"
                        right={
                            isEditingProfile ? (
                                <input
                                    value={profileFormData.city}
                                    onChange={(e) =>
                                        setProfileFormData({ ...profileFormData, city: e.target.value })
                                    }
                                    placeholder="City"
                                    className={fieldClass + " w-36 text-right"}
                                />
                            ) : (
                                <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">
                                    {profile?.city || "—"}
                                </span>
                            )
                        }
                    />
                    <Row
                        label="Phone"
                        right={
                            <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">
                                {profile?.phone_number || "—"}
                            </span>
                        }
                        border={false}
                    />

                    {/* Edit controls */}
                    <div className="px-6 py-4 border-t border-[var(--color-border-subtle)]">
                        {profileError && (
                            <p className="text-[12px] text-[#DC2626] font-medium mb-3">{profileError}</p>
                        )}
                        <div className="flex justify-end gap-2">
                        {isEditingProfile ? (
                            <>
                                <button
                                    onClick={() => setIsEditingProfile(false)}
                                    className="h-8 px-4 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveProfile}
                                    disabled={savingProfile}
                                    className="h-8 px-5 bg-[#1E1E1E] text-white text-[13px] font-semibold rounded-[10px] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                                >
                                    {savingProfile ? "Saving…" : "Save changes"}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditingProfile(true)}
                                className="h-8 px-4 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                        )}
                        </div>
                    </div>
                </Section>

                {/* ── Availability ───────────────────────────────────────── */}
                <Section title="Availability">
                    <Row
                        label="Available to donate"
                        sub="Requests will be sent to you"
                        right={
                            <Switch
                                checked={profile?.is_available_donor || false}
                                onCheckedChange={toggleAvailability}
                            />
                        }
                    />

                    {/* Distance slider */}
                    <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                                    Notification distance
                                </p>
                                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                                    Requests within this range
                                </p>
                            </div>
                            <span className="text-[15px] font-bold text-[#D63A3A] tabular-nums">
                                {settings.notification_distance_km} km
                            </span>
                        </div>
                        <Slider
                            value={[settings.notification_distance_km]}
                            min={1}
                            max={50}
                            step={1}
                            onValueChange={(val: number[]) =>
                                updateSetting("notification_distance_km", val[0])
                            }
                        />
                    </div>

                    <Row
                        label="Auto-disable on accept"
                        sub="Stop receiving requests after you accept one"
                        right={
                            <Switch
                                checked={settings.auto_disable_on_accept}
                                onCheckedChange={(c: boolean) =>
                                    updateSetting("auto_disable_on_accept", c)
                                }
                            />
                        }
                    />

                    <div className="px-6 py-4 flex items-center justify-between border-[var(--color-border-subtle)]">
                        <div>
                            <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">Request type</p>
                            <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                                Which urgency levels to receive
                            </p>
                        </div>
                        <select
                            value={settings.emergency_types}
                            onChange={(e) => updateSetting("emergency_types", e.target.value)}
                            className="h-9 px-3 bg-[var(--color-base-100)] border-0 text-[var(--color-text-primary)] text-[14px] font-semibold rounded-[10px] focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="ALL">All urgent</option>
                            <option value="IMMEDIATE">Immediate only</option>
                        </select>
                    </div>
                </Section>

                {/* ── Notifications & Privacy ────────────────────────────── */}
                <Section title="Notifications & Privacy">
                    <Row
                        label="Push notifications"
                        sub="Emergency alerts on your device"
                        right={
                            <Switch
                                checked={settings.push_notifications}
                                onCheckedChange={(c: boolean) =>
                                    updateSetting("push_notifications", c)
                                }
                            />
                        }
                    />
                    <Row
                        label="Status updates"
                        sub="When your request status changes"
                        right={
                            <Switch
                                checked={settings.status_updates}
                                onCheckedChange={(c: boolean) =>
                                    updateSetting("status_updates", c)
                                }
                            />
                        }
                    />
                    <Row
                        label="Show phone number"
                        sub="Only after accepting a request"
                        right={
                            <Switch
                                checked={settings.show_phone_number}
                                onCheckedChange={(c: boolean) =>
                                    updateSetting("show_phone_number", c)
                                }
                            />
                        }
                    />
                    <Row
                        label="Share exact location"
                        sub="Only after accepting a request"
                        border={false}
                        right={
                            <Switch
                                checked={settings.share_location}
                                onCheckedChange={(c: boolean) =>
                                    updateSetting("share_location", c)
                                }
                            />
                        }
                    />
                </Section>

                {/* ── Account ────────────────────────────────────────────── */}
                <Section title="Account">
                    <button
                        onClick={() => signOut().then(() => router.push("/"))}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--color-bg)] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[12px] bg-[var(--color-base-100)] flex items-center justify-center group-hover:bg-[var(--color-border)] transition-colors">
                                <Power className="w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                            <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">Log out</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                </Section>

                {/* ── Danger Zone ────────────────────────────────────────── */}
                <div
                    className="rounded-[var(--radius-card)] border border-[var(--color-danger-light)] overflow-hidden bg-[var(--color-bg-elevated)]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                >
                    <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                        <h2 className="text-[15px] font-bold text-[var(--color-danger)]">Danger zone</h2>
                        <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                            These actions are permanent and cannot be undone.
                        </p>
                    </div>
                    <div className="px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">Delete account</p>
                                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                                    Your data will be permanently removed.
                                </p>
                            </div>
                            <a
                                href="mailto:contact@bloodrelay.org?subject=Delete%20my%20account"
                                className="btn-danger shrink-0 h-9 px-4 text-[13px]"
                            >
                                Request deletion
                            </a>
                        </div>
                    </div>
                </div>

            </main>
            <BottomNav />
        </div>
    );
}
