import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Database error';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = `Duplicate value for ${(exception.meta?.target as string[])?.join(', ') || 'field'}`;
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint failed';
        break;
      case 'P2014':
        status = HttpStatus.BAD_REQUEST;
        message = 'Required relation violation';
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = exception.message;
    }

    response.status(status).json({
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
