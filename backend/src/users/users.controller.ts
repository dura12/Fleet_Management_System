import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Only the Fleet Coordinator (acting as administrator) can create new accounts
  // and view the full user list, keeping user management out of employees' hands.
  @Post()
  @Roles(Role.FLEET_COORDINATOR)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.FLEET_COORDINATOR, Role.MANAGER)
  findAll() {
    return this.usersService.findAll();
  }
}
