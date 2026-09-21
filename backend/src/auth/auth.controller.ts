import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";



@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post("register")
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }
    @Post("login")
    login(@Body() dto: LoginDto, @Res() res: Response) {
        return this.authService.login(dto, res);
    }

    @UseGuards(JwtAuthGuard)
    @Get("me")
    getMe(@Req() req: Request) {
        return req.user;
    }
}
