import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import {
  CreateAlertDto,
  UpdateAlertDto,
  AlertQueryDto,
  PaginatedResponse,
  AlertResponseDto,
} from '@vehicle-price-monitor/types';

export interface AlertRecord {
  id: string;
  user_id: string;
  vehicle_id?: string;
  type: string;
  status: string;
  name: string;
  target_price?: number;
  price_drop_percent?: number;
  search_criteria?: Record<string, unknown>;
  notification_channels: string[];
  triggered_count: number;
  last_triggered_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    title: string;
    current_price: number;
    image_urls?: string[];
  };
}

@Injectable()
export class AlertsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, createAlertDto: CreateAlertDto): Promise<AlertRecord> {
    const { data, error } = await this.supabase.from('alerts').insert({
      user_id: userId,
      vehicle_id: createAlertDto.vehicleId,
      type: createAlertDto.type,
      status: 'active',
      name: createAlertDto.name,
      target_price: createAlertDto.targetPrice,
      price_drop_percent: createAlertDto.priceDropPercent,
      search_criteria: createAlertDto.searchCriteria,
      notification_channels: createAlertDto.notificationChannels || ['email'],
      triggered_count: 0,
      expires_at: createAlertDto.expiresAt,
    }).select().single();

    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`);
    }

    return data;
  }

  async findAll(
    userId: string,
    query: AlertQueryDto,
  ): Promise<PaginatedResponse<AlertResponseDto>> {
    const { page = 1, limit = 10, status, type, vehicleId } = query;

    let queryBuilder = this.supabase
      .from('alerts')
      .select('*, vehicle:vehicles(id, title, current_price, image_urls)', { count: 'exact' })
      .eq('user_id', userId);

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }
    if (type) {
      queryBuilder = queryBuilder.eq('type', type);
    }
    if (vehicleId) {
      queryBuilder = queryBuilder.eq('vehicle_id', vehicleId);
    }

    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: (data || []).map((alert) => this.toResponseDto(alert)),
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

  async findById(id: string, userId: string): Promise<AlertRecord> {
    const { data, error } = await this.supabase
      .from('alerts')
      .select('*, vehicle:vehicles(id, title, current_price, image_urls)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Alert not found');
    }

    return data;
  }

  async update(
    id: string,
    userId: string,
    updateAlertDto: UpdateAlertDto,
  ): Promise<AlertRecord> {
    await this.findById(id, userId);

    const updateData: Record<string, unknown> = {};
    if (updateAlertDto.name) updateData.name = updateAlertDto.name;
    if (updateAlertDto.status) updateData.status = updateAlertDto.status;
    if (updateAlertDto.targetPrice !== undefined) updateData.target_price = updateAlertDto.targetPrice;
    if (updateAlertDto.priceDropPercent !== undefined) updateData.price_drop_percent = updateAlertDto.priceDropPercent;
    if (updateAlertDto.notificationChannels) updateData.notification_channels = updateAlertDto.notificationChannels;
    if (updateAlertDto.expiresAt) updateData.expires_at = updateAlertDto.expiresAt;

    const { data, error } = await this.supabase
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, vehicle:vehicles(id, title, current_price, image_urls)')
      .single();

    if (error) {
      throw new Error(`Failed to update alert: ${error.message}`);
    }

    return data;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);

    const { error } = await this.supabase
      .from('alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete alert: ${error.message}`);
    }
  }

  private toResponseDto(alert: AlertRecord): AlertResponseDto {
    return {
      id: alert.id,
      userId: alert.user_id,
      vehicleId: alert.vehicle_id,
      type: alert.type as AlertResponseDto['type'],
      status: alert.status as AlertResponseDto['status'],
      name: alert.name,
      targetPrice: alert.target_price ? Number(alert.target_price) : undefined,
      priceDropPercent: alert.price_drop_percent ? Number(alert.price_drop_percent) : undefined,
      searchCriteria: alert.search_criteria,
      notificationChannels: alert.notification_channels as AlertResponseDto['notificationChannels'],
      triggeredCount: alert.triggered_count,
      lastTriggeredAt: alert.last_triggered_at,
      expiresAt: alert.expires_at,
      vehicle: alert.vehicle ? {
        id: alert.vehicle.id,
        title: alert.vehicle.title,
        currentPrice: Number(alert.vehicle.current_price),
        imageUrl: alert.vehicle.image_urls?.[0],
      } : undefined,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
    };
  }
}
