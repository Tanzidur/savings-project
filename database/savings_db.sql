-- Savings — full schema + sample data (single file)
-- Import THIS file only. Do not use update4.sql / update5.sql (removed).
--
-- phpMyAdmin:
--   1. Create a database named savings_db (or drop and recreate it)
--   2. Select savings_db → Import → choose this file → Go
--
-- mysql CLI:
--   mysql -u root -e "CREATE DATABASE IF NOT EXISTS savings_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
--   mysql -u root savings_db < database/savings_db.sql

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `offer_watchlist`;
DROP TABLE IF EXISTS `user_cards`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `offers`;
DROP TABLE IF EXISTS `cards`;
DROP TABLE IF EXISTS `merchants`;
DROP TABLE IF EXISTS `articles`;
DROP TABLE IF EXISTS `banks`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `articles`
-- --------------------------------------------------------

CREATE TABLE `articles` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `summary` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `read_time` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `articles` (`id`, `title`, `category`, `summary`, `content`, `read_time`) VALUES
(1, 'Understanding Credit Card Interest', 'Credit Basics', 'Learn how interest is calculated and how to avoid unnecessary charges.', 'Credit card interest, or APR, is charged when you carry a balance past your due date. Paying your full statement balance every month avoids interest entirely. If you only pay the minimum, interest compounds on the remaining balance, which can grow quickly over time.', '4 min'),
(2, 'EMI vs Full Payment: What to Choose', 'Smart Spending', 'A breakdown of when EMI makes sense and when it does not.', 'EMI (Equal Monthly Installment) lets you split a large purchase into smaller payments, often interest-free for 3-6 months on partner merchants. It makes sense for planned large purchases, but can encourage overspending if used casually for small items you could pay for outright.', '5 min'),
(3, 'Building an Emergency Fund', 'Savings', 'Why every household needs a cash buffer, and how much is enough.', 'An emergency fund should cover 3-6 months of essential expenses, kept in an easily accessible savings account. Start small: even saving 10% of monthly income consistently builds a meaningful buffer within a year.', '3 min'),
(4, 'How Reward Points Actually Work', 'Credit Basics', 'Reward points are not free money, here is what to know.', 'Reward points are typically earned per unit spent (e.g. 1 point per 50 BDT) and can be redeemed for cashback, vouchers, or merchandise. Points often expire, and redemption value varies by card, so compare the actual cash value before assuming points are a good deal.', '4 min'),
(5, 'Avoiding Common Debt Traps', 'Debt Management', 'Warning signs that your card usage is becoming a problem.', 'Common warning signs include only paying the minimum due, using one card to pay another, and not knowing your total outstanding balance across cards. Tracking spending monthly and setting a hard limit per card helps avoid a debt spiral.', '5 min'),
(6, 'Debit vs Credit: Which Card Should You Carry?', 'Credit Basics', 'A simple way to choose between debit and credit for everyday spending in Bangladesh.', 'Debit cards spend money you already have. Credit cards borrow from the bank and must be repaid. For groceries and small bills, debit keeps you inside your salary. Use credit when the card has a real perk — cashback, EMI, or a live merchant offer — and only if you can pay the statement in full. If you cannot clear the bill, the APR usually costs more than the discount you just earned. On Savings, save both types on Card Perks, then let Best Card Picker rank the one that actually fits the purchase.', '6 min'),
(7, 'Annual Fee vs Cashback: Do the Math', 'Smart Spending', 'A high cashback card is only a win if you spend enough to cover the yearly fee.', 'Write down the annual fee, the cashback rate, and a realistic monthly spend. Example: a 3,000 BDT fee with 5% cashback needs about 60,000 BDT of qualifying spend per year just to break even. Fees quoted as "1500" and "1500 BDT" are the same number — compare them in BDT, not by looking at the prettier card. Lounge access and points only count if you actually use them. If your spend is low, a cheap debit card plus a live Deals & Offers promo often beats a premium credit card that sits in the drawer.', '5 min'),
(8, 'How to Read an Offer Before You Redeem', 'Smart Spending', 'Title, merchant, category, and valid-until date matter more than the big percentage.', 'Open the deal and check four things. Merchant: the discount applies at that brand, not the whole category. Category: Dining at Apex will not work if Apex is listed as Shopping. Discount type: 20% is a rate, BOGO is roughly half on a second item, Free Item is a bonus not a fake percent. Valid until: expired offers stay visible so you can learn the pattern, but Pay/Redeem is blocked. Watchlist a deal that ends within two weeks so Dashboard can remind you. When you redeem, enter the real amount — Savings estimates savings from the offer, it does not charge the merchant.', '5 min'),
(9, 'Stay Safe With Cards and OTPs', 'Debt Management', 'Most card loss in Bangladesh is social engineering, not a broken website.', 'Never share an OTP, PIN, or full card number on the phone or in chat, even if the caller names your bank. Banks do not ask you to read an SMS code to "unlock cashback". Use the official app or branch for disputes. On this site, login sessions last a day — log out on shared computers. Receipt upload sends a photo to an OCR model to guess category and amount; you still confirm before anything is saved. If a deal looks too large to be real (for example 99 million BDT on a grocery promo), treat it as a demo figure, not a target.', '4 min');

