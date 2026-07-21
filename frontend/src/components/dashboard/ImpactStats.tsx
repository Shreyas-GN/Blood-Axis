"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Flame, MapPin } from "lucide-react";

interface ImpactStatsProps {
    totalHelped?: number;
    points?: number;
    level?: string;
}

export function ImpactStats({ totalHelped = 0, points = 0, level = "Bronze Savior" }: ImpactStatsProps) {
    const xpPercent = Math.min(100, (points / 500) * 100);

    return (
        <div className="bg-zinc-900 border-[1.5px] border-zinc-800 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-clay)] flex flex-col h-full text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(192,57,43,0.1),transparent_50%)] pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <h3 className="font-display font-bold text-[1.125rem] tracking-tight">Community Impact</h3>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{level}</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4 mb-4 relative z-10">
                <p className="text-[10px] font-mono font-bold text-[var(--color-blood-light)] uppercase tracking-widest mb-1">Lives Supported</p>
                <div className="flex items-baseline gap-2">
                    <motion.span 
                        initial={{ opacity: 0, scale: 0.5 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="text-5xl font-display font-black tracking-tighter"
                    >
                        {totalHelped}
                    </motion.span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 relative z-10">
                <div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center border border-zinc-700/50">
                    <Flame className="w-4 h-4 text-zinc-500 mb-1" />
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">Streak</span>
                    <span className="font-bold text-sm">0 Days</span>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center border border-zinc-700/50">
                    <Zap className="w-4 h-4 text-amber-400 mb-1" />
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">Points</span>
                    <span className="font-bold text-sm">{points}</span>
                </div>
                <div className="col-span-2 bg-zinc-800/50 rounded-xl p-3 flex flex-row items-center justify-center gap-3 border border-zinc-700/50">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">Rank:</span>
                    <span className="font-bold text-sm">---</span>
                </div>
            </div>

            <div className="space-y-2 relative z-10 mt-auto">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                    <span>Next: Silver Lifeline</span>
                    <span>{points}/500 XP</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${xpPercent}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300"
                    />
                </div>
            </div>
        </div>
    );
}
