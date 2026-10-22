import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemsController } from './order-items.controller.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { StaffAuthGuard } from '../guards/staff-auth.guard.js';
import { OrderItemsService } from './order-items.service.js';

describe('OrderItemsController', () => {
  let controller: OrderItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderItemsController],
      providers: [{ provide: OrderItemsService, useValue: {} }]
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(StaffAuthGuard).useValue({ canActivate: () => true }).compile();

    controller = module.get<OrderItemsController>(OrderItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
