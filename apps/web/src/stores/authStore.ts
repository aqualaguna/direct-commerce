// Consolidate on Zustand only

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: any[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  checkAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: (token: string, user: User) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
        });
      },

      logout: () => {
        // Clear localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Clear cookie (for middleware)
        if (typeof document !== 'undefined') {
          document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: () => {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            
            // Set cookie if it doesn't exist (for middleware to access)
            if (typeof document !== 'undefined') {
              const cookieExists = document.cookie.split(';').some(c => c.trim().startsWith('authToken='));
              if (!cookieExists) {
                const expires = new Date();
                expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
                document.cookie = `authToken=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
              }
            }
            
            set({
              user,
              token,
              isAuthenticated: true,
            });
          } catch (error) {
            // Invalid user data, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            if (typeof document !== 'undefined') {
              document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to check if user has specific permission
export const hasPermission = (permission: string): boolean => {
  const user = useAuthStore.getState().user;
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

// Helper function to check if user has specific role
export const hasRole = (role: string): boolean => {
  const user = useAuthStore.getState().user;
  return user?.role === role;
};

