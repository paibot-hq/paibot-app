CREATE TABLE `breach_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`entry` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `breach_incidents_position_idx` ON `breach_incidents` (`position`);--> statement-breakpoint
CREATE TABLE `breach_list` (
	`id` text PRIMARY KEY NOT NULL,
	`as_of` text NOT NULL,
	`note` text NOT NULL
);
