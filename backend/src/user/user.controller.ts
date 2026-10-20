import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { ApiBearerAuth } from "@nestjs/swagger";

@Controller("user")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get("me")
    getMe(@Req() req: any) {
        // req.user được JwtStrategy gán — dựa theo auth.controller.ts payload có { sub, email, role }
        return this.userService.findUserById(req.user.id);
    }
}
