import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateLookupDto, UpdateLookupDto } from './dto/lookup.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('branches')
  findAllBranches(@Query('activeOnly') activeOnly?: string) {
    return this.settingsService.findAllBranches(activeOnly === 'true');
  }

  @Post('branches')
  @Roles(Role.ADMIN)
  createBranch(@Body() dto: CreateLookupDto) {
    return this.settingsService.createBranch(dto);
  }

  @Patch('branches/:id')
  @Roles(Role.ADMIN)
  updateBranch(@Param('id') id: string, @Body() dto: UpdateLookupDto) {
    return this.settingsService.updateBranch(id, dto);
  }

  @Get('departments')
  findAllDepartments(@Query('activeOnly') activeOnly?: string) {
    return this.settingsService.findAllDepartments(activeOnly === 'true');
  }

  @Post('departments')
  @Roles(Role.ADMIN)
  createDepartment(@Body() dto: CreateLookupDto) {
    return this.settingsService.createDepartment(dto);
  }

  @Patch('departments/:id')
  @Roles(Role.ADMIN)
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateLookupDto) {
    return this.settingsService.updateDepartment(id, dto);
  }

  @Get('destinations')
  findAllDestinations(@Query('activeOnly') activeOnly?: string) {
    return this.settingsService.findAllDestinations(activeOnly === 'true');
  }

  @Post('destinations')
  @Roles(Role.ADMIN)
  createDestination(@Body() dto: CreateLookupDto) {
    return this.settingsService.createDestination(dto);
  }

  @Patch('destinations/:id')
  @Roles(Role.ADMIN)
  updateDestination(@Param('id') id: string, @Body() dto: UpdateLookupDto) {
    return this.settingsService.updateDestination(id, dto);
  }
}
