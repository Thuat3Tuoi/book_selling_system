import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";

import type { Response, Request } from "express";

import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { CreateUserDto } from "../user/dto/create-user.dto.js";
import { LocalAuthGuard } from "../guards/local-auth.guard.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post("register")
    register(@Body() dto: CreateUserDto) {
        return this.authService.register(dto);
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    @HttpCode(HttpStatus.OK)
    login(@Body() _dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
        return this.authService.login(req.user, res);
    }

    @Post("refresh-token")
    async refreshToken(@Body() { refreshToken }: { refreshToken: string }) {
        if (!refreshToken) {
            throw new BadRequestException("Refresh Token is required");
        }
        const user = await this.authService.verifyRefreshToken(refreshToken);
        if (!user) {
            throw new BadRequestException("Refresh Token is invalid");
        }
        return this.authService.login(user);
    }

    @UseGuards(JwtAuthGuard)
    @Get("profile")
    getProfile(@Req() req: any) {
        return req.user;
    }

    @Post("logout")
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return {
            message: "Logout successful",
        };
    }
}
