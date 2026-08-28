-- Update 4 schema (safe to re-run: ignore errors if the column/table already exist)

ALTER TABLE `transactions`
  ADD COLUMN `savings_amount` decimal(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS `offer_watchlist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `offer_id` int(11) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_offer` (`user_id`, `offer_id`),
  KEY `user_id` (`user_id`),
  KEY `offer_id` (`offer_id`),
  CONSTRAINT `watchlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `watchlist_offer` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `merchants` (`name`, `category`, `description`, `address`) VALUES
('Chaldal', 'Shopping', 'Online grocery delivery across Dhaka', 'Online'),
('US-Bangla Airlines', 'Travel', 'Domestic and regional airline', 'Dhaka'),
('Coffee World', 'Dining', 'Cafe chain for coffee and pastries', 'Multiple locations'),
('Apex', 'Shopping', 'Footwear and accessories retailer', 'Multiple locations');
