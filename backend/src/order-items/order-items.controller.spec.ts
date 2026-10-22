import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemsController } from './order-items.controller.js';
import { OrderItemsService } from './order-items.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

describe('OrderItemsController', () => {
  let controller: OrderItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderItemsController],
      providers: [{ provide: OrderItemsService, useValue: {} }]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderItemsController>(OrderItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
