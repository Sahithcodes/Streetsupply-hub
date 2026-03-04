--
-- This script prepares the 'ProjectX' database for a multi-tenant application.
-- It creates a detailed schema and populates it with rich synthetic data
-- for multiple suppliers and vendors.
--

-- Create and select the database
CREATE DATABASE IF NOT EXISTS ProjectX;
USE ProjectX;

-- Temporarily disable foreign key checks for a clean setup.
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in a safe order
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `group_order_members`;
DROP TABLE IF EXISTS `group_orders`;
DROP TABLE IF EXISTS `bargains`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `friends`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;

-- Re-enable foreign key checks.
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------
-- TABLE: users
-- ---------------------------------
-- Central table for authentication and basic user info.
-- The 'role' column distinguishes between vendors and suppliers.
--
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(255) NOT NULL,
    `business_name` VARCHAR(255),
    `address` TEXT,
    `phone` VARCHAR(20) NOT NULL UNIQUE,
    `role` ENUM('vendor', 'supplier') NOT NULL,
    `products_summary` TEXT COMMENT 'Only used for initial registration info for suppliers',
    `aadhaar_image` VARCHAR(255),
    `otp` VARCHAR(10),
    `otp_expiry` DATETIME,
    `is_verified` BOOLEAN DEFAULT TRUE,
    `trust_score` INT UNSIGNED DEFAULT 0 COMMENT '0-100 credibility score',
    `rating` DECIMAL(2,1) DEFAULT 0.0 COMMENT 'Average user rating on 0.0-5.0 scale',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------
-- TABLE: products
-- ---------------------------------
-- Each product is now owned by a supplier via 'supplier_id'.
--
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `supplier_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `supplier_display_name` VARCHAR(255),
    `price` DECIMAL(10, 2) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `moq` INT NOT NULL COMMENT 'Minimum Order Quantity',
    `category` VARCHAR(50),
    `image` VARCHAR(255),
    `stock_quantity` INT NOT NULL DEFAULT 1000,
    FOREIGN KEY (`supplier_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: orders
-- ---------------------------------
-- Each order is placed by a vendor via 'vendor_id'.
--
CREATE TABLE `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vendor_id` INT NOT NULL,
    `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Processing',
    `total_amount` DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: order_items
-- ---------------------------------
-- The line items for each order, linking orders and products.
--
CREATE TABLE `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `price_per_unit` DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: friends
-- ---------------------------------
CREATE TABLE `friends` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `friend_user_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_friend` (`user_id`, `friend_user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`friend_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: group_orders
-- ---------------------------------
CREATE TABLE `group_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `creator_vendor_id` INT NOT NULL,
    `status` ENUM('Open', 'Closed') DEFAULT 'Open',
    `target_moq` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`creator_vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: group_order_members
-- ---------------------------------
CREATE TABLE `group_order_members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `group_order_id` INT NOT NULL,
    `vendor_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_group_member` (`group_order_id`, `vendor_id`),
    FOREIGN KEY (`group_order_id`) REFERENCES `group_orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: reviews
-- ---------------------------------
CREATE TABLE `reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `vendor_id` INT NOT NULL,
    `rating` INT NOT NULL,
    `review_text` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: support_tickets
-- ---------------------------------
CREATE TABLE `support_tickets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('complaint', 'query') DEFAULT 'query',
    `status` ENUM('Open', 'Closed') DEFAULT 'Open',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ---------------------------------
-- TABLE: bargains
-- ---------------------------------
CREATE TABLE `bargains` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `vendor_id` INT NOT NULL,
    `offer_price` DECIMAL(10,2) NOT NULL,
    `quantity` INT NOT NULL,
    `status` ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);


-- ---------------------------------
--
-- SYNTHETIC DATA INSERTION
--
-- ---------------------------------

-- -- SUPPLIERS --
INSERT INTO `users` (`id`, `full_name`, `business_name`, `address`, `phone`, `role`, `trust_score`, `rating`) VALUES
(1, 'Ramesh Kumar', 'Kisan Agri Supply', '123 Agri Lane, Nashik, Maharashtra', '9876543210', 'supplier', 91, 4.7),
(2, 'Deepa Sharma', 'Himalayan Organics', '45 Green Valley, Dehradun, Uttarakhand', '9876543211', 'supplier', 94, 4.8),
(5, 'Vikram Rao', 'Sunrise Oils', '19 Refinery Road, Indore, Madhya Pradesh', '9876543212', 'supplier', 88, 4.5),
(6, 'Meera Iyer', 'Urban Grains Co', '12 Grain Park, Pune, Maharashtra', '9876543213', 'supplier', 90, 4.6);

