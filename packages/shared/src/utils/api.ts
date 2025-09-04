// API Utilities
import { ApiResponse, ApiError } from '../types/api';

export const createApiResponse = <T>(
  data: T, 
  success: boolean = true, 
  message?: string
): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    data,
    success,
  };
  if (message) {
    response.message = message;
  }
  return response;
};

export const createApiError = (
  status: number,
  name: string,
  message: string,
  details?: any
): ApiError => {
  return {
    status,
    name,
    message,
    details,
  };
};

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    return {
      status: error.response.status,
      name: error.response.statusText,
      message: error.response.data?.message || 'An error occurred',
      details: error.response.data,
    };
  }
  
  return {
    status: 500,
    name: 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
  };
};
