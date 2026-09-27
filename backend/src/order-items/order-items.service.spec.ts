import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemsService } from './order-items.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('OrderItemsService', () => {
  let service: OrderItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemsService, 
        { provide: PrismaService, useValue: {} }
      ],
    }).compile();

    service = module.get<OrderItemsService>(OrderItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
