import { IsBoolean, IsEmail, IsEnum, IsMongoId, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
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
  @IsMongoId({ message: 'Default branch must be a valid ID.' })
  defaultBranch?: string | null;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be one of: employee, manager, fleet_coordinator, admin.' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
