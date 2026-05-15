import type {
  ApiResponse,
  AuthResponseDto,
  LoginDto,
  RegisterDto,
  UpdateUserDto,
} from '@vehicle-price-monitor/types';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getAccessToken } from './session';

/** Dev machine LAN hostname for API calls (Metro host is usually the same PC as the API). */
function resolveDevMachineHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0]?.trim();
    if (host) return host;
  }

  const dbg =
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (dbg) {
    const host = dbg.split(':')[0]?.trim();
    if (host) return host;
  }

  return null;
}

function isLoopbackApiUrl(url: string): boolean {
  const normalized = /^https?:\/\//i.test(url) ? url : `http://${url}`;
  try {
    const { hostname } = new URL(normalized);
    const h = hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  } catch {
    return false;
  }
}

function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '') ?? '';

  const physicalDevice = __DEV__ && Platform.OS !== 'web' && Device.isDevice;
  const envPointsToLoopback = Boolean(fromEnv && isLoopbackApiUrl(fromEnv));

  
  if (physicalDevice && envPointsToLoopback) {
    const host = resolveDevMachineHost();
    if (host) {
      return `http://${host}:3001`;
    }
    console.warn(
      '[api-client] Physical device + EXPO_PUBLIC_API_URL is localhost — API calls will fail. Set EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:3001 (ipconfig / ifconfig) or rely on Expo hostUri after removing that line from .env.',
    );
  } else if (fromEnv) {
    return fromEnv;
  }

  if (__DEV__ && Platform.OS !== 'web') {
    const host = resolveDevMachineHost();
    if (host) {
      return `http://${host}:3001`;
    }
  }

  if (__DEV__ && Platform.OS !== 'web') {
    console.warn(
      '[api-client] Set EXPO_PUBLIC_API_URL (e.g. http://YOUR_LAN_IP:3001) if login/API calls fail on a device.',
    );
  }

  return 'http://localhost:3001';
}

const API_BASE = resolveApiBase();

