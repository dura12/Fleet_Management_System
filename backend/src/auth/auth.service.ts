import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = { sub: user._id, role: user.role, employeeId: user.employeeId };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        role: user.role,
      },
    };
  }
}
