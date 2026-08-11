import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';

@Injectable()
export class BusinessTimeService {
  readonly timezone: string;

  constructor(private readonly configService: ConfigService) {
    this.timezone = this.configService.getOrThrow<string>('BUSINESS_TIME_ZONE');
  }

  getDayRange(date: string) {
    const start = this.parseLocalDate(date);
    const end = start.plus({ days: 1 });

    return {
      fromDate: start.toUTC().toJSDate(),
      toDate: end.toUTC().toJSDate(),
    };
  }

  getDateRange(from: string, to: string, maxDays = 42) {
    const start = this.parseLocalDate(from);
    const end = this.parseLocalDate(to);

    if (end.toMillis() <= start.toMillis()) {
      throw new BadRequestException('to must be greater than from');
    }

    const rangeInDays = end.diff(start, 'days').days;

    if (rangeInDays > maxDays) {
      throw new BadRequestException(`Date range cannot exceed ${maxDays} days`);
    }

    return {
      fromDate: start.toUTC().toJSDate(),
      toDate: end.toUTC().toJSDate(),
    };
  }

  private parseLocalDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Date must use YYYY-MM-DD format');
    }

    const date = DateTime.fromISO(value, {
      zone: this.timezone,
    }).startOf('day');

    if (!date.isValid || date.toISODate() !== value) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }

    return date;
  }
}
