import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { UsersService, UserRecord } from '../users/users.service';
import { LoginDto, RegisterDto, AuthResponseDto } from '@vehicle-price-monitor/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const client = this.supabase.getClient();
    
    const { data, error } = await client.auth.signInWithPassword({
      email: loginDto.email,
      password: loginDto.password,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user profile exists
    const userProfile = await this.usersService.upsertFromAuth({
      id: data.user.id,
      email: data.user.email!,
    });

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      user: {
        id: data.user.id,
        email: data.user.email!,
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        role: userProfile.role || 'user',
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const client = this.supabase.getClient();
    
    const { data, error } = await client.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
      options: {
        data: {
          first_name: registerDto.firstName,
          last_name: registerDto.lastName,
        },
      },
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('Registration failed');
    }

    // Create user profile in our users table
    await this.usersService.upsertFromAuth({
      id: data.user.id,
      email: data.user.email!,
    });

    // Update profile with names
    const userProfile = await this.usersService.update(data.user.id, {
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      user: {
        id: data.user.id,
        email: data.user.email!,
        firstName: userProfile.first_name || registerDto.firstName || '',
        lastName: userProfile.last_name || registerDto.lastName || '',
        role: userProfile.role || 'user',
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const client = this.supabase.getClient();
    
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userProfile = await this.usersService.findById(data.user.id);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      user: {
        id: data.user.id,
        email: data.user.email!,
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        role: userProfile.role || 'user',
      },
    };
  }

  async logout(accessToken: string): Promise<void> {
    const client = this.supabase.getClient();
    await client.auth.signOut();
  }

  async getUser(accessToken: string): Promise<UserRecord | null> {
    const user = await this.supabase.verifyToken(accessToken);
    if (!user) {
      return null;
    }
    return this.usersService.findById(user.id);
  }
}
