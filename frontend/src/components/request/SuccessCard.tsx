"use client";

import { motion } from "framer-motion";
import { slideUpFade } from "@/lib/motion";
import { Heart } from "lucide-react";

interface Props {
  patientName: string;
  bloodGroup: string;
  donorName?: string;
}

export function SuccessCard({ patientName, bloodGroup, donorName }: Props) {
  return (
    <motion.div
      variants={slideUpFade}
      initial="hidden"
      animate="visible"
      role="status"
      aria-label="Request fulfilled"
      className="bg-[var(--color-success-light)] border border-[#A7F3D0] rounded-[var(--radius-card)] p-6 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white border border-[#A7F3D0] rounded-2xl flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-[var(--color-success)]" aria-hidden="true" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-success)] mb-2">
            Request Fulfilled
          </p>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2 leading-tight">
            {donorName
              ? `${donorName} is helping ${patientName}.`
              : `Help has been confirmed for ${patientName}.`}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-sm">
            Thank you for trusting BloodRelay. Please coordinate directly with your donor to complete the process.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
