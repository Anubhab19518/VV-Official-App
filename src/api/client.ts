import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const REFRESH_TOKEN_KEY = 'vv_official_refresh_token';
const CUSTOM_SERVER_URL_KEY = 'vv_custom_server_url';

// In-memory access token & custom URL state
let currentAccessToken: string | null = null;
let customServerUrl: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

// Initialize custom URL from storage if previously saved
(async () => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        customServerUrl = window.localStorage.getItem(CUSTOM_SERVER_URL_KEY);
      }
    } else {
      customServerUrl = await SecureStore.getItemAsync(CUSTOM_SERVER_URL_KEY);
    }
  } catch {
    // ignore
  }
})();

/**
 * Automatically detects the machine's local IP address from Expo Constants.
 * Works on physical devices connected to Expo bundler over Wi-Fi without hardcoding.
 */
export const getAutoDetectedHost = (): string => {
  // 1. Check Expo hostUri (available when connected to Metro bundler on LAN)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Web browser: use the current hostname
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return hostname;
    }
  }

  // 3. Android Emulator loopback fallback if not on a physical device
  if (Platform.OS === 'android' && !Device.isDevice) {
    return '10.0.2.2';
  }

  return 'localhost';
};

/**
 * Resolves the active base URL in order of priority:
 * 1. User custom override (e.g. from in-app settings gear)
 * 2. Environment variable EXPO_PUBLIC_API_URL
 * 3. Automatically detected LAN host from Expo Metro bundler
 */
export const getApiBaseUrl = (): string => {
  if (customServerUrl && customServerUrl.trim()) {
    return customServerUrl.trim().replace(/\/+$/, '');
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }

  const detectedHost = getAutoDetectedHost();
  return `http://${detectedHost}:3000`;
};

export const setCustomApiBaseUrl = async (url: string | null): Promise<void> => {
  customServerUrl = url ? url.trim().replace(/\/+$/, '') : null;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (customServerUrl) {
          window.localStorage.setItem(CUSTOM_SERVER_URL_KEY, customServerUrl);
        } else {
          window.localStorage.removeItem(CUSTOM_SERVER_URL_KEY);
        }
      }
    } else {
      if (customServerUrl) {
        await SecureStore.setItemAsync(CUSTOM_SERVER_URL_KEY, customServerUrl);
      } else {
        await SecureStore.deleteItemAsync(CUSTOM_SERVER_URL_KEY);
      }
    }
  } catch (err) {
    console.warn('Could not persist custom server URL:', err);
  }
};

export const testServerConnection = async (targetUrl?: string): Promise<{ ok: boolean; message: string }> => {
  const base = (targetUrl || getApiBaseUrl()).replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base}/api/v1/officials/sports/registry`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      return { ok: true, message: `Connected to ${base}` };
    }
    return { ok: false, message: `Server responded with HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || `Could not connect to ${base}` };
  }
};

export const tokenStorage = {
  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(REFRESH_TOKEN_KEY);
        }
        return null;
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
        }
      } else {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to persist refresh token:', e);
    }
  },

  async clearRefreshToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to clear refresh token:', e);
    }
  },
};

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return currentAccessToken;
};

const onTokenRefreshed = (newToken: string | null) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

const subscribeTokenRefresh = (callback: (newToken: string | null) => void) => {
  refreshSubscribers.push(callback);
};

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && currentAccessToken) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err: any) {
    throw new ApiError(
      `Network error: Could not reach server at ${baseUrl}. Ensure backend is running and phone is on same Wi-Fi.`,
      0,
      { originalError: err?.message, baseUrl }
    );
  }

  // Handle 401 Unauthorized for token refresh
  if (response.status === 401 && !options.skipAuth && !endpoint.includes('/auth/')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const storedRefreshToken = await tokenStorage.getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!refreshRes.ok) {
          throw new Error('Failed to refresh token');
        }

        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData?.data?.accessToken || refreshData?.data?.token;
        const newRefreshToken = refreshData?.data?.refreshToken;

        if (newAccessToken) {
          setAccessToken(newAccessToken);
          if (newRefreshToken) {
            await tokenStorage.setRefreshToken(newRefreshToken);
          }
          isRefreshing = false;
          onTokenRefreshed(newAccessToken);
        } else {
          throw new Error('Malformed token refresh response');
        }
      } catch {
        isRefreshing = false;
        setAccessToken(null);
        await tokenStorage.clearRefreshToken();
        onTokenRefreshed(null);
        throw new ApiError('Session expired. Please log in again.', 401);
      }
    }

    // Wait for the refreshing process to complete
    const retryToken = await new Promise<string | null>((resolve) => {
      subscribeTokenRefresh((token) => resolve(token));
    });

    if (retryToken) {
      headers.set('Authorization', `Bearer ${retryToken}`);
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const errJson = await retryResponse.json().catch(() => ({}));
        throw new ApiError(errJson?.message || 'Request failed', retryResponse.status, errJson);
      }
      return await retryResponse.json();
    } else {
      throw new ApiError('Session expired. Please log in again.', 401);
    }
  }

  let responseData: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json().catch(() => null);
  } else {
    responseData = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const errorMsg =
      responseData?.message ||
      responseData?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, responseData);
  }

  return responseData as T;
}
