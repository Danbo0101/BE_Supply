import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderPaymentProofDto } from './dto/update-order-payment-proof.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { UpdateOrderInfoDto } from './dto/update-order-info.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('calendar')
  @UseGuards(JwtAuthGuard)
  findByCalendarDateRange(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.ordersService.findByCalendarDateRange(from, to);
  }

  @Get('calendar/day')
  @UseGuards(JwtAuthGuard)
  findByCalendarDate(@Query('date') date: string) {
    return this.ordersService.findByCalendarDate(date);
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  createByAdmin(
    @Body()
    createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createByAdmin(createOrderDto);
  }

  @Get('lookup')
  lookup(@Query('orderCode') orderCode: string, @Query('phone') phone: string) {
    return this.ordersService.lookup(orderCode, phone);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.ordersService.findOne(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch(':id/payment-proof')
  updatePaymentProof(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() updateOrderPaymentProofDto: UpdateOrderPaymentProofDto,
  ) {
    return this.ordersService.updatePaymentProof(
      id,
      updateOrderPaymentProofDto,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @Patch(':id/info')
  @UseGuards(JwtAuthGuard)
  updateInfo(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body()
    dto: UpdateOrderInfoDto,
  ) {
    return this.ordersService.updateInfo(id, dto);
  }

  @Patch(':id/items')
  updateItems(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body()
    dto: UpdateOrderItemsDto,
  ) {
    return this.ordersService.updateItems(id, dto);
  }
}
