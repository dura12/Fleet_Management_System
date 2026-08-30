import { IsEmail, IsEnum, IsMongoId, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../common/roles.enum';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Employee ID is required.' })
  employeeId: string;

  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @IsEmail({}, { message: 'A valid email is required.' })
  email: string;

  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;

  @IsNotEmpty({ message: 'Department is required.' })
  department: string;

  @IsOptional()
  @IsMongoId({ message: 'Default branch must be a valid ID.' })
  defaultBranch?: string;

  @IsEnum(Role, { message: 'Role must be one of: employee, manager, fleet_coordinator, admin.' })
  role: Role;
}
