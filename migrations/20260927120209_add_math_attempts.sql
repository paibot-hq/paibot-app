CREATE TABLE `math_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`unit` text NOT NULL,
	`set_id` integer NOT NULL,
	`set_version` text NOT NULL,
	`problem_ids` text NOT NULL,
	`answers` text NOT NULL,
	`correct` integer NOT NULL,
	`total` integer NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `math_attempts_user_unit_idx` ON `math_attempts` (`user_id`,`unit`,`set_id`,`completed_at`);