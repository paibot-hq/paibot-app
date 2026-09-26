CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`app_slug` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`user_id`, `app_slug`)
);
