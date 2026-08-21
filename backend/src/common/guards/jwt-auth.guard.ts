import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects every route it's applied to - requires a valid Bearer JWT.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
