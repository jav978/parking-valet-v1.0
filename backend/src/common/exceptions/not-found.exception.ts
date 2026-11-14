import { HttpStatus } from '@nestjs/common';
import { BusinessException } from './business.exception';

export class NotFoundException extends BusinessException {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`, HttpStatus.NOT_FOUND);
  }
}
