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
import { RefreshTokenDto } from "./dto/refresh-token.dto.js";
import { LocalAuthGuard } from "../guards/local-auth.guard.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { ApiBearerAuth } from "@nestjs/swagger";
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
    async refreshToken(
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        this.authService.assertCookieOrigin(req);
        const refreshToken = req.cookies?.refreshToken ?? dto?.refreshToken;
        if (!refreshToken) {
            throw new BadRequestException("Refresh Token is required");
        }
        const refreshed = await this.authService.rotateRefreshToken(refreshToken, res);
        if (!refreshed) {
            throw new BadRequestException("Refresh Token is invalid");
        }
        return refreshed;
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get("profile")
    getProfile(@Req() req: any) {
        return req.user;
    }

    @Post("logout")
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        this.authService.assertCookieOrigin(req);
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        const { maxAge: _maxAge, ...cookieOptions } = this.authService.refreshCookieOptions();
        res.clearCookie("refreshToken", cookieOptions);

        return {
            message: "Logout successful",
        };
    }
}
