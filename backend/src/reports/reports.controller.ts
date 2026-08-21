import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.FLEET_COORDINATOR)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('vehicle-register')
  vehicleRegister() {
    return this.reportsService.vehicleRegister();
  }

  @Get('requests-by-status')
  requestsByStatus() {
    return this.reportsService.requestsByStatus();
  }

  @Get('assignment-history')
  assignmentHistory() {
    return this.reportsService.assignmentHistory();
  }
}
