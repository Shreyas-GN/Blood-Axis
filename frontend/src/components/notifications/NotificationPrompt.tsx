"use client";

import { useState, useEffect } from 'react';
import { useProfile } from "@/context/AuthContext";
import { registerForPushNotifications } from '@/lib/firebase/messaging';
import { Bell, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationPrompt() {
    const { user, profile, isLoading: isLoaded } = useProfile();
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (
            user &&
            profile?.is_available_donor &&
            !profile?.fcm_token &&
            'Notification' in window &&
            Notification.permission === 'default'
        ) {
            const timer = setTimeout(() => setShow(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [user, profile]);

    const handleEnable = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await registerForPushNotifications(user.id);
            if (token) {
                setSuccess(true);
                setTimeout(() => setShow(false), 2000);
            } else {
                setShow(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:w-[380px] z-[100]"
                >
                    <div className="bg-white border-2 border-[var(--color-blood)] rounded-[var(--radius-card)] shadow-[var(--shadow-clay-hard)] p-5 relative overflow-hidden">
                        <div className="absolute -top-8 -right-8 w-28 h-28 bg-[var(--color-blood-light)] rounded-full opacity-50" />

                        <button
                            onClick={() => setShow(false)}
                            className="absolute top-3.5 right-3.5 p-1 hover:bg-[var(--color-base-100)] rounded-lg transition-colors z-10"
                        >
                            <X className="w-4 h-4 text-[var(--color-base-400)]" />
                        </button>

                        <div className="flex gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-[var(--radius-input)] bg-[var(--color-blood-light)] flex items-center justify-center shrink-0">
                                {success ? (
                                    <CheckCircle className="w-5 h-5 text-[var(--color-safe)]" />
                                ) : (
                                    <Bell className="w-5 h-5 text-[var(--color-blood)]" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-[var(--color-base-900)] text-sm">
                                    {success ? 'Notifications enabled' : 'Enable emergency alerts'}
                                </h3>
                                <p className="text-xs text-[var(--color-base-500)] leading-relaxed">
                                    {success
                                        ? "You'll now receive instant push notifications for matching blood requests."
                                        : "Don't miss life-critical requests. Get notified instantly when someone nearby needs your blood type."}
                                </p>
                            </div>
                        </div>

                        {!success && (
                            <div className="mt-4 flex gap-2 relative z-10">
                                <button
                                    onClick={handleEnable}
                                    disabled={loading}
                                    className="flex-1 py-2.5 bg-[var(--color-blood)] text-white text-sm font-bold rounded-[var(--radius-button)] hover:bg-[var(--color-blood-dark)] transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Requesting…' : 'Enable now'}
                                </button>
                                <button
                                    onClick={() => setShow(false)}
                                    className="flex-1 py-2.5 border border-[var(--color-base-200)] text-[var(--color-base-500)] text-sm font-bold rounded-[var(--radius-button)] hover:bg-[var(--color-base-50)] transition-colors"
                                >
                                    Later
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
