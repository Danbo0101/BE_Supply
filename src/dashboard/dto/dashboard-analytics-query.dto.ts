import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export enum DashboardGroupBy {
  AUTO = 'auto',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class DashboardAnalyticsQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must use YYYY-MM-DD format',
  })
  from!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must use YYYY-MM-DD format',
  })
  to!: string;

  @IsOptional()
  @IsEnum(DashboardGroupBy)
  groupBy?: DashboardGroupBy;
}
