import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'change_this_secret_in_production',
    });
  }

  // Whatever is returned here becomes `request.user` for every guarded route.
  async validate(payload: { sub: string; role: string; employeeId: string }) {
    return { userId: payload.sub, role: payload.role, employeeId: payload.employeeId };
  }
}
