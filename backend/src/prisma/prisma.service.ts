import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(configService: ConfigService) {
    //     const adapter = new PrismaPg({
    //         connectionString: configService.getOrThrow<string>("DATABASE_URL"),
    //     });

    //     super({ adapter });
    // }

        const  dbUrl = configService?.get<string>("DATABASE_URL") || process.env.DATABASE_URL;
        if (!dbUrl){
            throw new Error("DATABASE_URL khong ton tai trong moi truong");
        }
        const adapter = new PrismaPg({
            connectionString: dbUrl,
        });

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
