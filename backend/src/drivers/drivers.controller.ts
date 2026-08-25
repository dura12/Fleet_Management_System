import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR, Role.MANAGER)
  findAll(@Query('search') search?: string) {
    return this.driversService.findAll(search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }
}
