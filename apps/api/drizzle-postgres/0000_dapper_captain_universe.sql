CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"mock_test_id" text NOT NULL,
	"status" text NOT NULL,
	"answers_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"answer_revision" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"total_questions" integer NOT NULL,
	"percentage" integer,
	"completion_reason" text,
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mock_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"question_count" integer NOT NULL,
	"test_json" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_owner_completed" ON "attempts" USING btree ("clerk_user_id","completed_at");--> statement-breakpoint
CREATE INDEX "attempts_test" ON "attempts" USING btree ("mock_test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_one_active_per_user_test" ON "attempts" USING btree ("clerk_user_id","mock_test_id") WHERE "attempts"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "mock_tests_owner_created" ON "mock_tests" USING btree ("clerk_user_id","created_at");