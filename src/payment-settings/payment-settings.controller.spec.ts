import { Test, TestingModule } from '@nestjs/testing';
import { PaymentSettingsController } from './payment-settings.controller';

describe('PaymentSettingsController', () => {
  let controller: PaymentSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentSettingsController],
    }).compile();

    controller = module.get<PaymentSettingsController>(PaymentSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
