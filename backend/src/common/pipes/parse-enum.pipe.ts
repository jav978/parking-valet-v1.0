import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseEnumPipe<T extends Record<string, string>> implements PipeTransform<string> {
  constructor(private readonly enumType: T) {}

  transform(value: string): T[keyof T] {
    const validValues = Object.values(this.enumType);
    if (!validValues.includes(value as T[keyof T])) {
      throw new BadRequestException(
        `Invalid value '${value}'. Valid values are: ${validValues.join(', ')}`,
      );
    }
    return value as T[keyof T];
  }
}
