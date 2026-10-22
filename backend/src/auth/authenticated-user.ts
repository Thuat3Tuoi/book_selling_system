export interface AuthenticatedUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    address: string | null;
    roleId: number;
    role: { roleName: string };
}

export function canManageCatalog(user: AuthenticatedUser): boolean {
    return user.role.roleName === "ADMIN" || user.role.roleName === "STAFF";
}
