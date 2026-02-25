import {
  AlertType,
  AlertStatus,
  NotificationChannel,
} from '../../enums';
import { AlertSearchCriteria } from '../../entities';

export interface CreateAlertDto {
  vehicleId?: string;
  type: AlertType;
  name: string;
  
  targetPrice?: number;
  priceDropPercent?: number;
  
  searchCriteria?: AlertSearchCriteria;
  
  notificationChannels: NotificationChannel[];
  expiresAt?: string;
}

export interface UpdateAlertDto {
  name?: string;
  status?: AlertStatus;
  
  targetPrice?: number;
  priceDropPercent?: number;
  
  searchCriteria?: AlertSearchCriteria;
  
  notificationChannels?: NotificationChannel[];
  expiresAt?: string;
}

export interface AlertResponseDto {
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
  lastTriggeredAt?: string;
  expiresAt?: string;
  
  // Joined data
  vehicle?: {
    id: string;
    title: string;
    currentPrice: number;
    imageUrl?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface AlertQueryDto {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  type?: AlertType;
  vehicleId?: string;
}

export interface AlertNotificationResponseDto {
  id: string;
  alertId: string;
  userId: string;
  vehicleId?: string;
  
  title: string;
  message: string;
  channel: NotificationChannel;
  
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}
