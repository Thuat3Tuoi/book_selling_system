import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { SearchBooksResult, SearchService } from './search.service.js';
import { SearchBooksQueryDto } from './dto/search-books-query.dto.js';
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Search")
@Controller('search')
export class SearchController {
    constructor( private readonly searchService: SearchService) {}

    @Get("books")
    @ApiOperation({ summary: "Search active books in Meilisearch" })
    @ApiResponse({ status: 200, description: "Search result in the standard success envelope", schema: {
        type: "object", required: ["success", "data"], properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: {
                hits: { type: "array", items: { type: "object" } }, totalHits: { type: "number" },
                processingTimeMs: { type: "number" }, page: { type: "number" }, limit: { type: "number" },
            } },
        },
    } })
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    searchBooks(@Query() query: SearchBooksQueryDto): Promise<SearchBooksResult> {
        return this.searchService.searchBooks(query.q ?? "", {
            category: query.category,
            page: query.page,
            limit: query.limit,
            sort: query.sort,
        });
    }
}
