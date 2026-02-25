import {
  VehicleType,
  VehicleCondition,
  FuelType,
  TransmissionType,
} from '../enums';

export interface Vehicle {
  id: string;
  userId: string;
  
  // Basic info
  title: string;
  make: string;
  model: string;
  year: number;
  
  // Classification
  type: VehicleType;
  condition: VehicleCondition;
  
  // Specs
  mileage?: number;
  fuelType?: FuelType;
  transmission?: TransmissionType;
  engineSize?: string;
  color?: string;
  
  // Pricing
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  
  // Source
  sourceUrl: string;
  sourceName: string;
  externalId?: string;
  
  // Media
  imageUrl?: string;
  images?: string[];
  
  // Metadata
  description?: string;
  location?: string;
  isActive: boolean;
  lastScrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
