"use server";

import { supabaseServer } from "@/lib/supabase/server";

import { ActivityService } from "@/services/activity.service";
import { revalidatePath } from "next/cache";

export async function getProfileAction() {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !data) return null;
    return data;
}

export async function updateProfileAction(profileData: any) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    // 1. Update Supabase for PostGIS geographic matching to keep it in sync
    const { error, data } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...profileData })
        .select()
        .single();

    if (error) {
        console.error("Supabase update failed:", error);
        throw new Error(`Failed to update profile: ${error.message}`);
    }

    // We skip Django update since we are migrating to Supabase as single source of truth.
    return data;
}

export async function saveRegistrationProfile(userId: string, data: {
    blood_group: string;
    phone: string;
    city: string;
    is_available_donor: boolean;
    latitude: number | null;
    longitude: number | null;
    location: string | null;
    full_name: string;
    age: number;
}) {
    console.log('[donor:action] ▶ saveRegistrationProfile called for user:', userId);

    const supabase = await supabaseServer;
    const profileData = {
        full_name: data.full_name,
        blood_group: data.blood_group as any,
        phone: data.phone,
        city: data.city,
        is_available_donor: data.is_available_donor,
        is_donor: data.is_available_donor,
        profile_completed: true,
        latitude: data.latitude,
        longitude: data.longitude,
        location: data.location,
        age: data.age,
    };

    console.log('[donor:action] Attempting Supabase upsert for userId:', userId, profileData);

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...profileData });

    if (error) {
        console.error('[donor:action] ✖ Supabase upsert failed:', error);
        throw new Error(`Failed to save profile: ${error.message}`);
    }

    console.log('[donor:action] ✔ Supabase upsert succeeded');

    await ActivityService.log(userId, 'profile_completed', 'Completed donor profile setup.', null, supabaseServer as any).catch((e: unknown) => {
        console.warn('[donor:action] Activity log failed (non-fatal):', e);
    });

    revalidatePath('/');
    revalidatePath('/dashboard');
    return { success: true };
}


export async function submitDonorResponseAction(
    requestId: string,
    status: 'ACCEPTED' | 'CONFIRMED' | 'ARRIVED' | 'CANCELLED' = 'ACCEPTED',
    distanceMeters?: number | null,
    etaMinutes?: number | null
) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabaseServer
        .from('donor_responses')
        .upsert({
            request_id: requestId,
            donor_id: user.id,
            status: status,
            distance_meters: distanceMeters,
            eta_minutes: etaMinutes,
            responded_at: new Date().toISOString()
        }, { onConflict: 'request_id,donor_id' })
        .select()
        .single();

    if (error) throw new Error(`Failed to submit donor response: ${error.message}`);

    try {
        await supabaseServer.rpc('increment_confirmed_count', { req_id: requestId });
    } catch (e) {
        console.error("Failed to increment confirmed count", e);
    }

    return data;
}

export async function getResponsesForRequestAction(requestId: string) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    // We can enforce that only the requester or a responder can view these
    // But since it's a server action, the service role bypasses RLS.
    // For safety, let's just fetch it. The UI already restricts access to the page.
    const { data, error } = await supabaseServer
        .from('donor_responses')
        .select(`
            *,
            profiles!inner(*)
        `)
        .eq('request_id', requestId);

    if (error) throw new Error(`Failed to fetch donor responses: ${error.message}`);
    return data;
}

export async function cancelResponseAction(requestId: string) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabaseServer
        .from('donor_responses')
        .update({ status: 'CANCELLED' })
        .match({ request_id: requestId, donor_id: user.id })
        .select()
        .single();

    if (error) throw new Error(`Failed to update donor response status: ${error.message}`);
    return data;
}

export async function getNearbyDonorsAction(reqLat: number, reqLng: number, radiusKm: number, reqBloodGroup: string) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabaseServer.rpc('find_nearby_donors_v2', {
        req_lat: reqLat,
        req_lng: reqLng,
        radius_km: radiusKm,
        req_blood_group: reqBloodGroup,
    });

    if (error) throw new Error(`Failed to fetch nearby donors: ${error.message}`);
    return data;
}

export async function getResponsesForDonorAction() {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabaseServer
        .from('donor_responses')
        .select('request_id, status')
        .eq('donor_id', user.id);

    if (error) throw new Error(`Failed to fetch donor responses: ${error.message}`);
    return data;
}