-- -- VENDORS --
INSERT INTO `users` (`id`, `full_name`, `business_name`, `address`, `phone`, `role`, `trust_score`, `rating`) VALUES
(3, 'Sunil Patel', 'FreshMart Grocers', '78 Market Road, Ahmedabad, Gujarat', '9123456780', 'vendor', 86, 4.3),
(4, 'Priya Singh', 'Annapurna Eats', '90 Food Street, Bengaluru, Karnataka', '9123456781', 'vendor', 89, 4.4),
(7, 'Rohit Mehta', 'CityMart Retail', '11 Central Plaza, Mumbai, Maharashtra', '9123456782', 'vendor', 84, 4.2),
(8, 'Ananya Das', 'GreenLeaf Cafe', '22 Park Street, Kolkata, West Bengal', '9123456783', 'vendor', 82, 4.1),
(9, 'Farah Khan', 'Spice Bazaar', '55 Old Market, Jaipur, Rajasthan', '9123456784', 'vendor', 85, 4.2);

-- -- PRODUCTS (multiple categories to cover UI filters) --
INSERT INTO `products` (`supplier_id`, `name`, `supplier_display_name`, `price`, `unit`, `moq`, `category`, `stock_quantity`) VALUES
(1, 'Premium Onions', 'Kisan Agri Supply', 28.50, 'kg', 50, 'vegetable', 2000),
(1, 'MP Sharbati Wheat', 'Kisan Agri Supply', 42.00, 'kg', 100, 'grains', 5000),
(1, 'Farm-Fresh Potatoes', 'Kisan Agri Supply', 22.00, 'kg', 50, 'vegetable', 3500),
(1, 'Refined Wheat Flour', 'Kisan Agri Supply', 38.00, 'kg', 100, 'grains', 2800),
(1, 'Fresh Tomatoes', 'Kisan Agri Supply', 34.00, 'kg', 40, 'vegetable', 2400),
(1, 'Green Chillies', 'Kisan Agri Supply', 70.00, 'kg', 20, 'vegetable', 900),
(1, 'Bajra Flour', 'Kisan Agri Supply', 46.00, 'kg', 60, 'grains', 1800),
(2, 'Organic Basmati Rice', 'Himalayan Organics', 155.00, 'kg', 40, 'grains', 1500),
(2, 'Cold-Pressed Mustard Oil', 'Himalayan Organics', 220.00, 'L', 20, 'oil', 800),
(2, 'Organic Turmeric Powder', 'Himalayan Organics', 350.00, 'kg', 10, 'spices', 500),
(2, 'Kashmiri Apples', 'Himalayan Organics', 180.00, 'kg', 30, 'fruit', 1000),
(2, 'Sona Masoori Rice', 'Himalayan Organics', 82.00, 'kg', 60, 'grains', 2200),
(2, 'Groundnut Oil', 'Himalayan Organics', 195.00, 'L', 25, 'oil', 950),
(2, 'Besan Flour', 'Himalayan Organics', 78.00, 'kg', 40, 'grains', 1600),
(5, 'Sunflower Oil Tin', 'Sunrise Oils', 1650.00, 'tin', 2, 'oil', 600),
(5, 'Rice Bran Oil', 'Sunrise Oils', 120.00, 'L', 50, 'oil', 1200),
(5, 'Palmolein Oil', 'Sunrise Oils', 108.00, 'L', 60, 'oil', 1800),
(5, 'Soybean Oil (Bulk)', 'Sunrise Oils', 112.00, 'L', 70, 'oil', 1700),
(6, 'Premium Maida (Flour)', 'Urban Grains Co', 45.00, 'kg', 50, 'grains', 2200),
(6, 'Red Onions', 'Urban Grains Co', 30.00, 'kg', 25, 'vegetable', 2600),
(6, 'Toor Dal', 'Urban Grains Co', 95.00, 'kg', 50, 'grains', 1400),
(6, 'Chana Dal', 'Urban Grains Co', 82.00, 'kg', 50, 'grains', 1600),
(6, 'Moong Dal', 'Urban Grains Co', 108.00, 'kg', 40, 'grains', 1300),
(6, 'Semolina (Sooji)', 'Urban Grains Co', 48.00, 'kg', 50, 'grains', 1900);

