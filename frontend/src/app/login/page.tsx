"use client";

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Droplet, ArrowRight, ShieldCheck, Mail, Lock, Phone, MapPin, Heart, Check, User, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { saveRegistrationProfile } from '@/app/actions/donor.actions';
import { getCurrentPosition } from '@/lib/geolocation';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Registration specific fields
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [bloodGroup, setBloodGroup] = useState<string>('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [isAvailableDonor, setIsAvailableDonor] = useState(true);

    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // Validation
                if (!fullName.trim()) throw new Error("Full name is required");
                if (!age || parseInt(age) < 18 || parseInt(age) > 100) {
                    throw new Error("You must be between 18 and 100 years old to register");
                }
                if (!bloodGroup) throw new Error("Please select a blood group");
                if (phone.length !== 10) throw new Error("Please enter a valid 10-digit mobile number");
                if (!location) throw new Error("Please enter your current city");

                // Get coordinates if they are missing
                let lat = latitude;
                let lng = longitude;
                if (!lat || !lng) {
                    try {
                        const pos = await getCurrentPosition();
                        lat = pos.coords.latitude;
                        lng = pos.coords.longitude;
                    } catch (gpsErr) {
                        console.warn('GPS resolve failed, proceeding with city name matching only', gpsErr);
                    }
                }

                // 1. Sign up user
                const { data, error: signUpError } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            full_name: fullName,
                        }
                    }
                });

                if (signUpError) throw signUpError;
                if (!data.user) throw new Error("Sign up failed to return user data.");

                const userId = data.user.id;

                // 2. Save profile data using server action
                const locationPoint = lat && lng ? `POINT(${lng} ${lat})` : null;
                await saveRegistrationProfile(userId, {
                    full_name: fullName,
                    blood_group: bloodGroup,
                    phone: phone,
                    city: location,
                    is_available_donor: isAvailableDonor,
                    latitude: lat,
                    longitude: lng,
                    location: locationPoint,
                    age: parseInt(age),
                });

                if (data.session) {
                    router.push('/dashboard');
                    router.refresh();
                } else {
                    setError("Check your email for the confirmation link!"); // Non-error feedback
                }
            } else {
                // Login Flow
                const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="inline-flex items-center justify-center rounded-xl p-4 bg-[var(--color-base-100)] mb-4">
                        <Droplet className="w-8 h-8 text-[var(--color-cta)] fill-[var(--color-cta)]" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-[var(--color-text-primary)]">
                        BloodRelay
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-2">
                        Emergency blood coordination network
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-base p-6 md:p-8">
                    {error && (
                        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${isSignUp && error.includes('Check') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-6">
                        {isSignUp && (
                            <div className="space-y-6 border-b border-[var(--color-border)] pb-6 mb-6">
                                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Profile Information</h2>
                                
                                {/* Full Name & Age */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                            <input
                                                type="text"
                                                required={isSignUp}
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full h-11 pl-10 pr-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-medium focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                            Age
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                            <input
                                                type="number"
                                                required={isSignUp}
                                                min="18"
                                                max="100"
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                className="w-full h-11 pl-10 pr-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-medium focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                                                placeholder="25"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Blood Group Buttons */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                        Blood Group
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {bloodGroups.map((bg) => {
                                            const isSelected = bloodGroup === bg;
                                            return (
                                                <button
                                                    key={bg}
                                                    type="button"
                                                    onClick={() => setBloodGroup(bg)}
                                                    className="h-10 rounded-[var(--radius-input)] font-bold text-xs transition-all border flex items-center justify-center"
                                                    style={{
                                                        borderColor: isSelected ? "var(--color-cta)" : "var(--color-border)",
                                                        backgroundColor: isSelected ? "var(--color-cta)" : "transparent",
                                                        color: isSelected ? "#ffffff" : "var(--color-text-primary)",
                                                    }}
                                                >
                                                    {bg}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Phone & Location */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                            Mobile Number
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                            <input
                                                type="tel"
                                                required={isSignUp}
                                                minLength={10}
                                                maxLength={10}
                                                pattern="[0-9]{10}"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className="w-full h-11 pl-10 pr-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-medium focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                                                placeholder="10-digit number"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                            Current City
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] z-10" />
                                            <LocationAutocomplete
                                                value={location}
                                                onChange={(val) => setLocation(val)}
                                                onSelect={(details) => {
                                                    setLatitude(details.lat);
                                                    setLongitude(details.lng);
                                                }}
                                                placeholder="e.g. Bangalore"
                                                className="pl-10 h-11 text-sm rounded-[var(--radius-input)] border border-[var(--color-border)]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Availability Toggle */}
                                <div
                                    className="p-4 rounded-[var(--radius-card)] border cursor-pointer transition-all flex items-center justify-between"
                                    style={{
                                        borderColor: isAvailableDonor ? "rgba(34, 197, 94, 0.4)" : "var(--color-border)",
                                        backgroundColor: isAvailableDonor ? "rgba(34, 197, 94, 0.04)" : "transparent"
                                    }}
                                    onClick={() => setIsAvailableDonor(!isAvailableDonor)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Heart className={`w-5 h-5 ${isAvailableDonor ? 'text-green-600 fill-green-600' : 'text-[var(--color-text-muted)]'}`} />
                                        <div>
                                            <h3 className="font-bold text-sm text-[var(--color-text-primary)]">Available for Deployment</h3>
                                            <p className="text-xs text-[var(--color-text-muted)]">Alert me for emergency requests in my city</p>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isAvailableDonor ? 'bg-green-600' : 'bg-gray-300'}`}>
                                        <span className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAvailableDonor ? 'translate-x-[22px]' : 'translate-x-1'}`}>
                                            {isAvailableDonor && <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Account Credentials */}
                        <div className="space-y-4">
                            {isSignUp && <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Credentials</h2>}
                            
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-11 pl-10 pr-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-medium focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-11 pl-10 pr-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-medium focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 mt-4 rounded-[var(--radius-input)] bg-[var(--color-text-primary)] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {loading ? "Please wait..." : (isSignUp ? "Register and Sign In" : "Sign In")}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                            className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </motion.div>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
                    <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
                    End-to-end encrypted medical data
                </div>
            </div>
        </div>
    );
}
