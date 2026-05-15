

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const ENDPOINTS = {
  
  AUTH: {
    LOGIN: `${API_PREFIX}/auth/login`,
    REGISTER: `${API_PREFIX}/auth/register`,
    REFRESH: `${API_PREFIX}/auth/refresh`,
    LOGOUT: `${API_PREFIX}/auth/logout`,
    ME: `${API_PREFIX}/auth/me`,
    CHANGE_PASSWORD: `${API_PREFIX}/auth/change-password`,
    FORGOT_PASSWORD: `${API_PREFIX}/auth/forgot-password`,
    RESET_PASSWORD: `${API_PREFIX}/auth/reset-password`,
  },
  
  
  USERS: {
    BASE: `${API_PREFIX}/users`,
    BY_ID: (id: string) => `${API_PREFIX}/users/${id}`,
    PROFILE: `${API_PREFIX}/users/profile`,
  },
  
  
  VEHICLES: {
    BASE: `${API_PREFIX}/vehicles`,
    BY_ID: (id: string) => `${API_PREFIX}/vehicles/${id}`,
    PRICES: (id: string) => `${API_PREFIX}/vehicles/${id}/prices`,
  },
  
  
  PRICES: {
    BASE: `${API_PREFIX}/prices`,
    BY_VEHICLE: (vehicleId: string) => `${API_PREFIX}/prices/vehicle/${vehicleId}`,
    STATS: `${API_PREFIX}/prices/stats`,
  },
  
  
  ALERTS: {
    BASE: `${API_PREFIX}/alerts`,
    BY_ID: (id: string) => `${API_PREFIX}/alerts/${id}`,
    NOTIFICATIONS: `${API_PREFIX}/alerts/notifications`,
    MARK_READ: (id: string) => `${API_PREFIX}/alerts/notifications/${id}/read`,
  },
} as const;
