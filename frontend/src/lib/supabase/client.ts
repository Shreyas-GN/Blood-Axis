import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Simple in-browser mock store
const mockStore: {
  profiles: any[];
  blood_requests: any[];
  donor_responses: any[];
} = {
  profiles: [
    {
      id: "mock_user_123",
      full_name: "Mock Local User",
      phone: "+919999999999",
      blood_group: "O+",
      is_donor: true,
      is_available_donor: true,
      city: "Bangalore",
      profile_completed: true,
      location: "POINT(77.5946 12.9716)",
      latitude: 12.9716,
      longitude: 77.5946,
      created_at: new Date().toISOString()
    }
  ],
  blood_requests: [
    {
      id: "mock-request-1",
      requester_id: "mock_user_123",
      blood_group: "O-",
      units: 2,
      patient_name: "Emergency Patient",
      hospital_name: "City Hospital",
      city: "Bangalore",
      contact_phone: "+918888888888",
      urgency_level: "IMMEDIATE",
      location: "POINT(77.5946 12.9716)",
      latitude: 12.9716,
      longitude: 77.5946,
      status: "searching",
      created_at: new Date().toISOString()
    }
  ],
  donor_responses: []
};

class MockSupabaseClient {
  auth = {
    signUp: () => Promise.resolve({ data: { user: { id: "mock_user_123" }, session: {} }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: { id: "mock_user_123" }, session: {} }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getUser: () => Promise.resolve({ data: { user: { id: "mock_user_123" } }, error: null }),
    getSession: () => Promise.resolve({ data: { session: {} }, error: null })
  };

  channel() {
    return {
      on: () => this.channel(),
      subscribe: () => ({ unsubscribe: () => {} })
    };
  }

  removeChannel() {}

  rpc(fnName: string, _args?: any) {
    if (fnName === 'find_nearby_donors_v2') {
      return Promise.resolve({
        data: [
          { id: "mock_user_123", full_name: "Mock Local User", phone: "+919999999999", blood_group: "O+", distance_meters: 1500 }
        ],
        error: null
      });
    }
    return Promise.resolve({ data: null, error: null });
  }

  from(table: keyof typeof mockStore) {
    const list = mockStore[table] || [];

    const queryBuilder = {
      select: () => queryBuilder,
      order: () => queryBuilder,
      eq: (col: string, val: any) => {
        const filtered = list.filter(item => item[col] === val);
        return {
          single: () => Promise.resolve({ data: filtered[0] || null, error: null }),
          then: (resolve: any) => resolve({ data: filtered, error: null }),
          eq: (col2: string, val2: any) => Promise.resolve({ data: filtered.filter(item => item[col2] === val2), error: null })
        };
      },
      insert: (data: any) => {
        const newItem = { id: Math.random().toString(), created_at: new Date().toISOString(), ...data };
        list.push(newItem);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: newItem, error: null })
          })
        };
      },
      upsert: (data: any) => {
        const existingIdx = list.findIndex(item => item.id === data.id);
        if (existingIdx > -1) {
          list[existingIdx] = { ...list[existingIdx], ...data };
        } else {
          list.push(data);
        }
        return {
          select: () => ({
            single: () => Promise.resolve({ data, error: null })
          })
        };
      },
      update: (data: any) => {
        return {
          eq: (col: string, val: any) => {
            list.forEach(item => {
              if (item[col] === val) {
                Object.assign(item, data);
              }
            });
            return {
              select: () => ({
                single: () => Promise.resolve({ data: list.find(item => item[col] === val), error: null })
              })
            };
          }
        };
      },
      then: (resolve: any) => {
        resolve({ data: list, error: null });
      }
    };
    return queryBuilder;
  }
}

// If pointing to local PG port 5432 directly, use mock wrapper to prevent connection reset error
const isMockMode = !supabaseUrl || 
                   supabaseUrl === "undefined" || 
                   supabaseUrl === "" || 
                   supabaseUrl.includes(":5432") || 
                   supabaseUrl.includes("localhost") || 
                   supabaseUrl.includes("127.0.0.1") ||
                   !supabaseUrl.startsWith("http");


export const supabaseClient = isMockMode 
  ? (new MockSupabaseClient() as any)
  : createClient<Database>(supabaseUrl, supabaseAnonKey);

export function createClerkSupabaseClient(clerkToken: string) {
  if (isMockMode) return new MockSupabaseClient() as any;
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`
      }
    }
  });
}
