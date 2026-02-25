import {
  VehicleType,
  VehicleCondition,
  FuelType,
  TransmissionType,
} from '../../enums';

export interface CreateVehicleDto {
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
  currency?: string;
  
  sourceUrl: string;
  sourceName: string;
  externalId?: string;
  
  imageUrl?: string;
  images?: string[];
  
  description?: string;
  location?: string;
}

export interface UpdateVehicleDto {
  title?: string;
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  condition?: VehicleCondition;
  
  mileage?: number;
  fuelType?: FuelType;
  transmission?: TransmissionType;
  engineSize?: string;
  color?: string;
  
  currentPrice?: number;
  currency?: string;
  
  imageUrl?: string;
  images?: string[];
  
  description?: string;
  location?: string;
  isActive?: boolean;
}

export interface VehicleResponseDto {
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
  
  imageUrl?: string;
  images?: string[];
  
  description?: string;
  location?: string;
  isActive: boolean;
  
  priceChangePercent?: number;
  lastScrapedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  type?: VehicleType;
  condition?: VehicleCondition;
  location?: string;
  search?: string;
}
