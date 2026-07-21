export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enum type aliases (match PostgreSQL enum values exactly) ──────────────
export type BloodGroup            = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type RequestStatus         = 'searching' | 'donor_accepted' | 'fulfilled' | 'cancelled' | 'expired'
export type UrgencyLevel          = 'IMMEDIATE' | 'TODAY' | 'SCHEDULED'
export type DonorResponseStatus   = 'ACCEPTED' | 'CONFIRMED' | 'ARRIVED' | 'CANCELLED'
export type NotificationChannel   = 'PUSH' | 'SMS' | 'WHATSAPP'
export type NotificationLogStatus = 'SENT' | 'DELIVERED' | 'FAILED'
export type NotificationType      = 'emergency_request' | 'request_update' | 'system'
export type NotificationReadStatus = 'unread' | 'read'
export type ActivityEventType =
  | 'profile_completed'
  | 'availability_changed'
  | 'request_created'
  | 'notification_sent'
  | 'donor_accepted'
  | 'request_fulfilled'
  | 'request_cancelled'
  | 'request_expired'

export interface Database {
  public: {
    Views: Record<string, never>
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          blood_group: BloodGroup | null
          is_donor: boolean
          is_available_donor: boolean
          city: string | null
          profile_completed: boolean
          location: string | null
          latitude: number | null
          longitude: number | null
          age: number | null
          last_donation_date: string | null
          cooldown_until: string | null
          is_verified: boolean
          fcm_token: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          blood_group?: BloodGroup | null
          is_donor?: boolean
          is_available_donor?: boolean
          city?: string | null
          profile_completed?: boolean
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          age?: number | null
          last_donation_date?: string | null
          cooldown_until?: string | null
          is_verified?: boolean
          fcm_token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          blood_group?: BloodGroup | null
          is_donor?: boolean
          is_available_donor?: boolean
          city?: string | null
          profile_completed?: boolean
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          age?: number | null
          last_donation_date?: string | null
          cooldown_until?: string | null
          is_verified?: boolean
          fcm_token?: string | null
          created_at?: string
        }
        Relationships: []
      }

      blood_requests: {
        Row: {
          id: string
          requester_id: string
          blood_group: BloodGroup
          units: number
          patient_name: string | null
          hospital_name: string
          city: string | null
          contact_phone: string | null
          urgency_level: UrgencyLevel | null
          location: string | null
          latitude: number | null
          longitude: number | null
          status: RequestStatus
          escalation_phase: number
          notified_count: number
          confirmed_count: number
          donor_name: string | null
          donor_phone: string | null
          note: string | null
          requester_relation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          blood_group: BloodGroup
          units?: number
          patient_name?: string | null
          hospital_name: string
          city?: string | null
          contact_phone?: string | null
          urgency_level?: UrgencyLevel | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: RequestStatus
          escalation_phase?: number
          notified_count?: number
          confirmed_count?: number
          donor_name?: string | null
          donor_phone?: string | null
          note?: string | null
          requester_relation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          blood_group?: BloodGroup
          units?: number
          patient_name?: string | null
          hospital_name?: string
          city?: string | null
          contact_phone?: string | null
          urgency_level?: UrgencyLevel | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: RequestStatus
          escalation_phase?: number
          notified_count?: number
          confirmed_count?: number
          donor_name?: string | null
          donor_phone?: string | null
          note?: string | null
          requester_relation?: string | null
          created_at?: string
        }
        Relationships: []
      }

      donor_responses: {
        Row: {
          id: string
          request_id: string
          donor_id: string
          status: DonorResponseStatus
          distance_meters: number | null
          eta_minutes: number | null
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          donor_id: string
          status?: DonorResponseStatus
          distance_meters?: number | null
          eta_minutes?: number | null
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          donor_id?: string
          status?: DonorResponseStatus
          distance_meters?: number | null
          eta_minutes?: number | null
          responded_at?: string | null
          created_at?: string
        }
        Relationships: []
      }

      notification_logs: {
        Row: {
          id: string
          request_id: string
          donor_id: string | null
          channel: NotificationChannel
          status: NotificationLogStatus
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          donor_id?: string | null
          channel?: NotificationChannel
          status?: NotificationLogStatus
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          donor_id?: string | null
          channel?: NotificationChannel
          status?: NotificationLogStatus
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      notifications: {
        Row: {
          id: string
          user_id: string
          request_id: string | null
          title: string
          message: string
          type: NotificationType
          status: NotificationReadStatus
          sent_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          request_id?: string | null
          title: string
          message: string
          type?: NotificationType
          status?: NotificationReadStatus
          sent_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          request_id?: string | null
          title?: string
          message?: string
          type?: NotificationType
          status?: NotificationReadStatus
          sent_at?: string
          read_at?: string | null
        }
        Relationships: []
      }

      activities: {
        Row: {
          id: string
          user_id: string
          request_id: string | null
          event_type: ActivityEventType
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          request_id?: string | null
          event_type: ActivityEventType
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          request_id?: string | null
          event_type?: ActivityEventType
          description?: string
          created_at?: string
        }
        Relationships: []
      }

      blood_banks: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          phone: string | null
          latitude: number | null
          longitude: number | null
          location: string | null
          operating_hours: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          phone?: string | null
          latitude?: number | null
          longitude?: number | null
          location?: string | null
          operating_hours?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          phone?: string | null
          latitude?: number | null
          longitude?: number | null
          location?: string | null
          operating_hours?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }

    Functions: {
      find_nearby_donors: {
        Args: {
          lat: number
          lng: number
          radius_km: number
        }
        Returns: {
          id: string
          full_name: string
          phone: string | null
          blood_group: BloodGroup
          distance_meters: number
        }[]
      }
      find_nearby_donors_v2: {
        Args: {
          req_lat: number
          req_lng: number
          radius_km: number
          req_blood_group: string
        }
        Returns: {
          id: string
          full_name: string
          phone: string | null
          blood_group: BloodGroup
          fcm_token: string | null
          distance_meters: number
        }[]
      }
      find_nearby_blood_banks: {
        Args: {
          req_lat: number
          req_lng: number
          radius_km: number
        }
        Returns: {
          id: string
          name: string
          phone: string | null
          distance_meters: number
        }[]
      }
      increment_confirmed_count: {
        Args: { req_id: string }
        Returns: void
      }
    }
  }
}
