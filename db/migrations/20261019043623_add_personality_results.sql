CREATE TABLE `personality_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`extraversion` integer NOT NULL,
	`agreeableness` integer NOT NULL,
	`conscientiousness` integer NOT NULL,
	`stability` integer NOT NULL,
	`openness` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
