import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { RoleName } from "../generated/prisma/enums.js";

@Injectable()
export class StaffAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const role = context.switchToHttp().getRequest().user?.role;
        if (role === RoleName.ADMIN || role === RoleName.STAFF) return true;
        throw new ForbiddenException("Staff access required");
    }
}
