import type {
  ApiResponse,
  PaginatedResponse,
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  VehicleResponseDto,
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleQueryDto,
  AlertResponseDto,
  CreateAlertDto,
  UpdateAlertDto,
  AlertQueryDto,
  PriceHistoryResponseDto,
  PriceStatsDto,
  ENDPOINTS,
} from '@vehicle-price-monitor/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  auth = {
    login: (data: LoginDto) =>
      this.request<ApiResponse<AuthResponseDto>>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    register: (data: RegisterDto) =>
      this.request<ApiResponse<AuthResponseDto>>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () =>
      this.request<ApiResponse<AuthResponseDto['user']>>('/api/v1/auth/me'),

    logout: () =>
      this.request<ApiResponse<void>>('/api/v1/auth/logout', {
        method: 'POST',
      }),
  };

  // Vehicles
  vehicles = {
    list: (query?: VehicleQueryDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const queryString = params.toString();
      return this.request<PaginatedResponse<VehicleResponseDto>>(
        `/api/v1/vehicles${queryString ? `?${queryString}` : ''}`
      );
    },

    get: (id: string) =>
      this.request<ApiResponse<VehicleResponseDto>>(`/api/v1/vehicles/${id}`),

    create: (data: CreateVehicleDto) =>
      this.request<ApiResponse<VehicleResponseDto>>('/api/v1/vehicles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateVehicleDto) =>
      this.request<ApiResponse<VehicleResponseDto>>(`/api/v1/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<ApiResponse<void>>(`/api/v1/vehicles/${id}`, {
        method: 'DELETE',
      }),
  };

  // Prices
  prices = {
    history: (vehicleId: string) =>
      this.request<ApiResponse<PriceHistoryResponseDto>>(
        `/api/v1/prices/vehicle/${vehicleId}`
      ),

    stats: () => this.request<ApiResponse<PriceStatsDto>>('/api/v1/prices/stats'),
  };

  // Alerts
  alerts = {
    list: (query?: AlertQueryDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const queryString = params.toString();
      return this.request<PaginatedResponse<AlertResponseDto>>(
        `/api/v1/alerts${queryString ? `?${queryString}` : ''}`
      );
    },

    get: (id: string) =>
      this.request<ApiResponse<AlertResponseDto>>(`/api/v1/alerts/${id}`),

    create: (data: CreateAlertDto) =>
      this.request<ApiResponse<AlertResponseDto>>('/api/v1/alerts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateAlertDto) =>
      this.request<ApiResponse<AlertResponseDto>>(`/api/v1/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<ApiResponse<void>>(`/api/v1/alerts/${id}`, {
        method: 'DELETE',
      }),
  };
}

export const apiClient = new ApiClient();
