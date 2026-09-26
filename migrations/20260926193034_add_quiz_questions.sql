CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`published` integer NOT NULL,
	`answer_index` integer NOT NULL,
	`translations` text NOT NULL,
	`source` text NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quiz_published_idx` ON `quiz_questions` (`published`);