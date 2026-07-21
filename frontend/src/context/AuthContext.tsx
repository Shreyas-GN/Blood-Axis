"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { getProfileAction, updateProfileAction } from "@/app/actions/donor.actions";
import type { User } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextValue {
    user: SupabaseUser | null;
    profile: User | null;
    isLoading: boolean;
    refetch: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (currentUser?: SupabaseUser | null) => {
        const u = currentUser !== undefined ? currentUser : user;
        if (!u?.id) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        try {
            const data = await getProfileAction();
            setProfile(data as any);
        } catch (error) {
            console.error("Failed to fetch profile", error);
            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (data: Partial<User>) => {
        if (!user?.id) return;
        try {
            await updateProfileAction(data as any);
            await fetchProfile(user);
        } catch (error) {
            console.error("Failed to update profile", error);
            throw error;
        }
    };

    useEffect(() => {
        // Initial fetch
        const initializeAuth = async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            await fetchProfile(currentUser);
        };
        
        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                await fetchProfile(currentUser);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user,
            profile, 
            isLoading, 
            refetch: () => fetchProfile(user),
            updateProfile 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useProfile(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useProfile must be used within AuthProvider");
    return ctx;
}
