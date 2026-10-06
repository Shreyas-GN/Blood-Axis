"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Notification } from "@/types";

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => void;
}

export function useNotifications(): UseNotificationsReturn {
    const data = useQuery(api.notifications.list);
    const markRead = useMutation(api.notifications.markRead);
    const markAll = useMutation(api.notifications.markAllRead);

    const markAsRead = useCallback(async (id: string) => {
        await markRead({ id: id as any });
    }, [markRead]);
    const markAllAsRead = useCallback(async () => { await markAll({}); }, [markAll]);

    const notifications = (data ?? []) as Notification[];
    return {
        notifications,
        unreadCount: notifications.filter((n) => n.status === "unread").length,
        loading: data === undefined,
        markAsRead,
        markAllAsRead,
        refresh: () => {},
    };
}
