import { Platform } from 'react-native';
import type { ApiError } from '../types';
import { getConfig } from '../utils/config';

const config = getConfig();

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': `RemittanceApp/${config.APP_VERSION} (${Platform.OS})`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        error: data.error || 'API Error',
        message: data.message || 'An error occurred',
        details: data.details,
        statusCode: response.status,
        timestamp: data.timestamp,
      };
      
      throw error;
    }

    return data;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api/v1${endpoint}`;
    
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    // Create AbortController for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw {
            error: 'Network timeout',
            message: 'Request timed out. Please check your connection.',
            statusCode: 408,
          } as ApiError;
        }
        
        if (error.message === 'Network request failed') {
          throw {
            error: 'Network error',
            message: 'Unable to connect to server. Please check your internet connection.',
            statusCode: 0,
          } as ApiError;
        }
      }
      
      throw error;
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  // Set authorization header for authenticated requests
  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders.Authorization = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders.Authorization;
    }
  }
}

export const apiClient = new ApiClient(config.API_URL);