import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class OrderItemsService {
    constructor(private prismaService: PrismaService) {}
}
