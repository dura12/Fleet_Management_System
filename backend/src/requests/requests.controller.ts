import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto, UpdateRequestDto, DecideRequestDto, AssignVehicleDto } from './dto/request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Post()
  @Roles(Role.EMPLOYEE)
  create(@Body() dto: CreateRequestDto, @CurrentUser() user) {
    return this.requestsService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user,
    @Query('status') status?: string,
    @Query('requester') requester?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.requestsService.findAll(user, { status, requester, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.requestsService.findOne(id, user);
  }

  @Get(':id/assignment')
  getAssignment(@Param('id') id: string) {
    return this.requestsService.getAssignmentForRequest(id);
  }

  @Patch(':id')
  @Roles(Role.EMPLOYEE)
  update(@Param('id') id: string, @Body() dto: UpdateRequestDto, @CurrentUser() user) {
    return this.requestsService.update(id, dto, user);
  }

  @Post(':id/submit')
  @Roles(Role.EMPLOYEE)
  submit(@Param('id') id: string, @CurrentUser() user) {
    return this.requestsService.submit(id, user);
  }

  @Delete(':id')
  @Roles(Role.EMPLOYEE)
  cancel(@Param('id') id: string, @CurrentUser() user) {
    return this.requestsService.cancel(id, user);
  }

  @Post(':id/approve')
  @Roles(Role.MANAGER)
  approve(@Param('id') id: string, @CurrentUser() user) {
    return this.requestsService.approve(id, user);
  }

  @Post(':id/reject')
  @Roles(Role.MANAGER)
  reject(@Param('id') id: string, @Body() dto: DecideRequestDto, @CurrentUser() user) {
    return this.requestsService.reject(id, dto.rejectionReason, user);
  }

  @Post(':id/assign')
  @Roles(Role.FLEET_COORDINATOR)
  assign(@Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.requestsService.assign(id, dto);
  }

  @Post(':id/complete')
  @Roles(Role.FLEET_COORDINATOR)
  complete(@Param('id') id: string) {
    return this.requestsService.complete(id);
  }
}
