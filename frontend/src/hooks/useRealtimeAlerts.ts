"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useProfile } from "@/context/AuthContext";

export function useRealtimeAlerts() {
    const { user } = useProfile();
    const notifications = useQuery(api.notifications.list);
    const seen = useRef<Set<string> | null>(null);

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }, []);

    const playAlertSound = useCallback(() => {
        try {
            const audio = new Audio('/sounds/alert.mp3'); 
            audio.volume = 0.5;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Autoplay likely blocked, fallback to visual only
                    console.warn("[Alert] Audio playback blocked by browser");
                });
            }
        } catch (e) {
            console.error("[Alert] Audio failed", e);
        }
    }, []);

    const triggerNotification = useCallback((title: string, body: string, isImmediate = false) => {
        // Native Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, { 
                    body, 
                    icon: '/favicon.ico',
                    tag: 'bloodaxis-alert',
                    renotify: true,
                    silent: !isImmediate
                } as any);
            } catch (e) {
                console.error("[Notification] Native API failed", e);
            }
        }

        // Audio Feedback
        if (isImmediate) {
            playAlertSound();
        }
    }, [playAlertSound]);

    // Notifications are live: anything unread that appears after the first load
    // is new, so surface it as a browser notification (and sound if urgent).
    useEffect(() => {
        if (!user?.id || notifications === undefined) return;
        if (seen.current === null) {
            seen.current = new Set(notifications.map((n) => n.id));
            return;
        }
        for (const n of notifications) {
            if (seen.current.has(n.id)) continue;
            seen.current.add(n.id);
            if (n.status === 'unread') {
                triggerNotification(n.title, n.message, n.type === 'emergency_request');
            }
        }
    }, [user?.id, notifications, triggerNotification]);

    return { requestPermission };
}
