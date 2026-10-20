import { Module } from '@nestjs/common';
import { OrderItemsController } from './order-items.controller.js';
import { OrderItemsService } from './order-items.service.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [OrderItemsController],
  providers: [OrderItemsService, RolesGuard]
})
export class OrderItemsModule {}
