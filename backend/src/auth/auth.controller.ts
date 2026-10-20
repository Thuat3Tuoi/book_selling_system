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
import { RefreshTokenDto } from "./dto/refresh-token.dto.js";
import type { AuthenticatedUser } from "./authenticated-user.js";
import { UserResponseDto } from "../user/dto/user-response.dto.js";
import { refreshCookieOptions } from "./refresh-cookie-options.js";
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
    async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request) {
        const refreshToken = dto.refreshToken ?? req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new BadRequestException("Refresh Token is required");
        }
        return this.authService.refreshAccessToken(refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Get("profile")
    getProfile(@Req() req: Request & { user: AuthenticatedUser }) {
        return new UserResponseDto(req.user);
    }

    @Post("logout")
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        res.clearCookie("refreshToken", refreshCookieOptions);

        return {
            message: "Logout successful",
        };
    }
}
