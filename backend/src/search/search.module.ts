import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BookSearchSyncService } from './book-search-sync.service.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [SearchService, BookSearchSyncService],
  controllers: [SearchController],
  exports: [SearchService, BookSearchSyncService],
})
export class SearchModule {}
