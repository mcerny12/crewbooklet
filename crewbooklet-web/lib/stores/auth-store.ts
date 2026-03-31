/**
 * Authentication Store
 * Manages user authentication state
 */

import { create } from 'zustand';
import type { UserSession } from '@/lib/types/models';
import { UserRole, GUEST_SESSION } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  session: UserSession;
  isLoading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setSession: (session: UserSession) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: GUEST_SESSION,
  isLoading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const data = await SupabaseService.signIn(email, password);

      if (data.user && data.session) {
        // Get user role from database or metadata
        const role = (data.user.user_metadata?.role as UserRole) || UserRole.User;

        set({
          session: {
            userId: data.user.id,
            email: data.user.email || '',
            role,
            isAuthenticated: true,
          },
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sign in',
        isLoading: false
      });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await SupabaseService.signOut();
      set({ session: GUEST_SESSION, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
      throw error;
    }
  },

  initialize: async () => {
    try {
      set({ isLoading: true });

      const session = await SupabaseService.getCurrentSession();

      if (session?.user) {
        const role = (session.user.user_metadata?.role as UserRole) || UserRole.User;

        set({
          session: {
            userId: session.user.id,
            email: session.user.email || '',
            role,
            isAuthenticated: true,
          },
          isLoading: false,
        });
      } else {
        set({ session: GUEST_SESSION, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const role = (session.user.user_metadata?.role as UserRole) || UserRole.User;

          set({
            session: {
              userId: session.user.id,
              email: session.user.email || '',
              role,
              isAuthenticated: true,
            },
          });
        } else if (event === 'SIGNED_OUT') {
          set({ session: GUEST_SESSION });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ session: GUEST_SESSION, isLoading: false });
    }
  },

  setSession: (session: UserSession) => {
    set({ session });
  },
}));
