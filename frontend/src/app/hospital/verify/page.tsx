"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Droplet, Shield, ShieldCheck, ArrowRight, Building, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
};

export default function HospitalVerify() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    hospital_name: '',
    license_id: '',
    city: 'Bangalore',
    admin_name: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      router.push('/hospital/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans px-6 py-12 md:py-24">
      <main className="max-w-md mx-auto">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          className="space-y-8"
        >
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center bg-[var(--color-danger-light)] text-[var(--color-danger)] rounded-2xl p-4 mb-2">
              <Building className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hospital Certification</h1>
            <p className="text-[var(--color-text-muted)] text-sm font-medium">Verify your medical institution to broadcast emergency requests.</p>
          </div>

          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-elevated)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest block">Institution Name</label>
                <input
                  type="text" required placeholder="e.g. City General Hospital"
                  value={form.hospital_name}
                  onChange={e => setForm({...form, hospital_name: e.target.value})}
                  className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest block">Medical License ID / Registry Number</label>
                <input
                  type="text" required placeholder="e.g. MC-55420-1A"
                  value={form.license_id}
                  onChange={e => setForm({...form, license_id: e.target.value})}
                  className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest block">Primary intake coordinator name</label>
                <input
                  type="text" required placeholder="e.g. Dr. Sarah K."
                  value={form.admin_name}
                  onChange={e => setForm({...form, admin_name: e.target.value})}
                  className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !form.hospital_name || !form.license_id || !form.admin_name}
                className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-cta-hover)] text-white font-bold rounded-[var(--radius-button)] flex items-center justify-center transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] shadow-[var(--shadow-card)]"
              >
                {loading ? (
                  <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin mr-3" /> Verifying Credentials...</>
                ) : (
                  <>
                    Request Verification
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <div className="flex items-start gap-2.5 text-[10px] font-medium text-[var(--color-text-muted)] leading-normal">
                <ShieldCheck className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                <span>Verification requires a valid medical institution license. Access is audited by the health registry department.</span>
              </div>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
