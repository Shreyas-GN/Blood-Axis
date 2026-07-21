"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ActivityService } from '@/services/activity.service';

export async function saveOnboardingProfile(data: {
    blood_group: string;
    phone: string;
    city: string;
    is_available_donor: boolean;
    latitude: number | null;
    longitude: number | null;
    location: string | null;
    full_name: string;
}) {
    console.log('[onboarding:action] ▶ saveOnboardingProfile called');

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) throw new Error("Unauthorized");
    const userId = user.id;
    console.log('[onboarding:action] Auth resolved → userId:', userId);

    const profileData = {
        full_name: data.full_name,
        blood_group: data.blood_group,
        phone: data.phone,
        city: data.city,
        is_available_donor: data.is_available_donor,
        is_donor: data.is_available_donor,
        profile_completed: true,
        latitude: data.latitude,
        longitude: data.longitude,
        location: data.location,
    };

    console.log('[onboarding:action] Attempting Supabase upsert for userId:', userId, profileData);

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...profileData });

    if (error) {
        console.error('[onboarding:action] ✖ Supabase upsert failed:', error);
        throw new Error(`Failed to save profile: ${error.message}`);
    }

    console.log('[onboarding:action] ✔ Supabase upsert succeeded');

    await ActivityService.log(userId, 'profile_completed', 'Completed donor profile setup.', null, supabaseServer as any).catch((e: unknown) => {
        console.warn('[onboarding:action] Activity log failed (non-fatal):', e);
    });

    revalidatePath('/');
    revalidatePath('/onboarding');
    revalidatePath('/dashboard');

    console.log('[onboarding:action] ✔ saveOnboardingProfile complete');
    return { success: true };
}
