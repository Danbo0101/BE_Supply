import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';
import { CreatePaymentSettingDto } from './dto/create-payment-setting.dto';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingStatusDto } from './dto/update-payment-setting-status.dto';

@Controller('payment-settings')
export class PaymentSettingsController {
  constructor(
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPaymentSettingDto: CreatePaymentSettingDto) {
    return this.paymentSettingsService.create(createPaymentSettingDto);
  }

  @Get()
  findAll() {
    return this.paymentSettingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentSettingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updatePaymentSettingDto: UpdatePaymentSettingDto,
  ) {
    return this.paymentSettingsService.update(id, updatePaymentSettingDto);
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() updatePaymentSettingStatusDto: UpdatePaymentSettingStatusDto,
  ) {
    return this.paymentSettingsService.updateStatus(
      id,
      updatePaymentSettingStatusDto,
    );
  }
}
