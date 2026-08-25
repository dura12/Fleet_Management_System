import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import {
  CreateRequestDto,
  UpdateRequestDto,
  DecideRequestDto,
  AssignVehicleDto,
  ReassignDriverDto,
  ReassignVehicleDto,
  UpdateAssignmentNotesDto,
  OverrideStatusDto,
} from './dto/request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Get('stats')
  getStats(@CurrentUser() user) {
    return this.requestsService.getQueueStats(user);
  }

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

  @Get(':id/assign-options')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  getAssignOptions(@Param('id') id: string) {
    return this.requestsService.getAssignOptions(id);
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
  cancel(@Param('id') id: string, @CurrentUser() user) {
    return this.requestsService.cancel(id, user);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  approve(@Param('id') id: string, @CurrentUser() user) {
    return this.requestsService.approve(id, user);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.MANAGER)
  reject(@Param('id') id: string, @Body() dto: DecideRequestDto, @CurrentUser() user) {
    return this.requestsService.reject(id, dto.rejectionReason, user);
  }

  @Post(':id/assign')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  assign(@Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.requestsService.assign(id, dto);
  }

  @Post(':id/reassign-driver')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  reassignDriver(@Param('id') id: string, @Body() dto: ReassignDriverDto) {
    return this.requestsService.reassignDriver(id, dto);
  }

  @Post(':id/reassign-vehicle')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  reassignVehicle(@Param('id') id: string, @Body() dto: ReassignVehicleDto) {
    return this.requestsService.reassignVehicle(id, dto);
  }

  @Patch(':id/assignment/notes')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  updateNotes(@Param('id') id: string, @Body() dto: UpdateAssignmentNotesDto) {
    return this.requestsService.updateAssignmentNotes(id, dto);
  }

  @Post(':id/complete')
  @Roles(Role.ADMIN, Role.FLEET_COORDINATOR)
  complete(@Param('id') id: string, @Body() dto: UpdateAssignmentNotesDto) {
    return this.requestsService.complete(id, dto.notes);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  overrideStatus(@Param('id') id: string, @Body() dto: OverrideStatusDto, @CurrentUser() user) {
    return this.requestsService.overrideStatus(id, dto.status, user);
  }
}
