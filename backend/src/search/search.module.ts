import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
