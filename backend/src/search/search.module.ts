import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { ConfigModule } from '@nestjs/config';
import { SearchSyncConsumer } from './search-sync.consumer.js';
import { BookSearchSyncService } from './book-search-sync.service.js';

@Module({
  imports: [ConfigModule],
  providers: [SearchService, BookSearchSyncService],
  controllers: [SearchController, SearchSyncConsumer],
  exports: [SearchService, BookSearchSyncService],
})
export class SearchModule {}
