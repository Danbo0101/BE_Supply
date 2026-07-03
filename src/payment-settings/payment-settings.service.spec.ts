import { Test, TestingModule } from '@nestjs/testing';
import { PaymentSettingsService } from './payment-settings.service';

describe('PaymentSettingsService', () => {
  let service: PaymentSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentSettingsService],
    }).compile();

    service = module.get<PaymentSettingsService>(PaymentSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
