import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, Max, Min, IsString } from 'class-validator';
import { RequestPriority, RequestStatus } from '../../common/status.enum';

export const MAX_PASSENGERS = 50;

export class CreateRequestDto {
  @IsNotEmpty({ message: 'Destination is required.' })
  destination: string;

  @IsNotEmpty({ message: 'Purpose is required.' })
  purpose: string;

  @IsDateString({}, { message: 'Travel date must be a valid date.' })
  travelDate: string;

  @Type(() => Number)
  @IsInt({ message: 'Number of passengers must be a whole number.' })
  @Min(1, { message: 'Number of passengers must be at least 1.' })
  @Max(MAX_PASSENGERS, { message: `Number of passengers cannot exceed ${MAX_PASSENGERS}.` })
  numberOfPassengers: number;

  @IsOptional()
  @IsEnum(RequestPriority, { message: 'Priority must be Normal or Urgent.' })
  priority?: RequestPriority;
}

export class UpdateRequestDto {
  @IsOptional() @IsNotEmpty()
  destination?: string;

  @IsOptional() @IsNotEmpty()
  purpose?: string;

  @IsOptional() @IsDateString({}, { message: 'Travel date must be a valid date.' })
  travelDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Number of passengers must be a whole number.' })
  @Min(1, { message: 'Number of passengers must be at least 1.' })
  @Max(MAX_PASSENGERS, { message: `Number of passengers cannot exceed ${MAX_PASSENGERS}.` })
  numberOfPassengers?: number;

  @IsOptional()
  @IsEnum(RequestPriority, { message: 'Priority must be Normal or Urgent.' })
  priority?: RequestPriority;
}

export class DecideRequestDto {
  @IsOptional()
  rejectionReason?: string;
}

export class AssignVehicleDto {
  @IsNotEmpty({ message: 'A vehicle must be selected.' })
  vehicleId: string;

  @IsNotEmpty({ message: 'A driver must be selected.' })
  driverId: string;
}

export class ReassignDriverDto {
  @IsNotEmpty({ message: 'A driver must be selected.' })
  driverId: string;
}

export class ReassignVehicleDto {
  @IsNotEmpty({ message: 'A replacement vehicle must be selected.' })
  vehicleId: string;
}

export class UpdateAssignmentNotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OverrideStatusDto {
  @IsEnum(RequestStatus, { message: 'Status must be a valid request status.' })
  status: RequestStatus;
}
