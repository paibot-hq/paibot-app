CREATE TABLE `math_arith_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` integer NOT NULL,
	`position` integer NOT NULL,
	`published` integer NOT NULL,
	`expression` text NOT NULL,
	`word` text,
	`choices` text NOT NULL,
	`answer_index` integer NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `math_arith_set_idx` ON `math_arith_problems` (`set_id`,`published`,`position`);