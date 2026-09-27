DROP INDEX IF EXISTS "attempts_owner_completed";
--> statement-breakpoint
DROP INDEX IF EXISTS "attempts_one_active_per_user_test";
--> statement-breakpoint
DROP INDEX IF EXISTS "mock_tests_owner_created";
--> statement-breakpoint
ALTER TABLE "attempts" DROP COLUMN IF EXISTS "clerk_user_id";
--> statement-breakpoint
ALTER TABLE "mock_tests" DROP COLUMN IF EXISTS "clerk_user_id";
--> statement-breakpoint
CREATE INDEX "attempts_completed" ON "attempts" USING btree ("completed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_one_active_per_test" ON "attempts" USING btree ("mock_test_id") WHERE "attempts"."status" = 'in_progress';
--> statement-breakpoint
CREATE INDEX "mock_tests_updated" ON "mock_tests" USING btree ("updated_at");
