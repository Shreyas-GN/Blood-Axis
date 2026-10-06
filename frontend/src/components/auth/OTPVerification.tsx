"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, RefreshCw, Phone } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toE164 } from "@/lib/phone";

interface OTPVerificationProps {
    phone: string;
    onVerified: () => void;
    onBack?: () => void;
}

export function OTPVerification({ phone, onVerified, onBack }: OTPVerificationProps) {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { signIn } = useAuthActions();
    const e164 = toE164(phone);

    useEffect(() => { sendOTP(); }, []);

    useEffect(() => {
        if (countdown > 0) {
            const t = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(t);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const sendOTP = async () => {
        setSending(true);
        setError(null);
        try {
            await signIn('phone', { phone: e164 });
        } catch (e: any) {
            setError(e.message || 'Failed to send OTP');
        } finally {
            setSending(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setCanResend(false);
        setCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        await sendOTP();
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== 6) { setError('Enter all 6 digits'); return; }
        setLoading(true);
        setError(null);
        try {
            await signIn('phone', { phone: e164, code });
            setSuccess(true);
            setTimeout(onVerified, 1000);
        } catch (e: any) {
            setError('That code is incorrect or has expired.');
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (otp.every(d => d !== '') && !loading) handleVerify();
    }, [otp]);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
            <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-[var(--color-blood-light)] rounded-[var(--radius-card)] flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-6 h-6 text-[var(--color-blood)]" />
                </div>
                <h2 className="text-xl font-extrabold text-[var(--color-base-900)]">Verify your number</h2>
                <p className="text-sm text-[var(--color-base-500)]">
                    We sent a 6-digit code by SMS to<br />
                    <span className="font-bold text-[var(--color-base-900)]">{phone}</span>
                </p>
            </div>

            <div className="flex gap-2.5" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`Digit ${i + 1} of 6`}
                        value={digit}
                        onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        disabled={loading || success}
                        className={`w-11 h-[52px] text-center text-xl font-bold rounded-[var(--radius-input)] border-2 transition-all outline-none ${
                            success
                                ? 'border-[var(--color-safe)] bg-[var(--color-safe-light)] text-[var(--color-safe)]'
                                : digit
                                    ? 'border-[var(--color-blood)] bg-[var(--color-blood-light)] text-[var(--color-blood)]'
                                    : 'border-[var(--color-base-200)] bg-white text-[var(--color-base-900)]'
                        } focus:border-[var(--color-blood)] focus:ring-2 focus:ring-[rgba(185,28,28,0.12)]`}
                    />
                ))}
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 text-[var(--color-safe)] font-bold text-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Verified! Continuing…
                    </motion.div>
                )}
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-[var(--color-blood)] font-medium text-center"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>

            {!success && (
                <button
                    onClick={handleVerify}
                    disabled={otp.some(d => !d) || loading}
                    className="w-full py-3 bg-[var(--color-blood)] text-white font-bold rounded-[var(--radius-button)] transition-all clay-button-hover disabled:opacity-40 shadow-[var(--shadow-clay-hard)]"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Verifying…
                        </span>
                    ) : 'Confirm code'}
                </button>
            )}

            <div className="text-sm text-[var(--color-base-500)] text-center">
                {canResend ? (
                    <button
                        onClick={handleResend}
                        disabled={sending}
                        className="text-[var(--color-blood)] font-semibold hover:underline flex items-center gap-1 mx-auto"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {sending ? 'Sending…' : 'Resend code'}
                    </button>
                ) : (
                    <span>Resend in <span className="font-bold text-[var(--color-base-700)]">{countdown}s</span></span>
                )}
            </div>

            {onBack && (
                <button onClick={onBack} className="text-sm text-[var(--color-base-400)] hover:text-[var(--color-base-700)] transition-colors">
                    ← Change number
                </button>
            )}
        </div>
    );
}
