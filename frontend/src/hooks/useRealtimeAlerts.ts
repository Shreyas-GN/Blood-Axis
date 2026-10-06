"use client";

import { useEffect, useCallback } from 'react';
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/supabase/realtime';
import { useProfile } from "@/context/AuthContext";

export function useRealtimeAlerts() {
    const { user } = useProfile();
    const { profile } = useProfile();

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
                    tag: 'bloodrelay-alert',
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

    useEffect(() => {
        if (!user?.id || !profile) return;

        // 1. Subscribe to new requests that match donor's blood group
        if (profile.is_available_donor && profile.blood_group) {
            const channelId = `requests_${profile.blood_group.replace('+', 'pos').replace('-', 'neg')}`;
            
            subscribeToChannel(channelId, (channel) => {
                channel.on(
                    'postgres_changes',
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'blood_requests',
                        filter: `blood_group=eq.${profile.blood_group}` 
                    },
                    (payload: any) => {
                        const request = payload.new;
                        // Skip if we are the requester
                        if (request.requester_id === user.id) return;
                        
                        triggerNotification(
                            'Emergency Blood Needed! 🩸',
                            `${request.units} units of ${request.blood_group} needed at ${request.hospital_name}.`,
                            request.urgency_level === 'IMMEDIATE'
                        );
                    }
                );
            });
        }

        // 2. Subscribe to targeted notification logs
        const logChannelId = `notifications_${user.id}`;
        subscribeToChannel(logChannelId, (channel) => {
            channel.on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification_logs',
                    filter: `donor_id=eq.${user.id}`
                },
                (payload: any) => {
                    const log = payload.new;
                    const metadata = log.metadata || {};
                    
                    triggerNotification(
                        metadata.title || 'BloodRelay Alert',
                        metadata.body || 'New update regarding a blood request.',
                        metadata.urgency === 'HIGH' || metadata.isImmediate === true
                    );
                }
            );
        });

        return () => {
            if (profile.blood_group) {
                const channelId = `requests_${profile.blood_group.replace('+', 'pos').replace('-', 'neg')}`;
                unsubscribeFromChannel(channelId);
            }
            unsubscribeFromChannel(`notifications_${user.id}`);
        };
    }, [user?.id, profile, triggerNotification]);
}
