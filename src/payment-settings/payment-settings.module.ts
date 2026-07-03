import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentSetting } from './entities/payment-setting.entity';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentSettingsService } from './payment-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentSetting])],
  controllers: [PaymentSettingsController],
  providers: [PaymentSettingsService],
})
export class PaymentSettingsModule {}
