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

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add loading state or other request logic here
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
      // Handle unauthorized
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

  // User-related endpoints
  users: {
    getProfile: () => api.get('/users/me'),
    updateProfile: (data: any) => api.put('/users/me', data),
  },

  // Order-related endpoints
  orders: {
    create: (data: any) => api.post('/orders', data),
    getById: (id: string) => api.get(`/orders/${id}`),
    getUserOrders: () => api.get('/orders?filters[user][id][$eq]=me'),
  },
};

export default apiClient;
