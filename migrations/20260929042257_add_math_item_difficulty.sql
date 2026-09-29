DROP INDEX `math_attempts_user_unit_idx`;--> statement-breakpoint
ALTER TABLE `math_attempts` ADD `item` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `math_attempts_user_set_idx` ON `math_attempts` (`user_id`,`unit`,`item`,`set_id`,`completed_at`);--> statement-breakpoint
DROP INDEX `math_problems_unit_set_idx`;--> statement-breakpoint
ALTER TABLE `math_problems` ADD `item` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `math_problems` ADD `difficulty` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `math_problems_set_idx` ON `math_problems` (`unit`,`item`,`set_id`,`published`,`position`);--> statement-breakpoint
CREATE INDEX `math_problems_difficulty_idx` ON `math_problems` (`unit`,`item`,`difficulty`,`published`);