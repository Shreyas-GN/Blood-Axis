"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProfile } from "@/context/AuthContext";
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { toRequestArgs } from '@/lib/convex-adapters';
import { AlertCircle, MapPin, Phone, User, Droplet, ArrowLeft, Save, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const requesterRelations = [
    { value: 'MYSELF', label: 'Myself' },
    { value: 'FAMILY', label: 'Family Member' },
    { value: 'FRIEND', label: 'Friend' },
    { value: 'OTHER', label: 'Other' },
] as const;

const urgencyLevels = [
    { value: 'IMMEDIATE', label: 'Immediate (next few hours)', color: 'red' },
    { value: 'TODAY', label: 'Today', color: 'amber' },
    { value: 'SCHEDULED', label: 'Scheduled', color: 'blue' },
] as const;

const fadeInUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
};

export default function EditRequestPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading: isLoaded } = useProfile();
    
    const request = useQuery(api.requests.get, params.id ? { id: String(params.id) } : 'skip');
    const updateRequest = useMutation(api.requests.update);
    const loading = request === undefined;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        blood_group: '',
        units: 1,
        patient_name: '',
        hospital_name: '',
        city: '',
        contact_phone: '',
        requester_relation: 'MYSELF',
        urgency_level: 'IMMEDIATE',
        note: '',
    });

    useEffect(() => {
        if (!isLoaded) return;
        if (!user) { router.push('/'); return; }
        if (request === undefined) return;
        if (request === null) { setError('Request not found'); return; }
        // Only the requester may edit.
        if (request.requester_id !== user.id) { router.push('/dashboard'); return; }
        setFormData({
            blood_group: request.blood_group,
            units: request.units,
            patient_name: request.patient_name || '',
            hospital_name: request.hospital_name || '',
            city: request.city || '',
            contact_phone: request.contact_phone || '',
            requester_relation: request.requester_relation || 'MYSELF',
            urgency_level: request.urgency_level || 'TODAY',
            note: request.note || ''
        });
        // Load the form once; later live updates must not overwrite edits in progress.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, user?.id, request === undefined, request === null]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Blood group is fixed once alerts have gone out.
            const { bloodGroup: _bg, ...args } = toRequestArgs(formData) as Record<string, unknown>;
            await updateRequest({ id: params.id as Id<'bloodRequests'>, ...args });
            router.push(`/request/${params.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to update request. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !isLoaded) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="w-12 h-12 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-200 dark:border-zinc-800" />
                    <div className="absolute inset-0 rounded-full border-2 border-crimson border-t-transparent animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 selection:bg-crimson/30 pb-safe">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-white/10">
                <nav className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href={`/request/${params.id}`} className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Case
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeInUp}
                    className="space-y-8"
                >
                    {/* Page Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Edit Case File</h1>
                        <p className="text-zinc-500 font-medium">Update the details of your blood request.</p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        
                        <div className="p-6 sm:p-10">
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-rose-800 dark:text-rose-400">Update Failed</h3>
                                        <p className="text-sm font-medium text-rose-700/70 dark:text-rose-500/70 mt-1">{error}</p>
                                    </div>
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-10">
                                {/* Blood Requirements Section */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-crimson/10 flex items-center justify-center">
                                            <Droplet className="w-4 h-4 text-crimson" />
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Requirements</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Blood Type <span className="text-crimson">*</span></label>
                                            <select
                                                required
                                                value={formData.blood_group}
                                                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all"
                                            >
                                                <option value="">Select Type</option>
                                                {bloodGroups.map((bg) => (
                                                    <option key={bg} value={bg}>{bg}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Units Needed <span className="text-crimson">*</span></label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                max="20"
                                                value={formData.units || ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    setFormData({ ...formData, units: isNaN(val) ? 0 : val });
                                                }}
                                                placeholder="1"
                                                className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Urgency Level */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Urgency Level</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {urgencyLevels.map((level) => (
                                            <button
                                                key={level.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, urgency_level: level.value })}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.urgency_level === level.value
                                                    ? level.color === 'red'
                                                        ? 'border-rose-500 bg-rose-500/10'
                                                        : level.color === 'amber'
                                                            ? 'border-amber-500 bg-amber-500/10'
                                                            : 'border-blue-500 bg-blue-500/10'
                                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                    }`}
                                            >
                                                <p className={`font-bold ${formData.urgency_level === level.value ? (level.color === 'red' ? 'text-rose-700 dark:text-rose-400' : level.color === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400') : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                    {level.label}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Patient & Hospital Section */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <User className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Patient Details</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Patient Name <span className="text-crimson">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                minLength={3}
                                                placeholder="Patient's full name"
                                                value={formData.patient_name}
                                                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Hospital Name <span className="text-crimson">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                minLength={3}
                                                placeholder="Name of the hospital"
                                                value={formData.hospital_name}
                                                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">City <span className="text-crimson">*</span></label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="text"
                                                    required
                                                    minLength={3}
                                                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all"
                                                    placeholder="City name"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Contact Number <span className="text-crimson">*</span></label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="tel"
                                                    required
                                                    minLength={10}
                                                    maxLength={10}
                                                    pattern="[0-9]{10}"
                                                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all"
                                                    placeholder="10-digit number"
                                                    value={formData.contact_phone}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setFormData({ ...formData, contact_phone: val });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Requester Relation */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Relation to Patient</h2>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {requesterRelations.map((relation) => (
                                            <button
                                                key={relation.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, requester_relation: relation.value })}
                                                className={`p-4 rounded-xl border-2 transition-all ${formData.requester_relation === relation.value
                                                    ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                                    }`}
                                            >
                                                <p className="font-bold text-center text-sm">{relation.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Notes */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Additional Notes</label>
                                    <textarea
                                        rows={3}
                                        maxLength={150}
                                        placeholder="Any additional information..."
                                        value={formData.note}
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson transition-all resize-none"
                                    />
                                    <p className="text-xs font-medium text-zinc-500">{formData.note.length}/150 characters</p>
                                </div>

                                {/* Submit Buttons */}
                                <div className="pt-8 border-t border-zinc-200/50 dark:border-white/10 flex flex-col-reverse sm:flex-row gap-4">
                                    <Link href={`/request/${params.id}`} className="w-full sm:w-auto">
                                        <button
                                            type="button"
                                            className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-bold rounded-2xl flex items-center justify-center transition-all hover:bg-zinc-100 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-zinc-700"
                                        >
                                            Cancel
                                        </button>
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:flex-1 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-lg font-bold rounded-2xl flex items-center justify-center shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                                    >
                                        {saving ? (
                                            <><span className="w-5 h-5 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin mr-3" /> Saving...</>
                                        ) : (
                                            <><Save className="w-5 h-5 mr-2" /> Save Changes</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

