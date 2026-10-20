import { Module } from "@nestjs/common";
import { BooksController } from "./books.controller.js";
import { BooksService } from "./books.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PassportModule } from "@nestjs/passport";
import { SearchModule } from "../search/search.module.js";
import { RolesGuard } from "../guards/roles.guard.js";

@Module({
    imports: [
        PrismaModule,
        PassportModule.register({
            defaultStrategy: "jwt",
        }),
        SearchModule,
    ],
    controllers: [BooksController],
    providers: [BooksService, RolesGuard],
    exports: [BooksService],
})
export class BooksModule {}
