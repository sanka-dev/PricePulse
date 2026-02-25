import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleQueryDto,
} from '@vehicle-price-monitor/types';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Controller('vehicles')
@UseGuards(AuthGuard('supabase'))
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(user.id, createVehicleDto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: VehicleQueryDto) {
    return this.vehiclesService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vehiclesService.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, user.id, updateVehicleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vehiclesService.remove(id, user.id);
  }
}
