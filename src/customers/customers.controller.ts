import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { FindCustomerOrdersQueryDto } from './dto/find-customer-orders-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get('lookup')
  lookup(@Query('email') email?: string, @Query('phone') phone?: string) {
    return this.customersService.lookup(email, phone);
  }

  @Get(':customerId/orders')
  @UseGuards(JwtAuthGuard)
  findOrders(
    @Param('customerId', new ParseUUIDPipe({ version: '4' }))
    customerId: string,

    @Query()
    queryDto: FindCustomerOrdersQueryDto,
  ) {
    return this.customersService.findOrders(customerId, queryDto);
  }

  @Get()
  findAll(@Query() query: FindCustomersQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }
}