-- --------------------------------------------------------
-- Table structure for table `banks`
-- --------------------------------------------------------

CREATE TABLE `banks` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `banks` (`id`, `name`) VALUES
('afebank', 'AFE BANK'),
('bracbank', 'BRAC Bank'),
('citybank', 'City Bank'),
('dbbl', 'Dutch-Bangla Bank');

-- --------------------------------------------------------
-- Table structure for table `cards`
-- --------------------------------------------------------

CREATE TABLE `cards` (
  `id` varchar(50) NOT NULL,
  `bank_id` varchar(50) NOT NULL,
  `network` varchar(30) DEFAULT NULL,
  `type` varchar(30) DEFAULT NULL,
  `tier` varchar(30) DEFAULT NULL,
  `cashback` varchar(20) DEFAULT NULL,
  `reward_points` varchar(50) DEFAULT NULL,
  `emi` tinyint(1) DEFAULT NULL,
  `annual_fee` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `cards` (`id`, `bank_id`, `network`, `type`, `tier`, `cashback`, `reward_points`, `emi`, `annual_fee`) VALUES
('AFE CARD', 'afebank', 'MasterCard', 'Credit', 'Signature', '10', '2 pts per 50 bdt', 1, '2000'),
('AFE Enamul Card', 'afebank', 'Visa', 'Debit', 'Signature', '5', '2 pts per 50 bdt', 1, '1500'),
('brac-master-classic', 'bracbank', 'Mastercard', 'Debit', 'Classic', '1%', '1 pt per 100 BDT', 0, '350 BDT'),
('brac-master-signature', 'bracbank', 'Mastercard', 'Credit', 'Signature', '9%', '4 pts per 50 BDT', 1, '4500 BDT'),
('brac-npsb-classic', 'bracbank', 'NPSB', 'Debit', 'Classic', '1%', '1 pt per 100 BDT', 0, '300 BDT'),
('brac-visa-classic', 'bracbank', 'Visa', 'Debit', 'Classic', '1%', '1 pt per 100 BDT', 0, '300 BDT'),
('brac-visa-gold', 'bracbank', 'Visa', 'Credit', 'Gold', '4%', '2 pts per 50 BDT', 1, '1800 BDT'),
('brac-visa-platinum', 'bracbank', 'Visa', 'Credit', 'Platinum', '8%', '3 pts per 50 BDT', 1, '3000 BDT'),
('city-master-classic', 'citybank', 'Mastercard', 'Debit', 'Classic', '1.5%', '1 pt per 100 BDT', 0, '450 BDT'),
('city-master-signature', 'citybank', 'Mastercard', 'Credit', 'Signature', '10%', '4 pts per 50 BDT', 1, '5000 BDT'),
('city-npsb-gold', 'citybank', 'NPSB', 'Credit', 'Gold', '5%', '2 pts per 50 BDT', 1, '1600 BDT'),
('city-visa-classic', 'citybank', 'Visa', 'Debit', 'Classic', '2%', '1 pt per 50 BDT', 0, '500 BDT'),
('city-visa-platinum', 'citybank', 'Visa', 'Credit', 'Platinum', '8%', '3 pts per 50 BDT', 1, '3200 BDT'),
('dbbl-master-classic', 'dbbl', 'Mastercard', 'Debit', 'Classic', '1.5%', '1 pt per 100 BDT', 0, '400 BDT'),
('dbbl-master-gold', 'dbbl', 'Mastercard', 'Credit', 'Gold', '5%', '2 pts per 50 BDT', 1, '1500 BDT'),
('dbbl-npsb-platinum', 'dbbl', 'NPSB', 'Credit', 'Platinum', '6%', '2 pts per 50 BDT', 1, '2500 BDT'),
('dbbl-visa-classic', 'dbbl', 'Visa', 'Debit', 'Classic', '2%', '1 pt per 50 BDT', 0, '500 BDT'),
('dbbl-visa-gold', 'dbbl', 'Visa', 'Credit', 'Gold', '4.5%', '2 pts per 50 BDT', 1, '1700 BDT'),
('dbbl-visa-signature', 'dbbl', 'Visa', 'Credit', 'Signature', '7%', '3 pts per 50 BDT', 1, '4000 BDT');

-- --------------------------------------------------------
-- Table structure for table `merchants`
-- --------------------------------------------------------

CREATE TABLE `merchants` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `address` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `merchants` (`id`, `name`, `category`, `description`, `address`) VALUES
(1, 'Daraz', 'Shopping', 'Leading online marketplace for electronics, fashion, and more', 'Online'),
(2, 'Star Cineplex', 'Entertainment', 'Premier cinema chain across Bangladesh', 'Bashundhara City, Dhaka'),
(3, 'Pizza Hut', 'Dining', 'International pizza and dine-in restaurant chain', 'Gulshan, Dhaka'),
(4, 'Shwapno', 'Shopping', 'Retail supermarket chain for groceries and essentials', 'Multiple locations'),
(5, 'Biman Bangladesh', 'Travel', 'National flag carrier airline of Bangladesh', 'Motijheel, Dhaka'),
(6, 'Chaldal', 'Shopping', 'Online grocery delivery across Dhaka', 'Online'),
(7, 'US-Bangla Airlines', 'Travel', 'Domestic and regional airline', 'Dhaka'),
(8, 'Coffee World', 'Dining', 'Cafe chain for coffee and pastries', 'Multiple locations'),
(9, 'Apex', 'Shopping', 'Footwear and accessories retailer', 'Multiple locations');

-- --------------------------------------------------------
-- Table structure for table `offers`
-- --------------------------------------------------------

CREATE TABLE `offers` (
  `id` int(11) NOT NULL,
  `merchant` varchar(100) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `discount` varchar(30) DEFAULT NULL,
  `bank_id` varchar(50) DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `min_spend` decimal(10,2) NOT NULL DEFAULT 0,
  `discount_cap` decimal(10,2) DEFAULT NULL,
  `eligible_card_type` varchar(20) NOT NULL DEFAULT 'Any',
  `terms` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `offers` (`id`, `merchant`, `title`, `description`, `category`, `discount`, `bank_id`, `valid_until`) VALUES
(1, 'Daraz', '20% Off Electronics', 'Get 20% cashback on all electronics purchases over 5000 BDT', 'Shopping', '20%', 'dbbl', '2026-12-31'),
(2, 'Star Cineplex', 'Buy 1 Get 1 Movie Ticket', 'Free ticket with any BRAC Bank card purchase', 'Entertainment', 'BOGO', 'bracbank', '2026-09-30'),
(3, 'Pizza Hut', '15% Off Dine-in', '15% discount on total bill for dine-in orders', 'Dining', '15%', 'citybank', '2026-11-15'),
(4, 'Shwapno', '10% Cashback Groceries', 'Cashback on grocery bills above 2000 BDT', 'Shopping', '10%', 'dbbl', '2026-10-31'),
(5, 'Biman Bangladesh', '5% Off Flight Bookings', 'Discount on domestic and international flight bookings', 'Travel', '5%', 'bracbank', '2027-01-31'),
(6, 'Daraz', 'Free Delivery Weekend', 'No delivery charge on orders above 1000 BDT, Fri-Sun only', 'Shopping', 'Free Delivery', 'citybank', '2026-12-31'),
(7, 'Star Cineplex', '30% Off Popcorn Combo', 'Discount on combo purchases with any BRAC Bank card', 'Entertainment', '30%', 'bracbank', '2026-09-30'),
(8, 'Pizza Hut', 'Free Drink with Large Pizza', 'Complimentary soft drink with any large pizza order', 'Dining', 'Free Item', 'citybank', '2026-11-15'),
(9, 'Shwapno', '5% Extra on Weekend Shopping', 'Additional cashback on top of regular offer, Sat-Sun', 'Shopping', '5%', 'dbbl', '2026-10-31'),
(10, 'Biman Bangladesh', '10% Off Seat Upgrades', 'Discount on business class upgrades for existing bookings', 'Travel', '10%', 'bracbank', '2027-01-31'),
(11, 'KFC', 'Buy 1 Get 1 Fried Chicken', 'BOGO on all fried chicken buckets', 'Dining', 'BOGO', 'dbbl', '2026-06-30'),
(12, 'Aarong', '15% Off Eid Collection', 'Discount on all Eid collection items', 'Shopping', '15%', 'bracbank', '2026-07-15'),
(13, 'Jamuna Future Park', '10% Off Food Court', 'Discount at all food court outlets', 'Dining', '10%', 'citybank', '2026-08-01'),
(14, 'Chaldal', '20% Off First Order', 'New user discount on groceries', 'Shopping', '20%', 'dbbl', '2026-12-31'),
(15, 'US-Bangla Airlines', '7% Off Domestic Flights', 'Discount on all domestic routes', 'Travel', '7%', 'citybank', '2026-11-30'),
(16, 'Coffee World', 'Free Pastry with Coffee', 'Complimentary pastry with any coffee purchase', 'Dining', 'Free Item', 'bracbank', '2026-10-15'),
(17, 'Apex', '25% Off Footwear', 'Discount on all footwear items', 'Shopping', '25%', 'citybank', '2027-02-28');

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `nid` varchar(20) DEFAULT NULL,
  `phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `nid_verified` tinyint(1) NOT NULL DEFAULT 0,
  `monthly_savings_goal` decimal(10,2) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `phone`, `nid`, `phone_verified`, `nid_verified`, `created_at`) VALUES
(1, 'Tanzidur Rahman', 'tanzidurrahman@gmail.com', 'scrypt:32768:8:1$J5TK20WAdpBbj79O$7c5565fee97bb2a8bba084216594905ba2759a9452f5bd76333db42399d9939b4ca510b7bdccf7b78376ae9ec5cde099ba10a08d0d0d6417210370c0ccda92bd', NULL, NULL, 0, 0, '2026-07-23 14:25:48'),
(2, 'Afid Mostakim', 'afidmostakim@gmail.com', 'scrypt:32768:8:1$5lcDvuaXS5Yp3oNM$7d7b1c194abc9ff66405eea2510e9e5d3f270591aced8f6168d7b89a59320042d1a01c50f9ba3529ce65dedb4c58f8643450dc334caad6ad560d10120c046bf2', NULL, NULL, 0, 0, '2026-08-02 06:13:08');

-- --------------------------------------------------------
-- Table structure for table `transactions`
-- --------------------------------------------------------

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `transaction_date` date DEFAULT NULL,
  `offer_title` varchar(150) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `savings_amount` decimal(10,2) DEFAULT 0,
  `offer_id` int(11) DEFAULT NULL,
  `card_id` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `transactions` (`id`, `user_id`, `category`, `amount`, `transaction_date`, `offer_title`, `description`, `savings_amount`) VALUES
(1, 1, 'Shopping', 3500.00, '2026-07-01', NULL, NULL, 0),
(2, 1, 'Dining', 1200.00, '2026-07-05', NULL, NULL, 0),
(3, 1, 'Groceries', 2800.00, '2026-07-08', NULL, NULL, 0),
(4, 1, 'Entertainment', 900.00, '2026-07-12', NULL, NULL, 0),
(5, 1, 'Travel', 4500.00, '2026-07-15', NULL, NULL, 0),
(6, 1, 'Shopping', 1800.00, '2026-07-18', NULL, NULL, 0),
(7, 2, 'Entertainment', 200.00, '2026-08-09', NULL, NULL, 0),
(8, 2, 'Entertainment', 1200.00, '2026-08-09', NULL, NULL, 0),
(9, 2, 'Travel', 25000.00, '2026-08-09', NULL, NULL, 0),
(10, 2, 'Travel', 555555.00, '2026-08-09', NULL, NULL, 0),
(11, 2, 'Travel', 1500.00, '2026-08-09', NULL, NULL, 0),
(12, 2, 'Dining', 500000.00, '2026-08-09', '15% Off Dine-in', NULL, 0),
(13, 2, 'Shopping', 99999999.99, '2026-08-09', '10% Cashback Groceries', NULL, 0),
(14, 1, 'Travel', 12000.00, '2026-08-09', '5% Off Flight Bookings', NULL, 0),
(15, 1, 'Groceries', 148.33, '2026-08-23', NULL, 'Groceries at Cedar Spar', 0),
(16, 1, 'Dining', 2555.00, '2026-08-23', 'Free Drink with Large Pizza', 'Free Drink with Large Pizza', 0),
(17, 1, 'Travel', 25252.00, '2026-08-24', '10% Off Seat Upgrades', '10% Off Seat Upgrades', 0);

-- --------------------------------------------------------
-- Table structure for table `offer_watchlist`
-- --------------------------------------------------------

CREATE TABLE `offer_watchlist` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `offer_id` int(11) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `user_cards`
-- --------------------------------------------------------

CREATE TABLE `user_cards` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `card_id` varchar(50) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `user_cards` (`id`, `user_id`, `card_id`, `added_at`) VALUES
(1, 1, 'brac-npsb-classic', '2026-07-23 22:13:27'),
(3, 2, 'city-master-signature', '2026-08-02 06:14:12'),
(4, 2, 'brac-master-signature', '2026-08-02 06:25:47'),
(5, 2, 'dbbl-visa-signature', '2026-08-09 10:19:18'),
(14, 1, 'brac-visa-gold', '2026-08-23 22:05:02');

-- --------------------------------------------------------
-- Indexes
-- --------------------------------------------------------

ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `banks`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_id` (`bank_id`);

ALTER TABLE `merchants`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_id` (`bank_id`);

ALTER TABLE `offer_watchlist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_offer` (`user_id`, `offer_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `offer_id` (`offer_id`);

ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `offer_id` (`offer_id`),
  ADD KEY `card_id` (`card_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

ALTER TABLE `user_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `card_id` (`card_id`);

-- --------------------------------------------------------
-- AUTO_INCREMENT
-- --------------------------------------------------------

ALTER TABLE `articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `merchants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `offers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

ALTER TABLE `offer_watchlist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `user_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

-- --------------------------------------------------------
-- Foreign keys
-- --------------------------------------------------------

ALTER TABLE `cards`
  ADD CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`);

ALTER TABLE `offers`
  ADD CONSTRAINT `offers_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`);

ALTER TABLE `offer_watchlist`
  ADD CONSTRAINT `watchlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `watchlist_offer` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE;

ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `user_cards`
  ADD CONSTRAINT `user_cards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `user_cards_ibfk_2` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`);

COMMIT;
