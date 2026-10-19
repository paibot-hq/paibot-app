CREATE TABLE `iq_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`score` integer NOT NULL,
	`seconds` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `iq_results_score_idx` ON `iq_results` (`score`);