import { IsBoolean, IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDriverDto {
  @IsNotEmpty({ message: 'Driver ID is required.' })
  driverId: string;

  @IsNotEmpty({ message: 'Driver name is required.' })
  driverName: string;

  @IsOptional()
  employeeId?: string;

  @IsNotEmpty({ message: 'License number is required.' })
  licenseNumber: string;

  @IsDateString({}, { message: 'License expiry must be a valid date.' })
  licenseExpiry: string;
}

export class UpdateDriverDto {
  @IsOptional() @IsNotEmpty()
  driverName?: string;

  @IsOptional()
  employeeId?: string;

  @IsOptional() @IsNotEmpty()
  licenseNumber?: string;

  @IsOptional() @IsDateString({}, { message: 'License expiry must be a valid date.' })
  licenseExpiry?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
