import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// API client configuration
const API_BASE_URL = import.meta.env.PUBLIC_STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = import.meta.env.PUBLIC_STRAPI_API_TOKEN;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
  },
});

// Function to get auth token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to requests if available
    const authToken = getAuthToken();
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Transform Strapi response format
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data,
        meta: response.data.meta,
      };
    }
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized - clear auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Optionally redirect to login page
        // window.location.href = '/auth/login';
      }
      console.error('Unauthorized access');
    } else if (error.response?.status === 404) {
      // Handle not found
      console.error('Resource not found');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error occurred');
    }
    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// API methods
export const api = {
  // Generic GET request
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }),

  // Generic POST request
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data),

  // Generic PUT request
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data),

  // Generic PATCH request
  patch: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data),

  // Generic DELETE request
  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url),

  // Product-related endpoints
  products: {
    getAll: (params?: any) => api.get('/product-listings', params),
    getById: (id: string) => api.get(`/product-listings/${id}`),
    getBySlug: (slug: string) => api.get(`/product-listings?filters[slug][$eq]=${slug}`),
    getByCategory: (categoryId: string, params?: any) =>
      api.get(`/product-listings?filters[category][id][$eq]=${categoryId}`, params),
  },

  // Category-related endpoints
  categories: {
    getAll: (params?: any) => api.get('/categories', params),
    getById: (id: string) => api.get(`/categories/${id}`),
    getBySlug: (slug: string) => api.get(`/categories?filters[slug][$eq]=${slug}`),
  },

  // Authentication endpoints
  auth: {
    login: (identifier: string, password: string) => 
      api.post('/auth/local', { identifier, password }),
    register: (username: string, email: string, password: string) =>
      api.post('/auth/local/register', { username, email, password }),
    forgotPassword: (email: string) =>
      api.post('/auth/forgot-password', { email }),
    resetPassword: (code: string, password: string, passwordConfirmation: string) =>
      api.post('/auth/reset-password', { code, password, passwordConfirmation }),
    changePassword: (currentPassword: string, password: string, passwordConfirmation: string) =>
      api.post('/auth/change-password', { currentPassword, password, passwordConfirmation }),
  },

  // User-related endpoints
  users: {
    getProfile: () => api.get('/users/me'),
    updateProfile: (data: any) => api.put('/users/me', data),
  },

  // Profile endpoints
  profile: {
    getProfile: () => api.get('/profile/me'),
    updateProfile: (data: any) => api.put('/profile/me', { data }),
    getCompletion: () => api.get('/profile/me/completion'),
    uploadPicture: (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      return apiClient.post('/profile/me/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    deletePicture: () => api.delete('/profile/me/picture'),
  },

  // User preferences endpoints
  preferences: {
    getPreferences: () => api.get('/user-preferences/me'),
    updatePreferences: (data: any) => api.put('/user-preferences/me', { data }),
    getCategory: (category: string) => api.get(`/user-preferences/me/${category}`),
    updateCategory: (category: string, data: any) => {
      // Use PATCH for category updates as per test files
      return apiClient.patch(`/user-preferences/me/${category}`, { data });
    },
    reset: () => api.post('/user-preferences/me/reset'),
    export: () => api.get('/user-preferences/me/export'),
  },

  // Privacy settings endpoints
  privacy: {
    getPrivacySettings: () => api.get('/privacy-settings/me'),
    updatePrivacySettings: (data: any) => api.put('/privacy-settings/me', { data }),
    updateConsent: (consentData: any) => {
      // Use PATCH for consent updates as per test files
      return apiClient.patch('/privacy-settings/me/consent', { consentData });
    },
    getConsentHistory: () => api.get('/privacy-settings/me/consent-history'),
    reset: () => api.post('/privacy-settings/me/reset'),
    export: () => api.get('/privacy-settings/me/export'),
    requestDeletion: (data: any) => api.post('/privacy-settings/me/request-deletion', { data }),
  },

  // Order-related endpoints
  orders: {
    create: (data: any) => api.post('/orders', data),
    getById: (id: string) => api.get(`/orders/${id}`),
    getUserOrders: () => api.get('/orders?filters[user][id][$eq]=me'),
  },
};

export default apiClient;
