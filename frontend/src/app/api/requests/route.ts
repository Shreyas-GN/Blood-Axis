import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        // 1. Authenticate with Supabase
        const supabase = await supabaseServer();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        
        // Ensure requester_id is set
        const payload = {
            ...body,
            requester_id: user.id
        };

        // 2. Insert the request into Supabase directly
        const { data: requestRecord, error: insertError } = await supabase
            .from('blood_requests')
            .insert(payload)
            .select()
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return NextResponse.json(
                { error: insertError.message || 'Failed to save request' }, 
                { status: 500 }
            );
        }

        // 3. Trigger Matching Engine directly
        let matching_triggered = false;
        let matching_engine_response = null;

        if (requestRecord.latitude && requestRecord.longitude) {
            const MATCHING_ENGINE_URL = process.env.MATCHING_ENGINE_URL || 'http://matching-engine:9000';
            try {
                const matchResponse = await fetch(`${MATCHING_ENGINE_URL}/match-donors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        blood_group: requestRecord.blood_group,
                        latitude: requestRecord.latitude,
                        longitude: requestRecord.longitude,
                        hospital_name: requestRecord.hospital_name,
                        units_required: requestRecord.units,
                        request_id: requestRecord.id,
                    })
                });

                if (matchResponse.ok) {
                    matching_triggered = true;
                    matching_engine_response = await matchResponse.json();
                } else {
                    console.error('Matching engine returned error status:', matchResponse.status);
                }
            } catch (err) {
                console.error('Failed to trigger matching engine:', err);
            }
        }

        return NextResponse.json({ 
            success: true, 
            request: requestRecord,
            matching: matching_triggered 
        });

    } catch (error: any) {
        console.error('Frontend API Route error:', error);
        return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 });
    }
}
