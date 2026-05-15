import {
  VehicleType,
  VehicleCondition,
  FuelType,
  TransmissionType,
} from '../enums';

export interface Vehicle {
  id: string;
  userId: string;
  
  
  title: string;
  make: string;
  model: string;
  year: number;
  
  
  type: VehicleType;
  condition: VehicleCondition;
  
  
  mileage?: number;
  fuelType?: FuelType;
  transmission?: TransmissionType;
  engineSize?: string;
  color?: string;
  
 
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  
  
  sourceUrl: string;
  sourceName: string;
  externalId?: string;
  
  
  imageUrl?: string;
  images?: string[];
  
  
  description?: string;
  location?: string;
  isActive: boolean;
  lastScrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
