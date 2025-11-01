import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

interface LoginFormProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface LoginData {
  identifier: string;
  password: string;
}

interface AuthResponse {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    permissions: any[];
  };
}

export default function LoginForm({ onSuccess, onError, className = '' }: LoginFormProps) {
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState<LoginData>({
    identifier: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [callbackUrl, setCallbackUrl] = useState<string>('/');

  // Read callback query parameter from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get('callback');
      if (callback) {
        setCallbackUrl(callback);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      // Store JWT token in localStorage
      localStorage.setItem('authToken', data.jwt);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Set cookie for middleware to access (server-side)
      // Cookie expires in 7 days
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `authToken=${data.jwt}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

      // Update auth store
      login(data.jwt, data.user);

      // Call success callback
      onSuccess?.(data.user);

      // Reset form
      setFormData({ identifier: '', password: '' });

      // Redirect to callback URL or root
      window.location.href = callbackUrl;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
          Email or Username
        </label>
        <input
          type="text"
          id="identifier"
          name="identifier"
          value={formData.identifier}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter your email or username"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter your password"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="default"
        size="lg"
        className="w-full bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 shadow-soft hover:shadow-medium"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <a href="/auth/register" className="text-primary-600 hover:text-primary-500 font-medium">
          Sign up here
        </a>
      </div>
    </form>
  );
}
