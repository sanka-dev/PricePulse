import { AlertType, AlertStatus, NotificationChannel } from '../enums';

export interface Alert {
  id: string;
  userId: string;
  vehicleId?: string;
  
  // Alert configuration
  type: AlertType;
  status: AlertStatus;
  name: string;
  
  // Conditions
  targetPrice?: number;
  priceDropPercent?: number;
  
  // Search criteria (for NEW_LISTING alerts)
  searchCriteria?: AlertSearchCriteria;
  
  // Notification settings
  notificationChannels: NotificationChannel[];
  
  // Tracking
  triggeredCount: number;
  lastTriggeredAt?: Date;
  expiresAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertSearchCriteria {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  userId: string;
  vehicleId?: string;
  
  title: string;
  message: string;
  channel: NotificationChannel;
  
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
}
