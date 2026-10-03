import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { SearchBooksResult, SearchService } from './search.service.js';
import { SearchBooksQueryDto } from './dto/search-books-query.dto.js';

@Controller('search')
export class SearchController {
    constructor( private readonly searchService: SearchService) {}

    @Get("books")
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    searchBooks(@Query() query: SearchBooksQueryDto): Promise<SearchBooksResult> {
        return this.searchService.searchBooks(query.q ?? "", {
            category: query.category,
            page: query.page,
            limit: query.limit,
        });
    }
}
