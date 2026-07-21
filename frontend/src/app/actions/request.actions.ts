"use server";

import { supabaseServer } from "@/lib/supabase/server";

export async function getActiveRequestsAction() {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from('blood_requests')
        .select(`
            *,
            donor_responses (
                *,
                profiles (full_name, phone, blood_group)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch active requests: ${error.message}`);
    return data;
}

export async function getRequestByIdAction(requestId: string) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (error) throw new Error(`Failed to fetch request: ${error.message}`);
    return data;
}

export async function updateRequestAction(requestId: string, updateData: any) {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    // Enforce that only the requester can update it
    const { data: requestCheck } = await supabase
        .from('blood_requests')
        .select('requester_id')
        .eq('id', requestId)
        .single();

    if (requestCheck?.requester_id !== user.id) {
        throw new Error("Unauthorized: You can only update your own requests.");
    }

    const { data, error } = await supabase
        .from('blood_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

    if (error) throw new Error(`Failed to update request: ${error.message}`);
    return data;
}

export async function getUserRequestsAction() {
    const supabase = await supabaseServer;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from('blood_requests')
        .select(`
            *,
            donor_responses (
                *,
                profiles (full_name, phone, blood_group)
            )
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch user requests: ${error.message}`);
    return data;
}
