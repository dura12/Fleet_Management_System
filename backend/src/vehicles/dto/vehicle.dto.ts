import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { VehicleStatus } from '../../common/status.enum';

export class CreateVehicleDto {
  @IsNotEmpty({ message: 'Vehicle ID is required.' })
  vehicleId: string;

  @IsNotEmpty({ message: 'Plate number is required.' })
  plateNumber: string;

  @IsNotEmpty({ message: 'Model is required.' })
  model: string;

  @IsNotEmpty({ message: 'Vehicle type is required.' })
  vehicleType: string;

  @IsInt({ message: 'Current mileage must be a whole number.' })
  @Min(0, { message: 'Current mileage cannot be negative.' })
  currentMileage: number;

  @IsOptional()
  @IsEnum(VehicleStatus, { message: 'Invalid vehicle status.' })
  status?: VehicleStatus;
}

export class UpdateVehicleDto {
  @IsOptional() @IsNotEmpty()
  plateNumber?: string;

  @IsOptional() @IsNotEmpty()
  model?: string;

  @IsOptional() @IsNotEmpty()
  vehicleType?: string;

  @IsOptional() @IsInt({ message: 'Current mileage must be a whole number.' }) @Min(0)
  currentMileage?: number;

  @IsOptional()
  @IsEnum(VehicleStatus, { message: 'Invalid vehicle status.' })
  status?: VehicleStatus;
}
