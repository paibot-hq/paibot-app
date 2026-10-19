CREATE TABLE `reaction_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ms` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reaction_results_ms_idx` ON `reaction_results` (`ms`);