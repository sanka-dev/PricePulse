import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async validate(request: Request): Promise<any> {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    
    const user = await this.supabase.verifyToken(token);
    
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    
    try {
      const userProfile = await this.usersService.findById(user.id);
      return {
        id: user.id,
        email: user.email,
        role: userProfile.role,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
      };
    } catch {
      
      const userProfile = await this.usersService.upsertFromAuth({
        id: user.id,
        email: user.email!,
      });
      return {
        id: user.id,
        email: user.email,
        role: userProfile.role,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
      };
    }
  }
}
