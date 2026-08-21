import { IsDateString, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateRequestDto {
  @IsNotEmpty({ message: 'Destination is required.' })
  destination: string;

  @IsNotEmpty({ message: 'Purpose is required.' })
  purpose: string;

  @IsDateString({}, { message: 'Travel date must be a valid date.' })
  travelDate: string;

  @IsInt({ message: 'Number of passengers must be a whole number.' })
  @Min(1, { message: 'Number of passengers must be at least 1.' })
  numberOfPassengers: number;
}

export class UpdateRequestDto {
  @IsOptional() @IsNotEmpty()
  destination?: string;

  @IsOptional() @IsNotEmpty()
  purpose?: string;

  @IsOptional() @IsDateString({}, { message: 'Travel date must be a valid date.' })
  travelDate?: string;

  @IsOptional() @IsInt({ message: 'Number of passengers must be a whole number.' }) @Min(1)
  numberOfPassengers?: number;
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
