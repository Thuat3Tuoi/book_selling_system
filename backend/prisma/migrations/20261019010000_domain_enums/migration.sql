CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
CREATE TYPE "BookStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "NotificationType" AS ENUM (
  'INFO', 'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_SHIPPING',
  'ORDER_COMPLETED', 'ORDER_CANCELLED', 'SYSTEM', 'THONG BAO'
);
CREATE TYPE "OutboxEventType" AS ENUM ('order.created');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'DEAD');

ALTER TABLE "Role" ALTER COLUMN "roleName" TYPE "RoleName"
  USING "roleName"::"RoleName";

ALTER TABLE "Book" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Book" ALTER COLUMN "status" TYPE "BookStatus"
  USING "status"::"BookStatus";
ALTER TABLE "Book" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"BookStatus";

ALTER TABLE "Notification" ALTER COLUMN "notifyType" TYPE "NotificationType"
  USING "notifyType"::"NotificationType";

ALTER TABLE "OutboxEvent" ALTER COLUMN "eventType" TYPE "OutboxEventType"
  USING "eventType"::"OutboxEventType";
ALTER TABLE "OutboxEvent" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OutboxEvent" ALTER COLUMN "status" TYPE "OutboxStatus"
  USING "status"::"OutboxStatus";
ALTER TABLE "OutboxEvent" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OutboxStatus";
