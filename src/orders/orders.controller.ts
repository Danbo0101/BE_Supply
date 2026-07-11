import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderPaymentProofDto } from './dto/update-order-payment-proof.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch(':id/payment-proof')
  updatePaymentProof(
    @Param('id') id: string,
    @Body() updateOrderPaymentProofDto: UpdateOrderPaymentProofDto,
  ) {
    return this.ordersService.updatePaymentProof(
      id,
      updateOrderPaymentProofDto,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @Get('lookup')
  lookup(@Query('orderCode') orderCode: string, @Query('phone') phone: string) {
    return this.ordersService.lookup(orderCode, phone);
  }
}
