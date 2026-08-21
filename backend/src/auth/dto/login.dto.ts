import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
