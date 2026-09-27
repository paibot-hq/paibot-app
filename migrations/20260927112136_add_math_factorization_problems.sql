CREATE TABLE `math_factorization_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` integer NOT NULL,
	`position` integer NOT NULL,
	`published` integer NOT NULL,
	`p` integer NOT NULL,
	`q` integer NOT NULL,
	`choices` text NOT NULL,
	`answer_index` integer NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `math_factorization_set_idx` ON `math_factorization_problems` (`set_id`,`published`,`position`);