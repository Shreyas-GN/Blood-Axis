"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, Bell, Settings } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export function BottomNav() {
    const pathname = usePathname();
    const { unreadCount } = useNotifications();

    const items = [
        { href: "/dashboard",      icon: LayoutDashboard, label: "Dashboard",   badge: 0 as number },
        { href: "/request/wizard", icon: Plus,            label: "New Request", badge: 0 as number },
        { href: "/notifications",  icon: Bell,            label: "Alerts",      badge: unreadCount },
        { href: "/settings",       icon: Settings,        label: "Settings",    badge: 0 as number },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
            aria-label="Main navigation"
            style={{
                backgroundColor: "color-mix(in oklab, var(--color-bg) 88%, transparent)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderTop: "1px solid var(--color-border-subtle)",
            }}
        >
            <div className="flex items-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
                {items.map(({ href, icon: Icon, label, badge }) => {
                    const isDashboard = href === "/dashboard";
                    const isActive = isDashboard
                        ? pathname === "/dashboard"
                        : pathname === href || pathname.startsWith(href + "/");

                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex-1 flex flex-col items-center pt-3 pb-1.5 gap-1 active:opacity-70 transition-opacity"
                            aria-current={isActive ? "page" : undefined}
                        >
                            <div
                                className="relative flex items-center justify-center w-12 h-8 rounded-full transition-colors duration-150"
                                style={isActive ? { background: "rgba(214,58,58,0.10)" } : {}}
                            >
                                <Icon
                                    className="transition-colors duration-150"
                                    style={{
                                        width: 22,
                                        height: 22,
                                        color: isActive ? "var(--color-cta)" : "var(--color-text-muted)",
                                        strokeWidth: isActive ? 2 : 1.75,
                                    }}
                                    aria-hidden="true"
                                />
                                {badge > 0 && (
                                    <span
                                        className="absolute top-0 right-0.5 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                                        style={{ background: "var(--color-cta)" }}
                                        aria-label={`${badge} unread`}
                                    >
                                        {badge > 9 ? "9+" : badge}
                                    </span>
                                )}
                            </div>
                            <span
                                className="text-[10px] leading-none transition-colors duration-150"
                                style={{
                                    color: isActive ? "var(--color-cta)" : "var(--color-text-muted)",
                                    fontWeight: isActive ? 600 : 500,
                                }}
                            >
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
