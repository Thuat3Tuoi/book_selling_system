-- Reference roles are required in every environment; demo users remain opt-in.
INSERT INTO "Role" ("roleName", "status") VALUES
  ('ADMIN', true),
  ('CUSTOMER', true),
  ('STAFF', true)
ON CONFLICT ("roleName") DO NOTHING;

-- Never infer an account's role from an auto-incremented numeric ID.
ALTER TABLE "User" ALTER COLUMN "roleId" DROP DEFAULT;
