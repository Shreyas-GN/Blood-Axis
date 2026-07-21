"use client";

import { useProfile } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
// AuthContext handles profile now
import { ActivityService } from '@/services/activity.service';
import { Droplet, MapPin, Phone, Heart, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { getCurrentPosition } from '@/lib/geolocation';
import { supabaseClient } from '@/lib/supabase/client';
import { saveOnboardingProfile } from './actions';

// --- Hallmark Stamp ---
/* Hallmark · macrostructure: Workbench (Centered Form)
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

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
};

export default function OnboardingPage() {
    const { user, profile: authProfile, isLoading: authLoading, refetch } = useProfile();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (authProfile?.profile_completed) {
            router.replace("/dashboard");
        }
    }, [authLoading, user, authProfile, router]);

    const [formData, setFormData] = useState({
        blood_group: '',
        phone: '',
        location: '',
        latitude: null as number | null,
        longitude: null as number | null,
        is_available_donor: true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[onboarding:page] ▶ handleSubmit fired', { userId: user?.id, formData });

        if (!user?.id) {
            console.warn('[onboarding:page] No user id — aborting');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            let lat = formData.latitude;
            let lng = formData.longitude;
            let locationPoint = null;

            if (!lat || !lng) {
                console.log('[onboarding:page] No coords in form — attempting GPS');
                try {
                    const pos = await getCurrentPosition();
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                    console.log('[onboarding:page] GPS resolved:', { lat, lng });
                } catch (gpsErr) {
                    console.warn('[onboarding:page] GPS failed (non-fatal):', gpsErr);
                }
            }
            if (lat && lng) locationPoint = `POINT(${lng} ${lat})`;
            console.log('[onboarding:page] locationPoint:', locationPoint);

            console.log('[onboarding:page] Calling saveOnboardingProfile...');
            await saveOnboardingProfile({
                full_name: user?.user_metadata?.full_name || user?.email || 'Anonymous User',
                blood_group: formData.blood_group,
                phone: formData.phone,
                city: formData.location,
                is_available_donor: formData.is_available_donor,
                latitude: lat ?? null,
                longitude: lng ?? null,
                location: locationPoint ?? null,
            });
            console.log('[onboarding:page] ✔ saveOnboardingProfile resolved');

            console.log('[onboarding:page] ✔ profile updated in DB');

            console.log('[onboarding:page] Calling refetch()...');
            await refetch();
            console.log('[onboarding:page] ✔ refetch() done');

            console.log('[onboarding:page] Navigating to /dashboard via window.location...');
            window.location.href = '/dashboard';
        } catch (err) {
            console.error('[onboarding:page] ✖ Error in handleSubmit:', err);
            setError("We couldn't save your profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || (authProfile?.profile_completed && !loading)) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center font-sans antialiased" style={{ ...customTokens, backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
                <div className="w-8 h-8 rounded-sm border-2 animate-spin" style={{ borderColor: "var(--color-rule)", borderTopColor: "var(--color-accent)" }} />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center font-sans antialiased selection:bg-red-500/30"
             style={{ ...customTokens, backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-input::placeholder { color: var(--color-muted); }
                .custom-input { outline: none !important; box-shadow: none !important; }
                .custom-input:focus { border-color: var(--color-accent) !important; }
            `}} />

            <main className="max-w-xl mx-auto w-full">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeInUp}
                    className="space-y-8"
                >
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center rounded-sm p-4 mb-2" style={{ backgroundColor: "var(--color-paper-2)", borderColor: "var(--color-rule)", borderWidth: "1px" }}>
                            <Droplet className="w-6 h-6" style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                            Network Operator Profile.
                        </h1>
                        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                            We need your blood group and operational sector to route local emergency alerts to you. This takes 30 seconds.
                        </p>
                    </div>

                    {/* Form card */}
                    <div className="rounded-sm border overflow-hidden" style={{ backgroundColor: "var(--color-paper-2)", borderColor: "var(--color-rule)" }}>
                        <div className="p-6 sm:p-8">
                            {error && (
                                <div className="mb-6 p-4 border rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-accent)", color: "var(--color-accent)" }}>
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-accent)" }} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Blood Group */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-ink-2)" }}>
                                        Blood Group <span style={{ color: "var(--color-accent)" }}>*</span>
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {bloodGroups.map((bg) => {
                                            const isSelected = formData.blood_group === bg;
                                            return (
                                                <button
                                                    key={bg}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, blood_group: bg })}
                                                    className="py-3 rounded-sm font-bold font-mono text-sm transition-colors border"
                                                    style={{
                                                        borderColor: isSelected ? "var(--color-accent)" : "var(--color-rule)",
                                                        backgroundColor: isSelected ? "var(--color-accent)" : "var(--color-paper-3)",
                                                        color: isSelected ? "var(--color-accent-ink)" : "var(--color-ink)",
                                                    }}
                                                >
                                                    {bg}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Contact & Location */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-ink-2)" }}>
                                            Mobile Number <span style={{ color: "var(--color-accent)" }}>*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted)" }} />
                                            <Input
                                                type="tel"
                                                required
                                                minLength={10}
                                                maxLength={10}
                                                pattern="[0-9]{10}"
                                                className="custom-input pl-10 h-12 w-full rounded-sm font-medium border transition-colors"
                                                style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                                                placeholder="10-digit number"
                                                value={formData.phone}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setFormData({ ...formData, phone: val });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-ink-2)" }}>
                                            Current City <span style={{ color: "var(--color-accent)" }}>*</span>
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: "var(--color-muted)" }} />
                                            <LocationAutocomplete
                                                placeholder="e.g. Bangalore"
                                                value={formData.location}
                                                onChange={(val) => setFormData({ ...formData, location: val })}
                                                className="custom-input pl-10 h-12 w-full rounded-sm font-medium border transition-colors"
                                                style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Availability toggle */}
                                <div
                                    className="p-5 rounded-sm border cursor-pointer transition-colors"
                                    style={{
                                        borderColor: formData.is_available_donor ? "var(--color-success)" : "var(--color-rule)",
                                        backgroundColor: formData.is_available_donor ? "rgba(34, 197, 94, 0.05)" : "transparent"
                                    }}
                                    onClick={() => setFormData({ ...formData, is_available_donor: !formData.is_available_donor })}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-sm flex items-center justify-center transition-colors shrink-0"
                                             style={{ 
                                                 backgroundColor: formData.is_available_donor ? "var(--color-success)" : "var(--color-paper-3)", 
                                                 color: formData.is_available_donor ? "#000" : "var(--color-muted)" 
                                             }}>
                                            <Heart className="w-5 h-5 fill-current" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-sm mb-0.5" style={{ color: formData.is_available_donor ? "var(--color-success)" : "var(--color-ink)" }}>
                                                Available for Deployment
                                            </h3>
                                            <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                                                Receive immediate alerts when an emergency triggers within your operational radius.
                                            </p>
                                        </div>
                                        <div className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-sm transition-colors"
                                             style={{ backgroundColor: formData.is_available_donor ? "var(--color-success)" : "var(--color-rule)" }}>
                                            <span className={`inline-flex items-center justify-center h-4 w-4 transform rounded-sm bg-white shadow transition-transform ${
                                                formData.is_available_donor ? 'translate-x-[22px]' : 'translate-x-1'
                                            }`}>
                                                {formData.is_available_donor && (
                                                    <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="pt-2 space-y-4">
                                    <button
                                        type="submit"
                                        disabled={loading || !formData.blood_group || !formData.phone || !formData.location}
                                        className="w-full h-12 rounded-sm text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="w-4 h-4 rounded-sm border-2 border-current border-t-transparent animate-spin" />
                                                Saving Parameters...
                                            </>
                                        ) : (
                                            <>
                                                Save and Enter Network
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-2 text-xs font-mono tracking-widest uppercase" style={{ color: "var(--color-muted)" }}>
                                        <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />
                                        Identity cloaked until acceptance
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