ALTER TABLE `products` AUTO_INCREMENT = 26;

-- -- ORDERS (multiple vendors for history, tracking, trends, group-order simulation) --
INSERT INTO `orders` (`id`, `vendor_id`, `order_date`, `status`, `total_amount`) VALUES
(1, 3, '2026-02-15 10:30:00', 'Delivered', 1275.00),
(2, 3, '2026-02-20 14:00:00', 'Shipped', 6000.00),
(3, 4, '2026-02-18 09:00:00', 'Processing', 8400.00),
(4, 4, '2026-02-22 18:00:00', 'Delivered', 6100.00),
(5, 7, '2026-02-23 11:15:00', 'Shipped', 5400.00),
(6, 8, '2026-02-24 16:45:00', 'Processing', 6200.00),
(7, 9, '2026-02-21 12:10:00', 'Delivered', 9000.00),
-- Group-order simulation: multiple vendors ordering the same product around the same time
(8, 3, '2026-02-24 10:05:00', 'Processing', 3600.00),
(9, 4, '2026-02-24 10:15:00', 'Processing', 3300.00),
(10, 7, '2026-02-24 10:25:00', 'Processing', 3900.00),
(11, 8, '2026-02-24 10:40:00', 'Processing', 3000.00);

INSERT INTO `order_items` (`order_id`, `product_id`, `quantity`, `price_per_unit`) VALUES
-- Vendor 3
(1, 1, 50, 25.50),
(2, 5, 40, 150.00),
-- Vendor 4
(3, 2, 200, 42.00),
(4, 6, 20, 220.00),
(4, 3, 50, 22.00),
(4, 1, 20, 30.00),
-- Vendor 7
(5, 9, 2, 1600.00),
(5, 11, 50, 44.00),
-- Vendor 8
(6, 10, 50, 110.00),
(6, 12, 25, 28.00),
-- Vendor 9
(7, 13, 100, 90.00),
-- Group-order simulation items (same product_id across vendors)
(8, 11, 80, 45.00),
(9, 11, 75, 44.00),
(10, 11, 85, 46.00),
(11, 11, 70, 43.00);

ALTER TABLE `orders` AUTO_INCREMENT = 12;

-- -- FRIENDS (group hub demo) --
INSERT INTO `friends` (`user_id`, `friend_user_id`) VALUES
(3, 4),
(3, 7),
(3, 8),
(4, 7);

-- -- GROUP ORDERS (active demo) --
INSERT INTO `group_orders` (`id`, `product_id`, `creator_vendor_id`, `status`, `target_moq`) VALUES
(1, 11, 3, 'Open', 150);

INSERT INTO `group_order_members` (`group_order_id`, `vendor_id`, `quantity`) VALUES
(1, 3, 50),
(1, 4, 50),
(1, 7, 50);

-- -- REVIEWS (demo) --
INSERT INTO `reviews` (`order_id`, `vendor_id`, `rating`, `review_text`) VALUES
(1, 3, 5, 'Great quality onions and timely delivery.'),
(4, 4, 4, 'Good oil quality, potatoes were fresh.'),
(2, 3, 4, 'Rice quality was good and arrived on time.'),
(5, 7, 5, 'Oil quality excellent, will reorder.'),
(6, 8, 3, 'Average quality, delivery was slightly late.');

-- -- SUPPORT TICKETS (demo) --
INSERT INTO `support_tickets` (`user_id`, `subject`, `message`, `type`, `status`) VALUES
(3, 'Invoice Request', 'Please share GST invoice for order #2.', 'query', 'Open'),
(4, 'Damaged Packaging', 'Some items had damaged packaging on delivery.', 'complaint', 'Open');

-- -- BARGAINS (demo) --
INSERT INTO `bargains` (`product_id`, `vendor_id`, `offer_price`, `quantity`, `status`) VALUES
(11, 3, 42.00, 50, 'Pending'),
(6, 4, 210.00, 20, 'Pending');

SELECT * FROM users;
