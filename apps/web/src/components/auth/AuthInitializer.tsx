import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Component to initialize authentication state on page load
 * Calls checkAuth to restore auth state from localStorage and set cookies
 */
const AuthInitializer: React.FC = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // Initialize auth state on mount
    checkAuth();
  }, [checkAuth]);

  // This component doesn't render anything
  return null;
};

export default AuthInitializer;

