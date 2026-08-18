import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';

import { BusinessTimeService } from '../common/time/business-time.service';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  DashboardAnalyticsQueryDto,
  DashboardGroupBy,
} from './dto/dashboard-analytics-query.dto';
import { RecentOrdersQueryDto } from './dto/recent-orders-query.dto';

type ResolvedGroupBy =
  DashboardGroupBy.DAY | DashboardGroupBy.WEEK | DashboardGroupBy.MONTH;

type CountRow = {
  total: string;
  current_period: string;
  previous_period: string;
};

type OrderCountRow = {
  key: string;
  order_count: string;
};

type RevenueRow = {
  key: string;
  revenue: string;
};

type AnalyticsPoint = {
  key: string;
  label: string;
  orderCount: number;
  revenue: string;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly businessTimeService: BusinessTimeService,
  ) {}

  async getSummary() {
    const businessTimeZone = this.businessTimeService.timezone;

    const now = DateTime.now().setZone(businessTimeZone);

    // Kỳ hiện tại: đầu tháng đến hết ngày hôm nay.
    const currentFromLocal = now.startOf('month');
    const currentToLocal = now.startOf('day');

    const currentToExclusiveLocal = currentToLocal.plus({ days: 1 });

    // Kỳ so sánh: cùng số ngày của tháng trước.
    const previousMonth = now.minus({ months: 1 });

    const comparisonFromLocal = previousMonth.startOf('month');

    const comparisonDay = Math.min(now.day, previousMonth.endOf('month').day);

    const comparisonToLocal = comparisonFromLocal.set({
      day: comparisonDay,
    });

    const comparisonToExclusiveLocal = comparisonToLocal.plus({ days: 1 });

    const parameters = {
      currentFrom: currentFromLocal.toUTC().toJSDate(),

      currentTo: currentToExclusiveLocal.toUTC().toJSDate(),

      comparisonFrom: comparisonFromLocal.toUTC().toJSDate(),

      comparisonTo: comparisonToExclusiveLocal.toUTC().toJSDate(),
    };

    const [customerCounts, orderCounts] = await Promise.all([
      this.customerRepository
        .createQueryBuilder('customer')
        .select('COUNT(*)', 'total')
        .addSelect(
          `
              COUNT(*) FILTER (
                WHERE "customer"."created_at" >= :currentFrom
                  AND "customer"."created_at" < :currentTo
              )
            `,
          'current_period',
        )
        .addSelect(
          `
              COUNT(*) FILTER (
                WHERE "customer"."created_at" >= :comparisonFrom
                  AND "customer"."created_at" < :comparisonTo
              )
            `,
          'previous_period',
        )
        .setParameters(parameters)
        .getRawOne<CountRow>(),

      this.orderRepository
        .createQueryBuilder('orders')
        .select('COUNT(*)', 'total')
        .addSelect(
          `
              COUNT(*) FILTER (
                WHERE "orders"."created_at" >= :currentFrom
                  AND "orders"."created_at" < :currentTo
              )
            `,
          'current_period',
        )
        .addSelect(
          `
              COUNT(*) FILTER (
                WHERE "orders"."created_at" >= :comparisonFrom
                  AND "orders"."created_at" < :comparisonTo
              )
            `,
          'previous_period',
        )
        .setParameters(parameters)
        .getRawOne<CountRow>(),
    ]);

    return {
      timezone: businessTimeZone,
      comparisonType: 'month_to_date',

      period: {
        from: this.toISODate(currentFromLocal),
        to: this.toISODate(currentToLocal),

        comparisonFrom: this.toISODate(comparisonFromLocal),

        comparisonTo: this.toISODate(comparisonToLocal),
      },

      customers: this.buildSummaryMetric(customerCounts),

      orders: this.buildSummaryMetric(orderCounts),
    };
  }

  async getAnalytics(queryDto: DashboardAnalyticsQueryDto) {
    const businessTimeZone = this.businessTimeService.timezone;

    const fromLocal = this.parseLocalDate(
      queryDto.from,
      businessTimeZone,
      'from',
    );

    const toLocal = this.parseLocalDate(queryDto.to, businessTimeZone, 'to');

    if (fromLocal.toMillis() > toLocal.toMillis()) {
      throw new BadRequestException('from cannot be greater than to');
    }

    // Tính cả ngày from và ngày to.
    const rangeDays = Math.round(toLocal.diff(fromLocal, 'days').days) + 1;

    const requestedGroupBy = queryDto.groupBy ?? DashboardGroupBy.AUTO;

    const resolvedGroupBy = this.resolveGroupBy(requestedGroupBy, rangeDays);

    const fromDate = fromLocal.startOf('day').toUTC().toJSDate();

    // `to` là inclusive nên mốc SQL phải là đầu ngày kế tiếp.
    const toDate = toLocal.plus({ days: 1 }).startOf('day').toUTC().toJSDate();

    const orderCountKeyExpression = this.getBucketKeyExpression(
      resolvedGroupBy,
      '"orders"."created_at"',
    );

    const revenueKeyExpression = this.getBucketKeyExpression(
      resolvedGroupBy,
      '"orders"."done_at"',
    );

    const [orderCountRows, revenueRows] = await Promise.all([
      // Đếm mọi order dựa trên createdAt.
      this.orderRepository
        .createQueryBuilder('orders')
        .select(orderCountKeyExpression, 'key')
        .addSelect('COUNT(*)', 'order_count')
        .where('"orders"."created_at" >= :fromDate')
        .andWhere('"orders"."created_at" < :toDate')
        .setParameters({
          fromDate,
          toDate,
          businessTimeZone,
        })
        .groupBy(orderCountKeyExpression)
        .getRawMany<OrderCountRow>(),

      // Doanh thu chỉ tính order DONE theo doneAt.
      this.orderRepository
        .createQueryBuilder('orders')
        .select(revenueKeyExpression, 'key')
        .addSelect(
          `
              COALESCE(
                SUM("orders"."total_amount"),
                0
              )
            `,
          'revenue',
        )
        .where('"orders"."status" = :doneStatus', {
          doneStatus: OrderStatus.DONE,
        })
        .andWhere('"orders"."done_at" IS NOT NULL')
        .andWhere('"orders"."done_at" >= :fromDate')
        .andWhere('"orders"."done_at" < :toDate')
        .setParameters({
          fromDate,
          toDate,
          businessTimeZone,
        })
        .groupBy(revenueKeyExpression)
        .getRawMany<RevenueRow>(),
    ]);

    const orderCountByKey = new Map(
      orderCountRows.map((row) => [row.key, Number(row.order_count)]),
    );

    const revenueByKey = new Map(
      revenueRows.map((row) => [row.key, row.revenue]),
    );

    const points: AnalyticsPoint[] = [];

    let cursor = this.startOfBucket(fromLocal, resolvedGroupBy);

    const endBucket = this.startOfBucket(toLocal, resolvedGroupBy);

    // Backend tự tạo cả bucket không có dữ liệu.
    while (cursor.toMillis() <= endBucket.toMillis()) {
      const key = this.getBucketKey(cursor, resolvedGroupBy);

      points.push({
        key,

        label: this.getBucketLabel(cursor, resolvedGroupBy),

        orderCount: orderCountByKey.get(key) ?? 0,

        revenue: new Decimal(revenueByKey.get(key) ?? '0').toFixed(2),
      });

      cursor = this.nextBucket(cursor, resolvedGroupBy);
    }

    return {
      from: queryDto.from,
      to: queryDto.to,
      timezone: businessTimeZone,
      requestedGroupBy,
      resolvedGroupBy,
      currency: 'USD',
      points,
    };
  }

  async getRecentOrders(queryDto: RecentOrdersQueryDto) {
    const businessTimeZone = this.businessTimeService.timezone;

    const limit = queryDto.limit ?? 5;

    const orders = await this.orderRepository.find({
      relations: {
        items: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return {
      timezone: businessTimeZone,
      limit,

      items: orders.map((order) => {
        // Chọn item đầu tiên theo createdAt.
        const items = [...(order.items ?? [])].sort(
          (firstItem, secondItem) =>
            firstItem.createdAt.getTime() - secondItem.createdAt.getTime(),
        );

        const totalQuantity = items.reduce(
          (total, item) => total + Number(item.quantity),
          0,
        );

        const firstItem = items[0];

        const preview = firstItem
          ? {
              productId: firstItem.productId,
              productName: firstItem.productName,

              // Null thì frontend dùng placeholder.
              thumbnailUrl: firstItem.productThumbnailUrl ?? null,

              quantity: Number(firstItem.quantity),

              additionalProductCount: Math.max(items.length - 1, 0),
            }
          : null;

        return {
          id: order.id,
          orderCode: order.orderCode,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          status: order.status,
          createdAt: order.createdAt,
          itemCount: items.length,
          totalQuantity,
          preview,
        };
      }),
    };
  }

  private parseLocalDate(
    value: string,
    timezone: string,
    fieldName: string,
  ): DateTime {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${fieldName} must use YYYY-MM-DD format`);
    }

    const parsedDate = DateTime.fromISO(value, {
      zone: timezone,
    }).startOf('day');

    if (!parsedDate.isValid || parsedDate.toISODate() !== value) {
      throw new BadRequestException(`Invalid ${fieldName} date`);
    }

    return parsedDate;
  }

  private resolveGroupBy(
    requestedGroupBy: DashboardGroupBy,
    rangeDays: number,
  ): ResolvedGroupBy {
    let resolvedGroupBy: ResolvedGroupBy;

    if (requestedGroupBy === DashboardGroupBy.AUTO) {
      if (rangeDays <= 31) {
        resolvedGroupBy = DashboardGroupBy.DAY;
      } else if (rangeDays <= 62) {
        resolvedGroupBy = DashboardGroupBy.WEEK;
      } else if (rangeDays <= 366) {
        resolvedGroupBy = DashboardGroupBy.MONTH;
      } else {
        throw new BadRequestException(
          'Analytics date range cannot exceed 366 days',
        );
      }
    } else {
      resolvedGroupBy = requestedGroupBy;
    }

    const maximumDays: Record<ResolvedGroupBy, number> = {
      [DashboardGroupBy.DAY]: 31,
      [DashboardGroupBy.WEEK]: 62,
      [DashboardGroupBy.MONTH]: 366,
    };

    const maximumRange = maximumDays[resolvedGroupBy];

    if (rangeDays > maximumRange) {
      throw new BadRequestException(
        `groupBy=${resolvedGroupBy} date range cannot exceed ${maximumRange} days`,
      );
    }

    return resolvedGroupBy;
  }

  private getBucketKeyExpression(
    groupBy: ResolvedGroupBy,
    columnExpression: string,
  ): string {
    const localDateExpression = `
      timezone(
        :businessTimeZone,
        ${columnExpression}
      )
    `;

    switch (groupBy) {
      case DashboardGroupBy.DAY:
        return `
          TO_CHAR(
            ${localDateExpression},
            'YYYY-MM-DD'
          )
        `;

      case DashboardGroupBy.WEEK:
        return `
          TO_CHAR(
            DATE_TRUNC(
              'week',
              ${localDateExpression}
            ),
            'IYYY-"W"IW'
          )
        `;

      case DashboardGroupBy.MONTH:
        return `
          TO_CHAR(
            ${localDateExpression},
            'YYYY-MM'
          )
        `;
    }

    throw new BadRequestException('Invalid analytics groupBy');
  }

  private startOfBucket(date: DateTime, groupBy: ResolvedGroupBy): DateTime {
    switch (groupBy) {
      case DashboardGroupBy.DAY:
        return date.startOf('day');

      case DashboardGroupBy.WEEK:
        return date.startOf('week');

      case DashboardGroupBy.MONTH:
        return date.startOf('month');
    }

    throw new BadRequestException('Invalid analytics groupBy');
  }

  private nextBucket(date: DateTime, groupBy: ResolvedGroupBy): DateTime {
    switch (groupBy) {
      case DashboardGroupBy.DAY:
        return date.plus({ days: 1 });

      case DashboardGroupBy.WEEK:
        return date.plus({ weeks: 1 });

      case DashboardGroupBy.MONTH:
        return date.plus({ months: 1 });
    }

    throw new BadRequestException('Invalid analytics groupBy');
  }

  private getBucketKey(date: DateTime, groupBy: ResolvedGroupBy): string {
    switch (groupBy) {
      case DashboardGroupBy.DAY:
        return this.toISODate(date);

      case DashboardGroupBy.WEEK:
        return `${date.weekYear}-W${String(date.weekNumber).padStart(2, '0')}`;

      case DashboardGroupBy.MONTH:
        return date.toFormat('yyyy-MM');
    }

    throw new BadRequestException('Invalid analytics groupBy');
  }

  private getBucketLabel(date: DateTime, groupBy: ResolvedGroupBy): string {
    switch (groupBy) {
      case DashboardGroupBy.DAY:
        return date.toFormat('LLL d');

      case DashboardGroupBy.WEEK:
        return `W${String(date.weekNumber).padStart(2, '0')}`;

      case DashboardGroupBy.MONTH:
        return date.toFormat('LLL');
    }

    throw new BadRequestException('Invalid analytics groupBy');
  }

  private buildSummaryMetric(row?: CountRow) {
    const total = Number(row?.total ?? 0);

    const currentPeriod = Number(row?.current_period ?? 0);

    const previousPeriod = Number(row?.previous_period ?? 0);

    const rawChangePercent =
      previousPeriod === 0
        ? currentPeriod > 0
          ? 100
          : 0
        : ((currentPeriod - previousPeriod) / previousPeriod) * 100;

    const changePercent = Math.round(rawChangePercent * 100) / 100;

    const trend =
      currentPeriod > previousPeriod
        ? 'up'
        : currentPeriod < previousPeriod
          ? 'down'
          : 'neutral';

    return {
      total,
      currentPeriod,
      previousPeriod,
      changePercent,
      trend,
    };
  }

  private toISODate(date: DateTime): string {
    const result = date.toISODate();

    if (!result) {
      throw new BadRequestException('Unable to generate dashboard date');
    }

    return result;
  }
}
