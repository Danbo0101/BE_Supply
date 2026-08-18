import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessTimeService } from '../common/time/business-time.service';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order])],
  controllers: [DashboardController],
  providers: [DashboardService, BusinessTimeService],
})
export class DashboardModule {}
