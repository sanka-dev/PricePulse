import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleQueryDto,
  PaginatedResponse,
  VehicleResponseDto,
} from '@vehicle-price-monitor/types';

export interface VehicleRecord {
  id: string;
  user_id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  type: string;
  condition: string;
  current_price: number;
  original_price: number;
  currency: string;
  listing_url?: string;
  image_urls?: string[];
  description?: string;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  location?: string;
  is_active: boolean;
  last_scraped_at?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class VehiclesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, createVehicleDto: CreateVehicleDto): Promise<VehicleRecord> {
    const { data, error } = await this.supabase.from('vehicles').insert({
      user_id: userId,
      title: createVehicleDto.title,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      year: createVehicleDto.year,
      type: createVehicleDto.type || 'car',
      condition: createVehicleDto.condition || 'used',
      current_price: createVehicleDto.currentPrice,
      original_price: createVehicleDto.currentPrice,
      currency: createVehicleDto.currency || 'USD',
      listing_url: createVehicleDto.sourceUrl,
      image_urls: createVehicleDto.images || (createVehicleDto.imageUrl ? [createVehicleDto.imageUrl] : []),
      description: createVehicleDto.description,
      mileage: createVehicleDto.mileage,
      fuel_type: createVehicleDto.fuelType,
      transmission: createVehicleDto.transmission,
      location: createVehicleDto.location,
      is_active: true,
    }).select().single();

    if (error) {
      throw new Error(`Failed to create vehicle: ${error.message}`);
    }

    return data;
  }

  async findAll(
    userId: string,
    query: VehicleQueryDto,
  ): Promise<PaginatedResponse<VehicleResponseDto>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      make,
      model,
      yearMin,
      yearMax,
      priceMin,
      priceMax,
      type,
      condition,
      search,
    } = query;

    let queryBuilder = this.supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (make) {
      queryBuilder = queryBuilder.ilike('make', make);
    }
    if (model) {
      queryBuilder = queryBuilder.ilike('model', model);
    }
    if (yearMin) {
      queryBuilder = queryBuilder.gte('year', yearMin);
    }
    if (yearMax) {
      queryBuilder = queryBuilder.lte('year', yearMax);
    }
    if (priceMin) {
      queryBuilder = queryBuilder.gte('current_price', priceMin);
    }
    if (priceMax) {
      queryBuilder = queryBuilder.lte('current_price', priceMax);
    }
    if (type) {
      queryBuilder = queryBuilder.eq('type', type);
    }
    if (condition) {
      queryBuilder = queryBuilder.eq('condition', condition);
    }
    if (search) {
      queryBuilder = queryBuilder.or(`title.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
    }

    const sortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy;
    queryBuilder = queryBuilder
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: (data || []) as unknown as VehicleResponseDto[],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async findById(id: string, userId: string): Promise<VehicleRecord> {
    const { data, error } = await this.supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Vehicle not found');
    }

    return data;
  }

  async update(
    id: string,
    userId: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleRecord> {
    await this.findById(id, userId);

    const updateData: Record<string, unknown> = {};
    if (updateVehicleDto.title) updateData.title = updateVehicleDto.title;
    if (updateVehicleDto.make) updateData.make = updateVehicleDto.make;
    if (updateVehicleDto.model) updateData.model = updateVehicleDto.model;
    if (updateVehicleDto.year) updateData.year = updateVehicleDto.year;
    if (updateVehicleDto.currentPrice) updateData.current_price = updateVehicleDto.currentPrice;
    if (updateVehicleDto.description) updateData.description = updateVehicleDto.description;
    if (updateVehicleDto.mileage) updateData.mileage = updateVehicleDto.mileage;
    if (updateVehicleDto.isActive !== undefined) updateData.is_active = updateVehicleDto.isActive;

    const { data, error } = await this.supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update vehicle: ${error.message}`);
    }

    return data;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);

    const { error } = await this.supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete vehicle: ${error.message}`);
    }
  }

  async updatePrice(id: string, newPrice: number): Promise<VehicleRecord | null> {
    const { data, error } = await this.supabase
      .from('vehicles')
      .update({
        current_price: newPrice,
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return null;
    }

    return data;
  }
}
