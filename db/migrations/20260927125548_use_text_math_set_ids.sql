-- Applied to both databases before the move to Void; marked so Void accepts it in the history.
-- void:allow-destructive
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_math_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`unit` text NOT NULL,
	`set_id` text NOT NULL,
	`set_version` text NOT NULL,
	`problem_ids` text NOT NULL,
	`answers` text NOT NULL,
	`correct` integer NOT NULL,
	`total` integer NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_math_attempts`("id", "user_id", "unit", "set_id", "set_version", "problem_ids", "answers", "correct", "total", "completed_at") SELECT "id", "user_id", "unit", "set_id", "set_version", "problem_ids", "answers", "correct", "total", "completed_at" FROM `math_attempts`;--> statement-breakpoint
DROP TABLE `math_attempts`;--> statement-breakpoint
ALTER TABLE `__new_math_attempts` RENAME TO `math_attempts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `math_attempts_user_unit_idx` ON `math_attempts` (`user_id`,`unit`,`set_id`,`completed_at`);--> statement-breakpoint
CREATE TABLE `__new_math_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`unit` text NOT NULL,
	`set_id` text NOT NULL,
	`position` integer NOT NULL,
	`published` integer NOT NULL,
	`answer_index` integer NOT NULL,
	`payload` text NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_math_problems`("id", "unit", "set_id", "position", "published", "answer_index", "payload", "reviewed_at") SELECT "id", "unit", "set_id", "position", "published", "answer_index", "payload", "reviewed_at" FROM `math_problems`;--> statement-breakpoint
DROP TABLE `math_problems`;--> statement-breakpoint
ALTER TABLE `__new_math_problems` RENAME TO `math_problems`;--> statement-breakpoint
CREATE INDEX `math_problems_unit_set_idx` ON `math_problems` (`unit`,`set_id`,`published`,`position`);
