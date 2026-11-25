-- History saved before learning items existed has item = '' and a set id such as
-- "order-a" or "trinomial-b". Move it to the new (item, set) keys the pages use:
-- the sets that were renamed first, then "<item>-<letter>" (a, b, ... are sets 1, 2, ...).
UPDATE `math_attempts` SET `item` = 'order-of-operations', `set_id` = '1' WHERE `item` = '' AND `unit` = 'arith' AND `set_id` = 'order-a';--> statement-breakpoint
UPDATE `math_attempts` SET `item` = 'order-of-operations', `set_id` = '2' WHERE `item` = '' AND `unit` = 'arith' AND `set_id` = 'order-b';--> statement-breakpoint
UPDATE `math_attempts` SET `item` = 'simple-word-problems', `set_id` = '1' WHERE `item` = '' AND `unit` = 'arith' AND `set_id` = 'word-a';--> statement-breakpoint
UPDATE `math_attempts` SET `item` = 'word-problems', `set_id` = '1' WHERE `item` = '' AND `unit` = 'arith' AND `set_id` = 'word-b';--> statement-breakpoint
UPDATE `math_attempts` SET `item` = 'difference-of-squares', `set_id` = '1' WHERE `item` = '' AND `unit` = 'factorization' AND `set_id` = 'squares-a';--> statement-breakpoint
UPDATE `math_attempts` SET `item` = 'four-operations', `set_id` = '1' WHERE `item` = '' AND `unit` = 'signed' AND `set_id` = 'four-ops-a';--> statement-breakpoint
UPDATE `math_attempts` SET `item` = substr(`set_id`, 1, length(`set_id`) - 2), `set_id` = CAST(unicode(substr(`set_id`, -1)) - 96 AS TEXT) WHERE `item` = '' AND `set_id` GLOB '*-[a-z]';
