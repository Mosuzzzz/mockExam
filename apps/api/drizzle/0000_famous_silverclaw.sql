CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text NOT NULL,
	`mock_test_id` text NOT NULL,
	`status` text NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`answer_revision` integer DEFAULT 0 NOT NULL,
	`score` integer,
	`total_questions` integer NOT NULL,
	`percentage` integer,
	`completion_reason` text,
	`started_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`mock_test_id`) REFERENCES `mock_tests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_owner_completed` ON `attempts` (`clerk_user_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `attempts_test` ON `attempts` (`mock_test_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_one_active_per_user_test` ON `attempts` (`clerk_user_id`,`mock_test_id`) WHERE "attempts"."status" = 'in_progress';--> statement-breakpoint
CREATE TABLE `mock_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`duration_minutes` integer NOT NULL,
	`question_count` integer NOT NULL,
	`test_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mock_tests_owner_created` ON `mock_tests` (`clerk_user_id`,`created_at`);