"use server";

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
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
    console.log('[onboarding:action] ▶ saveOnboardingProfile called', { userId: 'resolving...' });

    const { userId, getToken } = await auth();
    console.log('[onboarding:action] Auth resolved → userId:', userId);
    if (!userId) throw new Error("Unauthorized");
    const token = await getToken();

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

    console.log('[onboarding:action] Attempting Django upsert for userId:', userId, profileData);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/profiles/upsert/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: userId, ...profileData })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[onboarding:action] ✖ Backend upsert failed:', errText);
        throw new Error(`Failed to save profile: ${errText}`);
    }

    console.log('[onboarding:action] ✔ Supabase upsert succeeded');

    try {
        console.log('[onboarding:action] Updating Clerk publicMetadata → onboardingComplete: true');
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: { onboardingComplete: true },
        });
        console.log('[onboarding:action] ✔ Clerk metadata updated');
    } catch (clerkError) {
        console.error('[onboarding:action] ✖ Clerk metadata update failed:', clerkError);
        throw new Error('Profile saved but session update failed. Please refresh and try again.');
    }

    // Bridge cookie: the browser's JWT won't have the new `onboardingComplete` claim
    // until Clerk re-issues it (up to 60 s). This cookie lets the middleware pass
    // the user through immediately, bridging that gap.
    const cookieStore = await cookies();
    cookieStore.set('onboarding_complete', '1', {
        maxAge: 300, // 5 minutes — well past the 60 s JWT TTL
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    });
    console.log('[onboarding:action] ✔ Bridge cookie set (onboarding_complete=1)');

    await ActivityService.log(userId, 'profile_completed', 'Completed donor profile setup.', null, supabaseServer as any).catch((e: unknown) => {
        console.warn('[onboarding:action] Activity log failed (non-fatal):', e);
    });

    revalidatePath('/');
    revalidatePath('/onboarding');
    revalidatePath('/dashboard');

    console.log('[onboarding:action] ✔ saveOnboardingProfile complete');
    return { success: true };
}
