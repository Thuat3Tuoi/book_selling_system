import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { UserResponseDto } from "./dto/user-response.dto.js";
import type { Request } from "express";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";

@Controller("user")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(JwtAuthGuard)
    @Get("me")
    async getMe(@Req() req: Request & { user: AuthenticatedUser }) {
        const user = await this.userService.findUserById(req.user.id);
        return new UserResponseDto(user);
    }
}
