import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLookupDto {
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;
}

export class UpdateLookupDto {
  @IsOptional() @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
