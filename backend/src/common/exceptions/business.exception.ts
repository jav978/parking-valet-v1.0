import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        success: false,
        message,
        data: null,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}
