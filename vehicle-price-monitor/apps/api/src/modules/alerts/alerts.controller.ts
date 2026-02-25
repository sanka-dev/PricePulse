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
import { AlertsService } from './alerts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateAlertDto,
  UpdateAlertDto,
  AlertQueryDto,
} from '@vehicle-price-monitor/types';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Controller('alerts')
@UseGuards(AuthGuard('supabase'))
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createAlertDto: CreateAlertDto,
  ) {
    return this.alertsService.create(user.id, createAlertDto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: AlertQueryDto) {
    return this.alertsService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.alertsService.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateAlertDto: UpdateAlertDto,
  ) {
    return this.alertsService.update(id, user.id, updateAlertDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.alertsService.remove(id, user.id);
  }
}
