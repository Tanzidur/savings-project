-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 02, 2026 at 08:31 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `savings_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `articles`
--

CREATE TABLE `articles` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `summary` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `read_time` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `articles`
--

INSERT INTO `articles` (`id`, `title`, `category`, `summary`, `content`, `read_time`) VALUES
(1, 'Understanding Credit Card Interest', 'Credit Basics', 'Learn how interest is calculated and how to avoid unnecessary charges.', 'Credit card interest, or APR, is charged when you carry a balance past your due date. Paying your full statement balance every month avoids interest entirely. If you only pay the minimum, interest compounds on the remaining balance, which can grow quickly over time.', '4 min'),
(2, 'EMI vs Full Payment: What to Choose', 'Smart Spending', 'A breakdown of when EMI makes sense and when it does not.', 'EMI (Equal Monthly Installment) lets you split a large purchase into smaller payments, often interest-free for 3-6 months on partner merchants. It makes sense for planned large purchases, but can encourage overspending if used casually for small items you could pay for outright.', '5 min'),
(3, 'Building an Emergency Fund', 'Savings', 'Why every household needs a cash buffer, and how much is enough.', 'An emergency fund should cover 3-6 months of essential expenses, kept in an easily accessible savings account. Start small: even saving 10% of monthly income consistently builds a meaningful buffer within a year.', '3 min'),
(4, 'How Reward Points Actually Work', 'Credit Basics', 'Reward points are not free money, here is what to know.', 'Reward points are typically earned per unit spent (e.g. 1 point per 50 BDT) and can be redeemed for cashback, vouchers, or merchandise. Points often expire, and redemption value varies by card, so compare the actual cash value before assuming points are a good deal.', '4 min'),
(5, 'Avoiding Common Debt Traps', 'Debt Management', 'Warning signs that your card usage is becoming a problem.', 'Common warning signs include only paying the minimum due, using one card to pay another, and not knowing your total outstanding balance across cards. Tracking spending monthly and setting a hard limit per card helps avoid a debt spiral.', '5 min');

-- --------------------------------------------------------

--
-- Table structure for table `banks`
--

CREATE TABLE `banks` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `banks`
--

INSERT INTO `banks` (`id`, `name`) VALUES
('bracbank', 'BRAC Bank'),
('citybank', 'City Bank'),
('dbbl', 'Dutch-Bangla Bank');

-- --------------------------------------------------------

--
-- Table structure for table `cards`
--

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

--
-- Dumping data for table `cards`
--

INSERT INTO `cards` (`id`, `bank_id`, `network`, `type`, `tier`, `cashback`, `reward_points`, `emi`, `annual_fee`) VALUES
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

--
-- Table structure for table `merchants`
--

CREATE TABLE `merchants` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `address` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `merchants`
--

INSERT INTO `merchants` (`id`, `name`, `category`, `description`, `address`) VALUES
(1, 'Daraz', 'Shopping', 'Leading online marketplace for electronics, fashion, and more', 'Online'),
(2, 'Star Cineplex', 'Entertainment', 'Premier cinema chain across Bangladesh', 'Bashundhara City, Dhaka'),
(3, 'Pizza Hut', 'Dining', 'International pizza and dine-in restaurant chain', 'Gulshan, Dhaka'),
(4, 'Shwapno', 'Shopping', 'Retail supermarket chain for groceries and essentials', 'Multiple locations'),
(5, 'Biman Bangladesh', 'Travel', 'National flag carrier airline of Bangladesh', 'Motijheel, Dhaka');

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` int(11) NOT NULL,
  `merchant` varchar(100) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `discount` varchar(30) DEFAULT NULL,
  `bank_id` varchar(50) DEFAULT NULL,
  `valid_until` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `offers`
--

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
(10, 'Biman Bangladesh', '10% Off Seat Upgrades', 'Discount on business class upgrades for existing bookings', 'Travel', '10%', 'bracbank', '2027-01-31');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `transaction_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `category`, `amount`, `transaction_date`) VALUES
(1, 1, 'Shopping', 3500.00, '2026-07-01'),
(2, 1, 'Dining', 1200.00, '2026-07-05'),
(3, 1, 'Groceries', 2800.00, '2026-07-08'),
(4, 1, 'Entertainment', 900.00, '2026-07-12'),
(5, 1, 'Travel', 4500.00, '2026-07-15'),
(6, 1, 'Shopping', 1800.00, '2026-07-18');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `created_at`) VALUES
(1, 'Tanzidur Rahman', 'tanzidurrahman@gmail.com', 'scrypt:32768:8:1$c1dqHzhDjR8ZTWOE$5ad6a2b19c0c0877c358f9eb5b1ea61a25b640aae1f080dbd81106af5d4b8a03b7736c1124fdec50764ee3f0cd4f3cba95e5dec4f81b105374c1b60ec6d172ad', '2026-07-23 14:25:48'),
(2, 'Afid Mostakim', 'afidmostakim@gmail.com', 'scrypt:32768:8:1$5lcDvuaXS5Yp3oNM$7d7b1c194abc9ff66405eea2510e9e5d3f270591aced8f6168d7b89a59320042d1a01c50f9ba3529ce65dedb4c58f8643450dc334caad6ad560d10120c046bf2', '2026-08-02 06:13:08');

-- --------------------------------------------------------

--
-- Table structure for table `user_cards`
--

CREATE TABLE `user_cards` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `card_id` varchar(50) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_cards`
--

INSERT INTO `user_cards` (`id`, `user_id`, `card_id`, `added_at`) VALUES
(1, 1, 'brac-npsb-classic', '2026-07-23 22:13:27'),
(2, 1, 'dbbl-visa-classic', '2026-07-23 22:26:35'),
(3, 2, 'city-master-signature', '2026-08-02 06:14:12'),
(4, 2, 'brac-master-signature', '2026-08-02 06:25:47');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `articles`
--
ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `banks`
--
ALTER TABLE `banks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_id` (`bank_id`);

--
-- Indexes for table `merchants`
--
ALTER TABLE `merchants`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_id` (`bank_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_cards`
--
ALTER TABLE `user_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `card_id` (`card_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `articles`
--
ALTER TABLE `articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `merchants`
--
ALTER TABLE `merchants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `offers`
--
ALTER TABLE `offers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_cards`
--
ALTER TABLE `user_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cards`
--
ALTER TABLE `cards`
  ADD CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`);

--
-- Constraints for table `offers`
--
ALTER TABLE `offers`
  ADD CONSTRAINT `offers_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_cards`
--
ALTER TABLE `user_cards`
  ADD CONSTRAINT `user_cards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `user_cards_ibfk_2` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
