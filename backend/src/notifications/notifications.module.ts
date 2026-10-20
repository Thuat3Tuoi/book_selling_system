import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { PassportModule } from "@nestjs/passport";

@Module({
    imports: [PassportModule.register({ defaultStrategy: "jwt" })],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule {}
