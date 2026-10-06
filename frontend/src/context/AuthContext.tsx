"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { toProfileArgs } from "@/lib/convex-adapters";
import type { User } from "@/types";

interface AuthContextValue {
    user: { id: string; email: string | null; user_metadata: { full_name?: string; avatar_url?: string } } | null;
    profile: User | null;
    isLoading: boolean;
    refetch: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { isLoading: sessionLoading, isAuthenticated } = useConvexAuth();
    const { signOut } = useAuthActions();
    const me = useQuery(api.users.me);
    const update = useMutation(api.users.update);

    const updateProfile = useCallback(
        async (data: Partial<User>) => {
            await update(toProfileArgs(data as Record<string, any>));
        },
        [update],
    );

    const value = useMemo<AuthContextValue>(() => {
        const profile = (isAuthenticated ? me : null) as User | null | undefined;
        return {
            user: profile
                ? { id: profile.id, email: profile.email ?? null, user_metadata: { full_name: profile.full_name } }
                : null,
            profile: profile ?? null,
            isLoading: sessionLoading || (isAuthenticated && me === undefined),
            // Convex queries are live, so there is nothing to refetch.
            refetch: async () => {},
            updateProfile,
            signOut: async () => { await signOut(); },
        };
    }, [sessionLoading, isAuthenticated, me, updateProfile, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useProfile(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useProfile must be used within AuthProvider");
    return ctx;
}
