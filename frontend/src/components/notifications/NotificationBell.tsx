"use client";

import { useState, useEffect } from "react";
import { Bell, Droplet, CheckCircle2, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
    emergency_request: <Droplet className="w-4 h-4 text-[var(--color-primary)]" />,
    request_update:    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />,
    system:            <Info className="w-4 h-4 text-[var(--color-text-secondary)]" />,
};

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleClick = async (notification: Notification) => {
        if (notification.status === 'unread') {
            await markAsRead(notification.id);
        }
        if (notification.request_id) {
            router.push(`/request/${notification.request_id}`);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative p-[8px] rounded-full bg-[var(--color-bg-elevated)] border-[1.5px] border-[var(--color-border)] shadow-[var(--shadow-card)] hover:border-[var(--color-primary)] transition-colors group flex items-center justify-center"
                aria-label="Toggle notifications"
            >
                <Bell className="w-5 h-5 text-[var(--color-base-700)] group-hover:text-[var(--color-blood)] transition-colors" />

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute top-[-4px] right-[-4px] inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[0.625rem] font-mono font-bold text-white bg-[var(--color-blood)] rounded-full shadow-[var(--shadow-clay-hard)] border-2 border-white"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-3 w-80 z-50 flex flex-col bg-[var(--color-bg-elevated)] rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] border-[1.5px] border-[var(--color-border)] overflow-hidden"
                        >
                            <div className="px-5 py-4 border-b border-[var(--color-base-200)] flex items-center justify-between bg-[var(--color-base-50)]">
                                <h3 className="font-mono text-[0.75rem] font-bold text-[var(--color-base-500)] uppercase tracking-widest">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[0.75rem] text-[var(--color-blood)] hover:underline font-bold transition-colors"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="overflow-y-auto max-h-[400px] flex-1 flex flex-col">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-[var(--color-base-50)] border-[1.5px] border-[var(--color-base-200)] flex items-center justify-center mb-3">
                                            <Bell className="w-6 h-6 text-[var(--color-base-400)]" />
                                        </div>
                                        <p className="font-display font-bold text-[1rem] text-[var(--color-base-900)]">All clear</p>
                                        <p className="text-[0.875rem] mt-1 text-[var(--color-base-500)]">No new notifications.</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleClick(notification)}
                                            className={`w-full p-4 transition-colors text-left flex gap-3 border-b border-[var(--color-base-200)] last:border-b-0 ${notification.status === 'unread' ? "bg-[var(--color-blood-light)]" : "hover:bg-[var(--color-base-50)]"}`}
                                        >
                                            <div className="flex-shrink-0 w-[32px] h-[32px] rounded-full flex items-center justify-center bg-[var(--color-bg-elevated)] shadow-sm border border-[var(--color-border)] text-[1rem]">
                                                {NOTIFICATION_ICONS[notification.type] ?? <Bell className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[0.875rem] text-[var(--color-base-900)] leading-tight mb-1 flex justify-between items-start gap-2">
                                                    <span className="truncate">{notification.title}</span>
                                                    {notification.status === 'unread' && (
                                                        <span className="flex-shrink-0 w-[6px] h-[6px] bg-[var(--color-blood)] rounded-full mt-1.5" />
                                                    )}
                                                </p>
                                                <p className="text-[0.875rem] text-[var(--color-base-500)] line-clamp-2 leading-snug mb-1.5">
                                                    {notification.message}
                                                </p>
                                                <p className="font-mono text-[0.75rem] text-[var(--color-base-400)]">
                                                    {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
