CREATE TABLE `english_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`unit` text NOT NULL,
	`item` text NOT NULL,
	`set_id` text NOT NULL,
	`position` integer NOT NULL,
	`published` integer NOT NULL,
	`answer_index` integer NOT NULL,
	`payload` text NOT NULL,
	`grade` text NOT NULL,
	`tier` integer DEFAULT 2 NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `english_problems_set_idx` ON `english_problems` (`unit`,`item`,`set_id`,`published`,`position`);--> statement-breakpoint
CREATE INDEX `english_problems_grade_tier_idx` ON `english_problems` (`grade`,`tier`,`published`);--> statement-breakpoint
CREATE TABLE `english_set_results` (
	`unit` text NOT NULL,
	`item` text NOT NULL,
	`set_id` text NOT NULL,
	`day` text NOT NULL,
	`correct` integer NOT NULL,
	`total` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`unit`, `item`, `set_id`, `day`, `correct`, `total`)
);
--> statement-breakpoint
CREATE INDEX `english_set_results_day_idx` ON `english_set_results` (`day`);