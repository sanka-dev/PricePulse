export enum AlertType {
  PRICE_DROP = 'PRICE_DROP',
  PRICE_THRESHOLD = 'PRICE_THRESHOLD',
  NEW_LISTING = 'NEW_LISTING',
  PRICE_CHANGE = 'PRICE_CHANGE',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  TRIGGERED = 'TRIGGERED',
  EXPIRED = 'EXPIRED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}
