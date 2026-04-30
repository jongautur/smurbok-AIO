ALTER TABLE "Reminder" RENAME COLUMN "notified_14_days" TO "notified_stage1";
ALTER TABLE "Reminder" RENAME COLUMN "notified_7_days" TO "notified_stage2";
ALTER TABLE "Reminder" RENAME COLUMN "notified_due_date" TO "notified_stage3";
