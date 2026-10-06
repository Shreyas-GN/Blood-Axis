import { supabaseServer } from '@/lib/supabase/server';
import { DonorService } from './donor.service';
import { CooldownService } from './cooldown.service';
import { TelegramService } from './telegram.service';
import type { BloodRequest } from '@/types';

export class AlertEngineService {
  /**
   * Phase 1: Immediate proximity search (e.g., 5km)
   * Sends Push Notifications to matching available donors.
   */
  static async executePhase1(request: any, radiusKm: number = 5) {
    const { lat, lng } = this.extractLocation(request);
    if (!lat || !lng || !request.blood_group) {
        throw new Error(`Missing request location or blood group for Phase 1. Lat: ${lat}, Lng: ${lng}`);
    }

    const donors = await DonorService.getNearbyDonors(
        lat, 
        lng, 
        radiusKm, 
        request.blood_group as string,
        supabaseServer
    );

    if (!donors || donors.length === 0) {
        return { notified_count: 0 };
    }

    // Filter by cooldown
    const eligibleDonors = [];
    for (const donor of donors) {
        if (await CooldownService.isDonorEligible(donor.id)) {
            eligibleDonors.push(donor);
        }
    }

    if (eligibleDonors.length === 0) {
        return { notified_count: 0 };
    }

    const logs = eligibleDonors.map(donor => ({
        request_id: request.id as string,
        donor_id: donor.id,
        channel: 'PUSH' as const,
        status: 'SENT' as const,
        metadata: {
            title: 'Urgent: Blood Needed Nearby 🩸',
            body: `${request.units} units of ${request.blood_group} requested at ${request.hospital_name}`,
            isImmediate: request.urgency_level === 'IMMEDIATE',
            fcm_token: donor.fcm_token
        }
    }));

    // In a real app, you'd trigger the actual push notification send here via Firebase Admin
    try {
        const tokens = eligibleDonors.map(d => d.fcm_token).filter(Boolean);
        if (tokens.length > 0) {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/alerts/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens,
                    title: 'Urgent: Blood Needed Nearby 🩸',
                    body: `${request.units} units of ${request.blood_group} requested at ${request.hospital_name}`
                })
            });
        }
    } catch (e) {
        console.error("Push notification fetch failed", e);
    }
    
    // Log the notifications
    const { error } = await (supabaseServer as any)
        .from('notification_logs')
        .insert(logs);

    if (error) {
        console.error("Failed to insert notification logs", error);
    }

    // Insert in-app inbox notifications
    const inAppRows = eligibleDonors.map(donor => ({
        user_id: donor.id,
        request_id: request.id as string,
        title: 'Urgent: Blood Needed Nearby 🩸',
        message: `${request.units} units of ${request.blood_group} requested at ${request.hospital_name}`,
        type: 'emergency_request',
        status: 'unread',
    }));
    const { error: notifError } = await (supabaseServer as any)
        .from('notifications')
        .insert(inAppRows);
    if (notifError) {
        console.error("Failed to insert in-app notifications (phase 1)", notifError);
    }

    // Update request stats
    const newCount = (request.notified_count || 0) + donors.length;
    await (supabaseServer as any)
        .from('blood_requests')
        .update({ notified_count: newCount, escalation_phase: 1 })
        .eq('id', request.id);

    return { notified_count: donors.length };
  }

  /**
   * Phase 2: Expanded radius search (e.g., 15km)
   */
  static async executePhase2(request: any, radiusKm: number = 15) {
      const { lat, lng } = this.extractLocation(request);
      if (!lat || !lng || !request.blood_group) {
          throw new Error("Missing request location or blood group for Phase 2");
      }
      
      const donors = await DonorService.getNearbyDonors(
          lat, 
          lng, 
          radiusKm, 
          request.blood_group as string,
          supabaseServer
      );
      
      // Filter out those who already responded or were already notified in phase 1
      // For simplicity, we just fetch all and let deduplication happen or we filter via a query
      const { data: existingLogs } = await (supabaseServer as any)
          .from('notification_logs')
          .select('donor_id')
          .eq('request_id', request.id);
          
      const notifiedDonorIds = new Set(existingLogs?.map((l: any) => l.donor_id) || []);
      const potentialDonors = donors.filter((d: any) => !notifiedDonorIds.has(d.id));

      if (potentialDonors.length === 0) {
          return { notified_count: 0 };
      }

      // Filter by cooldown
      const eligibleDonors = [];
      for (const donor of potentialDonors) {
          if (await CooldownService.isDonorEligible(donor.id)) {
              eligibleDonors.push(donor);
          }
      }

      if (eligibleDonors.length === 0) {
          return { notified_count: 0 };
      }

      const logs = eligibleDonors.map((donor: any) => ({
          request_id: request.id as string,
          donor_id: donor.id,
          channel: 'PUSH' as const,
          status: 'SENT' as const,
          metadata: {
              title: 'Urgent: Expanded Search 🩸',
              body: `${request.units} units of ${request.blood_group} needed further away at ${request.hospital_name}`,
              isImmediate: request.urgency_level === 'IMMEDIATE',
              fcm_token: donor.fcm_token
          }
      }));

      await (supabaseServer as any).from('notification_logs').insert(logs);

      // Insert in-app inbox notifications
      const inAppRows2 = eligibleDonors.map((donor: any) => ({
          user_id: donor.id,
          request_id: request.id as string,
          title: 'Urgent: Expanded Search 🩸',
          message: `${request.units} units of ${request.blood_group} needed further away at ${request.hospital_name}`,
          type: 'emergency_request',
          status: 'unread',
      }));
      const { error: notifError2 } = await (supabaseServer as any)
          .from('notifications')
          .insert(inAppRows2);
      if (notifError2) {
          console.error("Failed to insert in-app notifications (phase 2)", notifError2);
      }

      // Trigger Push
      try {
          const tokens = eligibleDonors.map((d: any) => d.fcm_token).filter(Boolean);
          if (tokens.length > 0) {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/alerts/push`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      tokens,
                      title: 'Urgent: Expanded Search 🩸',
                      body: `${request.units} units of ${request.blood_group} needed further away at ${request.hospital_name}`
                  })
              });
          }
      } catch (e) {
          console.error("Phase 2 Push notification fetch failed", e);
      }

      const newCount = (request.notified_count || 0) + eligibleDonors.length;
      await (supabaseServer as any)
          .from('blood_requests')
          .update({ notified_count: newCount, escalation_phase: 2 })
          .eq('id', request.id);

      return { notified_count: eligibleDonors.length };
  }

  /**
   * Phase 3: Ultimate Fallback / SMS Trigger (e.g., 25km)
   */
  static async executePhase3(request: any, radiusKm: number = 25) {
        const { lat, lng } = this.extractLocation(request);
        if (!lat || !lng || !request.blood_group) {
            throw new Error("Missing request location or blood group for Phase 3");
        }
        
        const donors = await DonorService.getNearbyDonors(
            lat, 
            lng, 
            radiusKm, 
            request.blood_group as string,
            supabaseServer
        );
        
        // Phase 3 sends SMS to everyone in the radius who hasn't been sent an SMS yet.
        const { data: existingSmsLogs } = await (supabaseServer as any)
            .from('notification_logs')
            .select('donor_id')
            .eq('request_id', request.id)
            .eq('channel', 'SMS');
            
        const smsDonorIds = new Set(existingSmsLogs?.map((l: any) => l.donor_id) || []);
        const potentialDonors = donors.filter((d: any) => !smsDonorIds.has(d.id) && d.phone);

        if (potentialDonors.length === 0) {
            return { notified_count: 0 };
        }

        // Filter by cooldown
        const eligibleDonors = [];
        for (const donor of potentialDonors) {
            if (await CooldownService.isDonorEligible(donor.id)) {
                eligibleDonors.push(donor);
            }
        }

        if (eligibleDonors.length === 0) {
            return { notified_count: 0 };
        }

        const logs = eligibleDonors.map((donor: any) => ({
            request_id: request.id as string,
            donor_id: donor.id,
            channel: 'SMS' as const,
            status: 'SENT' as const,
            metadata: {
                phone: donor.phone
            }
        }));

        await (supabaseServer as any).from('notification_logs').insert(logs);

        // Insert in-app inbox notifications for phase 3 donors
        const inAppRows3 = eligibleDonors.map((donor: any) => ({
            user_id: donor.id,
            request_id: request.id as string,
            title: '🚨 Critical: Blood Urgently Needed',
            message: `${request.blood_group} blood critically needed at ${request.hospital_name}. Please respond immediately.`,
            type: 'emergency_request',
            status: 'unread',
        }));
        const { error: notifError3 } = await (supabaseServer as any)
            .from('notifications')
            .insert(inAppRows3);
        if (notifError3) {
            console.error("Failed to insert in-app notifications (phase 3)", notifError3);
        }

        // Trigger SMS
        try {
            for (const donor of eligibleDonors) {
                if (donor.phone) {
                    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/alerts/sms`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: donor.phone,
                            message: `URGENT: Blood required at ${request.hospital_name}. Respond on BloodRelay.`
                        })
                    });
                }
            }
        } catch (e) {
            console.error("Phase 3 SMS fetch failed", e);
        }

        // Notify Blood Banks
        const { data: bloodBanks } = await (supabaseServer as any).rpc('find_nearby_blood_banks', {
            req_lat: lat,
            req_lng: lng,
            radius_km: radiusKm
        });

        if (bloodBanks && bloodBanks.length > 0) {
            const bankLogs = bloodBanks.map((bank: any) => ({
                request_id: request.id as string,
                donor_id: null, // Null donor_id indicates a blood bank or external entity
                channel: 'SMS' as const,
                status: 'SENT' as const,
                metadata: {
                    type: 'BLOOD_BANK',
                    name: bank.name,
                    phone: bank.phone
                }
            }));
            await (supabaseServer as any).from('notification_logs').insert(bankLogs);
        }

        // Actual SMS sending logic would go here.

        const newCount = (request.notified_count || 0) + eligibleDonors.length + (bloodBanks?.length || 0);
        await (supabaseServer as any)
            .from('blood_requests')
            .update({ notified_count: newCount, escalation_phase: 3 })
            .eq('id', request.id);

        // Telegram Broadcast (Global Emergency)
        await TelegramService.sendMessage(
            `🚨 *URGENT BLOOD REQUEST* 🚨\n\n` +
            `*Patient:* ${request.patient_name}\n` +
            `*Group:* ${request.blood_group}\n` +
            `*Hospital:* ${request.hospital_name}\n` +
            `*Units:* ${request.units}\n` +
            `*Urgency:* ${request.urgency_level}\n\n` +
            `📍 [View on Map](${process.env.NEXT_PUBLIC_APP_URL}/request/${request.id})\n` +
            `📞 Contact: ${request.contact_phone}`
        );

        return { notified_count: eligibleDonors.length + (bloodBanks?.length || 0) };
  }

  private static extractLocation(request: any) {
    let lat = request.latitude;
    let lng = request.longitude;

    if (!lat || !lng) {
      // Try to parse from location string: POINT(lng lat)
      const loc = request.location;
      if (typeof loc === 'string' && loc.includes('POINT')) {
        const coords = loc.match(/POINT\((.+) (.+)\)/);
        if (coords) {
          lng = parseFloat(coords[1]);
          lat = parseFloat(coords[2]);
        }
      }
    }
    return { lat, lng };
  }
}
