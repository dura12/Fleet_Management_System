import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../common/roles.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Employee ID cannot be empty.' })
  employeeId?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Full name cannot be empty.' })
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'A valid email is required.' })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Department cannot be empty.' })
  department?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be one of: employee, manager, fleet_coordinator, admin.' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
