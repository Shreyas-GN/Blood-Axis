"use client";

import { useProfile } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Droplet, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { BottomNav } from "@/components/nav/BottomNav";
import { EmptyStateNotifications } from "@/components/ui/EmptyState";
import { slideUpFade, staggerContainer } from "@/lib/motion";

const NOTIFICATION_ICONS: Record<string, string> = {
    emergency_request: "🩸",
    request_update:    "✅",
    system:            "🔔",
};

const NOTIFICATION_LABELS: Record<string, string> = {
    emergency_request: "Emergency Request",
    request_update:    "Request Update",
    system:            "System",
};

function NotificationsSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)]">
            <header
                className="sticky top-0 z-50 border-b border-[var(--color-border-subtle)] h-16"
                style={{ background: "rgba(252,252,251,0.92)" }}
            />
            <main className="max-w-[720px] mx-auto px-6 py-10">
                <div className="mb-8 flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="skeleton h-8 w-40 rounded-lg" />
                        <div className="skeleton h-4 w-20 rounded" />
                    </div>
                </div>
                <div className="card-base overflow-hidden p-0">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-4 px-6 py-5 border-b border-[var(--color-border-subtle)] last:border-b-0">
                            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2 py-0.5">
                                <div className="skeleton h-3.5 rounded-full" style={{ width: `${50 + i * 8}%` }} />
                                <div className="skeleton h-3 rounded-full w-full" />
                                <div className="skeleton h-2.5 rounded-full w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default function NotificationsPage() {
    const { user, isLoading: isLoaded } = useProfile();
    const router = useRouter();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    useEffect(() => {
        if (!isLoaded) return;
        if (!user) router.push("/");
    }, [isLoaded, user, router]);

    if (!isLoaded || loading) return <NotificationsSkeleton />;

    return (
        <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text-primary)] pb-24 md:pb-0">
            <header
                className="sticky top-0 z-50 border-b border-[var(--color-border-subtle)] h-16 flex justify-center"
                style={{ background: "rgba(252,252,251,0.92)", backdropFilter: "blur(12px)" }}
            >
                <nav className="w-full max-w-[1280px] px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <div className="w-px h-4 bg-[var(--color-border-subtle)]" aria-hidden="true" />
                        <Link href="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-md">
                            <Droplet className="w-4 h-4 fill-[var(--color-cta)] stroke-[var(--color-cta)]" />
                            <span className="text-[15px] font-semibold tracking-tight">Blood Axis</span>
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="max-w-[720px] mx-auto px-6 py-10">
                {/* Page header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1
                            className="font-display font-bold text-[var(--color-text-primary)] tracking-tight"
                            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", lineHeight: 1.1 }}
                        >
                            Notifications
                        </h1>
                        <p className="text-[var(--color-text-muted)] mt-1 text-[14px]">
                            {unreadCount > 0
                                ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
                                : "You're all caught up"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-[13px] font-semibold text-[var(--color-cta)] hover:text-[var(--color-cta-hover)] transition-colors mt-1"
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="card-base">
                        <EmptyStateNotifications />
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="card-base overflow-hidden p-0"
                    >
                        <AnimatePresence initial={false}>
                            {notifications.map((notification, i) => (
                                <motion.button
                                    key={notification.id}
                                    variants={slideUpFade}
                                    onClick={async () => {
                                        if (notification.status === "unread") await markAsRead(notification.id);
                                        if (notification.request_id) router.push(`/request/${notification.request_id}`);
                                    }}
                                    className="w-full text-left flex gap-4 px-6 py-5 transition-colors hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
                                    style={{
                                        borderBottom: i < notifications.length - 1
                                            ? "1px solid var(--color-border-subtle)"
                                            : "none",
                                        background: notification.status === "unread"
                                            ? "rgba(214,58,58,0.025)"
                                            : "transparent",
                                    }}
                                    aria-label={`${notification.title}${notification.status === "unread" ? " (unread)" : ""}`}
                                >
                                    {/* Icon */}
                                    <div
                                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border border-[var(--color-border-subtle)]"
                                        style={{ background: "var(--color-bg-elevated)" }}
                                        aria-hidden="true"
                                    >
                                        {NOTIFICATION_ICONS[notification.type] ?? "🔔"}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-tight truncate">
                                                {notification.title}
                                            </p>
                                            {notification.status === "unread" && (
                                                <span
                                                    className="flex-shrink-0 w-2 h-2 rounded-full mt-1"
                                                    style={{ background: "var(--color-cta)" }}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </div>
                                        <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 mb-1.5">
                                            {notification.message}
                                        </p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] font-metric">
                                            {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
