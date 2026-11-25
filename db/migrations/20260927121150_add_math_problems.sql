-- Applied to both databases before the move to Void; marked so Void accepts it in the history.
-- void:allow-destructive
CREATE TABLE `math_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`unit` text NOT NULL,
	`set_id` integer NOT NULL,
	`position` integer NOT NULL,
	`published` integer NOT NULL,
	`answer_index` integer NOT NULL,
	`payload` text NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `math_problems_unit_set_idx` ON `math_problems` (`unit`,`set_id`,`published`,`position`);--> statement-breakpoint
DROP TABLE `math_arith_problems`;--> statement-breakpoint
DROP TABLE `math_factorization_problems`;
