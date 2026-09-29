import { Module } from "@nestjs/common";
import { BooksController } from "./books.controller.js";
import { BooksService } from "./books.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PassportModule } from "@nestjs/passport";

@Module({
    imports: [PrismaModule,PassportModule.register({
                defaultStrategy: "jwt",
            }),],
    controllers: [BooksController],
    providers: [BooksService],
    exports: [BooksService],
})
export class BooksModule {}