export interface MobileAlert {
  id: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LiveAlertMatch {
  id: string;
  source: string;
  title: string;
  url: string;
  price: number | null;
  location: string | null;
  year: number | null;
  mileage: number | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LiveAlertUpdate {
  alert: MobileAlert;
  totalMatches: number;
  latestMatchAt: string | null;
  matches: LiveAlertMatch[];
}

export interface MobileNotification {
  id: string;
  title: string;
  message: string;
  type: 'price_drop' | 'alert' | 'system';
  createdAt: string;
  listingUrl?: string;
  source?: string;
}

export interface MarketplaceListing {
  source: 'ikman' | 'riyasewana';
  sourceListingId: string;
  title: string;
  price: number | null;
  url: string;
  location: string | null;
  mileage: number | null;
  year: number | null;
  imageUrls: string[];
}

export interface MarketplaceSearchResult {
  query: string;
  data: MarketplaceListing[];
  bySource: {
    ikman: number;
    riyasewana: number;
  };
  errors: string[];
}

export interface AlertDemandPoint {
  date: string;
  listed: number;
  left: number;
  sold: number;
  newListings: number;
}

export interface AlertDemandSummary {
  alertId: string;
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  location: string | null;
  isActive: boolean;
  today: {
    listed: number;
    left: number;
    sold: number;
    newListings: number;
    lastScrapedAt: string | null;
  };
  monthTotals: {
    sold: number;
    newListings: number;
    averageLeft: number;
    averageListed: number;
  };
  series: AlertDemandPoint[];
}

export interface AlertDemandAnalyticsResponse {
  month: string;
  rangeStart: string;
  rangeEnd: string;
  combined: {
    activeAlerts: number;
    today: {
      listed: number;
      left: number;
      sold: number;
      newListings: number;
    };
    month: {
      sold: number;
      newListings: number;
      averageLeft: number;
      averageListed: number;
    };
    series: AlertDemandPoint[];
  };
  alerts: AlertDemandSummary[];
}

export interface ListingItem {
  id: string;
  title: string;
  source: string;
  sourceListingId: string;
  url: string;
  price: number | null;
  location: string | null;
  year: number | null;
  mileage: number | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListingResults {
  data: ListingItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NlpParseResult {
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = false,
): Promise<T> {
  const token = requiresAuth ? await getAccessToken() : null;
  if (requiresAuth && !token) {
    throw new Error('Please sign in to continue.');
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json?.error?.message || json?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return json as T;
}

function unwrapData<T>(value: unknown): T {
  if (
    value &&
    typeof value === 'object' &&
    'data' in (value as Record<string, unknown>)
  ) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export const apiClient = {
  auth: {
    login: (data: LoginDto) =>
      request<ApiResponse<AuthResponseDto>>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    register: (data: RegisterDto) =>
      request<ApiResponse<AuthResponseDto>>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () =>
      request<ApiResponse<AuthResponseDto['user']>>('/api/v1/auth/me', {}, true),
    logout: () =>
      request<ApiResponse<void>>(
        '/api/v1/auth/logout',
        { method: 'POST' },
        true,
      ),
  },
  users: {
    profile: () =>
      request<ApiResponse<AuthResponseDto['user']>>('/api/v1/users/profile', {}, true),
    updateProfile: (data: UpdateUserDto) =>
      request<ApiResponse<AuthResponseDto['user']>>(
        '/api/v1/users/profile',
        { method: 'PATCH', body: JSON.stringify(data) },
        true,
      ),
  },
  listings: {
    searchMarketplaces: (query: string, limit = 24) =>
      request<ApiResponse<MarketplaceSearchResult>>(
        `/api/v1/listings/search/marketplaces?query=${encodeURIComponent(query)}&limit=${limit}`,
      ),
    list: (params?: Record<string, string | number | undefined>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
          }
        });
      }
      const queryString = searchParams.toString();
      return request<ApiResponse<ListingResults>>(
        `/api/v1/listings${queryString ? `?${queryString}` : ''}`,
      );
    },
    get: (id: string) => request<ApiResponse<ListingItem>>(`/api/v1/listings/${id}`),
  },
  alerts: {
    list: async () => {
      const response = await request<MobileAlert[] | ApiResponse<MobileAlert[]>>(
        '/api/v1/alerts',
      );
      return unwrapData<MobileAlert[]>(response);
    },
    create: (payload: {
      keyword?: string;
      minYear?: number;
      maxPrice?: number;
      maxMileage?: number;
      location?: string;
    }) =>
      request<MobileAlert>('/api/v1/alerts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deactivate: (id: string) =>
      request<MobileAlert>(`/api/v1/alerts/${id}`, { method: 'DELETE' }),
    parseNlp: (text: string) =>
      request<NlpParseResult>('/api/v1/alerts/nlp', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    createFromDescription: (text: string) =>
      request<MobileAlert>('/api/v1/alerts/from-description', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    notifications: async (limit = 40) => {
      const response = await request<
        MobileNotification[] | ApiResponse<MobileNotification[]>
      >(
        `/api/v1/alerts/notifications?all=true&limit=${limit}`,
      );
      return unwrapData<MobileNotification[]>(response);
    },
    liveUpdates: async () => {
      const response = await request<LiveAlertUpdate[] | ApiResponse<LiveAlertUpdate[]>>(
        '/api/v1/alerts/live-updates?all=true',
        {},
        true,
      );
      return unwrapData<LiveAlertUpdate[]>(response);
    },
  },
  analytics: {
    alertDemand: async (month?: string) => {
      const response = await request<
        ApiResponse<AlertDemandAnalyticsResponse> | AlertDemandAnalyticsResponse
      >(`/api/v1/analytics/alert-demand${month ? `?month=${month}` : ''}`);
      return unwrapData<AlertDemandAnalyticsResponse>(response);
    },
  },
};
