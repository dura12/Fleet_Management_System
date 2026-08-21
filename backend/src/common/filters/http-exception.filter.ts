import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

// Ensures every error the frontend receives has the same shape:
// { statusCode, message, error }. class-validator messages (arrays) are
// flattened into one readable string.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message || message;
    }

    if (Array.isArray(message)) {
      message = message.join(' ');
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
