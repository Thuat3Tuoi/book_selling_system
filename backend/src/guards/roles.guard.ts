import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { ROLES_KEY } from "./roles.decorator.js";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!roles?.length) return true;

        const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
        if (!user || !roles.includes(user.role.roleName)) {
            throw new ForbiddenException("Insufficient permissions");
        }
        return true;
    }
}
