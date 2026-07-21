"use server";

import { supabaseServer } from "@/lib/supabase/server";
import type { ActivityEventType } from "@/types/database.types";

export async function logActivityAction(
    eventType: ActivityEventType,
    description: string,
    requestId?: string | null
) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return; // Silent fail if unauthorized for activities

    try {
        const { error } = await supabaseServer
            .from('activities')
            .insert({
                user_id: user.id,
                event_type: eventType,
                description,
                request_id: requestId ?? null,
            });
        if (error) console.error('logActivityAction failed:', error);
    } catch (err) {
        console.error('logActivityAction threw:', err);
    }
}

export async function getRecentActivitiesAction() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw new Error(`Failed to fetch activities: ${error.message}`);
    return data;
}
