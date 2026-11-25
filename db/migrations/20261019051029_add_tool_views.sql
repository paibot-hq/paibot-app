CREATE TABLE `tool_views` (
	`slug` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`slug`, `day`)
);
--> statement-breakpoint
CREATE INDEX `tool_views_day_idx` ON `tool_views` (`day`);