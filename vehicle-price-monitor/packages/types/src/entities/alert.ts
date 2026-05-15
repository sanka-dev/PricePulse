import { AlertType, AlertStatus, NotificationChannel } from '../enums';

export interface Alert {
  id: string;
  userId: string;
  vehicleId?: string;
  
  
  type: AlertType;
  status: AlertStatus;
  name: string;
  
  
  targetPrice?: number;
  priceDropPercent?: number;
  
  
  searchCriteria?: AlertSearchCriteria;
  
  
  notificationChannels: NotificationChannel[];
  
  
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
