import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardAnalyticsQueryDto } from './dto/dashboard-analytics-query.dto';
import { RecentOrdersQueryDto } from './dto/recent-orders-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('analytics')
  getAnalytics(
    @Query()
    queryDto: DashboardAnalyticsQueryDto,
  ) {
    return this.dashboardService.getAnalytics(queryDto);
  }

  @Get('recent-orders')
  getRecentOrders(
    @Query()
    queryDto: RecentOrdersQueryDto,
  ) {
    return this.dashboardService.getRecentOrders(queryDto);
  }
}
