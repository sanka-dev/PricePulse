import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateUserDto, UpdateUserDto } from '@vehicle-price-monitor/types';

export interface UserRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(createUserDto: CreateUserDto): Promise<UserRecord> {
    
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', createUserDto.email)
      .single();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const { data, error } = await this.supabase.from('users').insert({
      email: createUserDto.email,
      first_name: createUserDto.firstName,
      last_name: createUserDto.lastName,
      role: 'user',
    }).select().single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async findAll(): Promise<UserRecord[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  }

  async findById(id: string): Promise<UserRecord> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    return data;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    return data;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserRecord> {
    await this.findById(id);

    const updateData: Record<string, unknown> = {};
    if (updateUserDto.firstName) updateData.first_name = updateUserDto.firstName;
    if (updateUserDto.lastName) updateData.last_name = updateUserDto.lastName;

    const { data, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);

    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async upsertFromAuth(authUser: { id: string; email: string }): Promise<UserRecord> {
    const { data, error } = await this.supabase
      .from('users')
      .upsert({
        id: authUser.id,
        email: authUser.email,
        role: 'user',
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert user: ${error.message}`);
    }

    return data;
  }
}
