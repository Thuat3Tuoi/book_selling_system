import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { ConfigModule } from '@nestjs/config';
import { SearchSyncConsumer } from './search-sync.consumer.js';

@Module({
  imports: [ConfigModule],
  providers: [SearchService],
  controllers: [SearchController, SearchSyncConsumer],
  exports: [SearchService],
})
export class SearchModule {}
