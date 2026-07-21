"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { slideUpFade } from "@/lib/motion";
import type { LucideIcon } from "lucide-react";

interface ImpactCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
}

export function ImpactCard({ label, value, icon: Icon }: ImpactCardProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (value === 0) {
            setCount(0);
            return;
        }
        const duration = 600;
        const startTime = Date.now();
        let raf: number;

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) {
                raf = requestAnimationFrame(tick);
            }
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value]);

    return (
        <motion.div
            variants={slideUpFade}
            initial="hidden"
            animate="visible"
            className="flex flex-col justify-between h-full min-h-[120px] bg-[var(--color-bg-elevated)]"
        >
            <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-metric text-[var(--color-text-muted)] uppercase tracking-widest leading-tight">
                    {label}
                </p>
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 border border-[var(--color-border)] bg-[var(--color-bg)]">
                    <Icon className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                </div>
            </div>
            <p className="text-4xl font-metric font-medium text-[var(--color-text-primary)] tracking-tight leading-none">
                {count}
            </p>
        </motion.div>
    );
}
