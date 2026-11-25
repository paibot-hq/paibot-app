CREATE TABLE `math_set_results` (
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
CREATE INDEX `math_set_results_day_idx` ON `math_set_results` (`day`);