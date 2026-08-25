import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  // Any authenticated role can view/search the vehicle list (e.g. an employee
  // checking what's available before requesting), so no @Roles() restriction here.
  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.vehiclesService.findAll({ status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
