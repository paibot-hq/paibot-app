CREATE TABLE `typing_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mode` text DEFAULT 'ja' NOT NULL,
	`score` integer NOT NULL,
	`keys` integer NOT NULL,
	`misses` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `typing_results_mode_score_idx` ON `typing_results` (`mode`,`score`);