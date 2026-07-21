"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useProfile } from "@/context/AuthContext";
import type { Notification } from "@/types";

const POLL_INTERVAL_MS = 20_000;

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => void;
}

export function useNotifications(): UseNotificationsReturn {
    const { user } = useProfile();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await (supabaseClient as any)
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('sent_at', { ascending: false })
                .limit(30);

            if (!error && data) {
                setNotifications(data as Notification[]);
                setUnreadCount(data.filter((n: Notification) => n.status === 'unread').length);
            }
        } catch {
            // Silently fail — polling will retry
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const markAsRead = useCallback(
        async (id: string) => {
            await (supabaseClient as any)
                .from('notifications')
                .update({ status: 'read', read_at: new Date().toISOString() })
                .eq('id', id);
            await fetchAll();
        },
        [fetchAll]
    );

    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;
        await (supabaseClient as any)
            .from('notifications')
            .update({ status: 'read', read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('status', 'unread');
        await fetchAll();
    }, [user?.id, fetchAll]);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchAll]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchAll,
    };
}
