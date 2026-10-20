-- Registration connects the CUSTOMER role by name; a numeric role ID is not stable.
ALTER TABLE "User" ALTER COLUMN "roleId" DROP DEFAULT;
