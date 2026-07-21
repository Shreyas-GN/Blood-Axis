"use client";

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Droplet, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    }
                });
                if (signUpError) throw signUpError;
                setError("Check your email for the confirmation link!"); // Not actually an error, just feedback
            } else {
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
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
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

                    <form onSubmit={handleAuth} className="space-y-4">
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 mt-4 rounded-[var(--radius-input)] bg-[var(--color-text-primary)] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
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
