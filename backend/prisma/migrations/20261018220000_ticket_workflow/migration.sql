BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');
ALTER TABLE "public"."Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "public"."TicketStatus_old";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

ALTER TABLE "Ticket" ADD COLUMN "category" TEXT,
ALTER COLUMN "status" SET DEFAULT 'NEW';
