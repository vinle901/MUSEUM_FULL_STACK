CREATE TABLE `Artist`(
    `artist_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `nationality` VARCHAR(100) NOT NULL,
    `birth_year` YEAR NULL,
    `death_year` YEAR NULL,
    `artist_biography` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`artist_id`),
    INDEX `idx_name` (`name`),
    INDEX `idx_user` (`user_id`),
    CHECK (`death_year` IS NULL OR `death_year` >= `birth_year`)
);

CREATE TABLE `Exhibition`(
    `exhibition_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `exhibition_name` VARCHAR(255) NOT NULL,
    `exhibition_type` VARCHAR(100) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `picture_url` VARCHAR(255) NULL,
    PRIMARY KEY(`exhibition_id`),
    INDEX `idx_dates` (`start_date`, `end_date`),
    CHECK (`end_date` IS NULL OR `end_date` >= `start_date`)
);

CREATE TABLE `Benefits`(
    `membership_type` VARCHAR(50) NOT NULL,
    `unlimited_visits` BOOLEAN NOT NULL DEFAULT FALSE,
    `priority_entry` BOOLEAN NOT NULL DEFAULT FALSE,
    `guest_passes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `access_to_member_events` BOOLEAN NOT NULL DEFAULT FALSE,
    `discount_percentage` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `annual_fee` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`membership_type`)
);

CREATE TABLE `users`(
    `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(20) NULL,
    `address` VARCHAR(500) NULL,
    `birthdate` DATE NOT NULL,
    `sex` ENUM('M', 'F', 'Non-Binary', 'Prefer not to say') NOT NULL,
    `subscribe_to_newsletter` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `password_must_change` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(`user_id`),
    INDEX `idx_email` (`email`)
);

ALTER TABLE `Artist`
ADD CONSTRAINT `fk_artist_user`
    FOREIGN KEY(`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL;

CREATE TABLE `Ticket_Types`(
    `ticket_type_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ticket_name` VARCHAR(100) NOT NULL,
    `base_price` DECIMAL(6,2) NOT NULL,
    `description` TEXT NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`ticket_type_id`),
    INDEX `idx_available` (`is_available`),
    CHECK (`base_price` >= 0)
);

CREATE TABLE `Gift_Shop_Items`(
    `item_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `item_name` VARCHAR(255) NOT NULL,
    `category` ENUM('Posters', 'Books', 'Postcards', 'Jewelry', 'Souvenirs', 'Toys', 'Stationery', 'Other') NOT NULL,
    `price` DECIMAL(8,2) NOT NULL,
    `stock_quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `artist_id` INT UNSIGNED NULL,
    `image_url` VARCHAR(500) NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`item_id`),
    INDEX `idx_category` (`category`),
    INDEX `idx_artist` (`artist_id`),
    INDEX `idx_available` (`is_available`),
    CHECK (`price` > 0),
    CHECK (`stock_quantity` >= 0)
);

ALTER TABLE `Gift_Shop_Items`
ADD CONSTRAINT `fk_giftshop_artist`
    FOREIGN KEY(`artist_id`) REFERENCES `Artist`(`artist_id`) ON DELETE SET NULL;

CREATE TABLE `Cafeteria_Items`(
    `item_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `item_name` VARCHAR(255) NOT NULL,
    `category` ENUM('Hot Beverages', 'Cold Beverages', 'Sandwiches', 'Salads', 'Desserts', 'Snacks', 'Main Dishes') NOT NULL,
    `price` DECIMAL(6,2) NOT NULL,
    `description` TEXT NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
    `calories` SMALLINT UNSIGNED NULL,
    `is_vegetarian` BOOLEAN NOT NULL DEFAULT FALSE,
    `is_vegan` BOOLEAN NOT NULL DEFAULT FALSE,
    `preparation_time_minutes` TINYINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `picture_url` VARCHAR(500) NULL,
    PRIMARY KEY(`item_id`),
    INDEX `idx_category` (`category`),
    INDEX `idx_availability` (`is_available`),
    CHECK (`price` > 0),
    CHECK (`calories` >= 0)
);

CREATE TABLE `Membership`(
    `membership_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `membership_type` VARCHAR(50) NOT NULL,
    `start_date` DATE NOT NULL,
    `expiration_date` DATE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`membership_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_expiration` (`expiration_date`),
    INDEX `idx_user_active` (`user_id`, `is_active`, `expiration_date`),
    CHECK (`expiration_date` > `start_date`)
);

ALTER TABLE `Membership`
ADD CONSTRAINT `fk_membership_user`
    FOREIGN KEY(`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE;

ALTER TABLE `Membership`
ADD CONSTRAINT `fk_membership_type`
    FOREIGN KEY(`membership_type`) REFERENCES `Benefits`(`membership_type`) ON DELETE RESTRICT;

CREATE TABLE `Employee`(
    `employee_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL UNIQUE,
    `manager_id` INT UNSIGNED NULL,
    `role` VARCHAR(100) NOT NULL,
    `ssn` CHAR(11) NOT NULL UNIQUE,
    `hire_date` DATE NOT NULL,
    `salary` DECIMAL(10,2) NOT NULL,
    `responsibility` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`employee_id`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_role` (`role`),
    INDEX `idx_manager` (`manager_id`),
    INDEX `idx_user_active` (`user_id`, `is_active`),
    CHECK (`salary` > 0)
);

ALTER TABLE `Employee`
ADD CONSTRAINT `fk_employee_user`
    FOREIGN KEY(`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE;

ALTER TABLE `Employee`
ADD CONSTRAINT `fk_employee_manager`
    FOREIGN KEY(`manager_id`) REFERENCES `Employee`(`employee_id`) ON DELETE SET NULL;

CREATE TABLE `Artwork`(
    `artwork_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `artist_id` INT UNSIGNED NOT NULL,
    `creation_date` YEAR NULL,
    `artwork_type` VARCHAR(100) NOT NULL,
    `material` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `picture_url` VARCHAR(500) NOT NULL,
    `exhibition_id` INT UNSIGNED NULL,
    `curated_by_employee_id` INT UNSIGNED NULL,
    `acquisition_date` DATE NULL,
    `is_on_display` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(`artwork_id`),
    UNIQUE KEY `unique_artist_title` (`artist_id`, `title`),
    INDEX `idx_artist` (`artist_id`),
    INDEX `idx_exhibition` (`exhibition_id`),
    INDEX `idx_curator` (`curated_by_employee_id`)
);

ALTER TABLE `Artwork`
ADD CONSTRAINT `fk_artwork_artist`
    FOREIGN KEY(`artist_id`) REFERENCES `Artist`(`artist_id`) ON DELETE RESTRICT;

ALTER TABLE `Artwork`
ADD CONSTRAINT `fk_artwork_exhibition`
    FOREIGN KEY(`exhibition_id`) REFERENCES `Exhibition`(`exhibition_id`) ON DELETE SET NULL;

ALTER TABLE `Artwork`
ADD CONSTRAINT `fk_artwork_curator`
    FOREIGN KEY(`curated_by_employee_id`) REFERENCES `Employee`(`employee_id`) ON DELETE SET NULL;

CREATE TABLE `Events`(
    `event_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_name` VARCHAR(255) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `event_date` DATE NOT NULL,
    `event_time` TIME NOT NULL,
    `duration_minutes` SMALLINT UNSIGNED NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `exhibition_id` INT UNSIGNED NULL,
    `max_capacity` SMALLINT UNSIGNED NULL,
    `current_attendees` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `is_members_only` BOOLEAN NOT NULL DEFAULT FALSE,
    `is_cancelled` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `picture_url` VARCHAR(255) NULL,
    PRIMARY KEY(`event_id`),
    INDEX `idx_date` (`event_date`),
    INDEX `idx_exhibition` (`exhibition_id`),
    CHECK (`current_attendees` <= `max_capacity` OR `max_capacity` IS NULL)
);

ALTER TABLE `Events`
ADD CONSTRAINT `fk_events_exhibition`
    FOREIGN KEY(`exhibition_id`) REFERENCES `Exhibition`(`exhibition_id`) ON DELETE SET NULL;

CREATE VIEW `Calendar` AS
SELECT
    event_id AS calendar_id,
    event_id,
    event_date,
    event_time,
    event_name,
    location,
    description,
    is_cancelled,
    duration_minutes,
    event_type
FROM Events;

CREATE TABLE `Event_Hosting`(
    `hosting_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` INT UNSIGNED NOT NULL,
    `employee_id` INT UNSIGNED NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `assigned_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`hosting_id`),
    INDEX `idx_event` (`event_id`),
    INDEX `idx_employee` (`employee_id`),
    UNIQUE KEY `unique_event_employee_role` (`event_id`, `employee_id`, `role`)
);

ALTER TABLE `Event_Hosting`
ADD CONSTRAINT `fk_hosting_event`
    FOREIGN KEY(`event_id`) REFERENCES `Events`(`event_id`) ON DELETE CASCADE;

ALTER TABLE `Event_Hosting`
ADD CONSTRAINT `fk_hosting_employee`
    FOREIGN KEY(`employee_id`) REFERENCES `Employee`(`employee_id`) ON DELETE CASCADE;

CREATE TABLE `Transactions`(
    `transaction_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `transaction_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_price` DECIMAL(10,2) NOT NULL,
    `total_items` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `payment_method` ENUM('Cash', 'Credit Card', 'Debit Card', 'Mobile Payment') NOT NULL,
    `transaction_status` ENUM('Pending', 'Completed', 'Cancelled', 'Refunded') NOT NULL DEFAULT 'Completed',
    `employee_id` INT UNSIGNED NULL,
    PRIMARY KEY(`transaction_id`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_date` (`transaction_date`),
    CHECK (`total_price` >= 0)
);

ALTER TABLE `Transactions`
ADD CONSTRAINT `fk_transaction_user`
    FOREIGN KEY(`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT;

CREATE TABLE `Ticket_Purchase`(
    `purchase_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT UNSIGNED NULL,
    `ticket_type_id` INT UNSIGNED NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `base_price` DECIMAL(6,2) NOT NULL,
    `discount_amount` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `final_price` DECIMAL(6,2) NOT NULL,
    `line_total` DECIMAL(10,2) NOT NULL,
    `exhibition_id` INT UNSIGNED NULL,
    `event_id` INT UNSIGNED NULL,
    `visit_date` DATE NOT NULL,
    `is_used` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`purchase_id`),
    INDEX `idx_transaction` (`transaction_id`),
    INDEX `idx_visit_date` (`visit_date`),
    INDEX `idx_ticket_type` (`ticket_type_id`),
    CHECK (`quantity` > 0),
    CHECK (`final_price` >= 0),
    CHECK (`discount_amount` >= 0),
);

ALTER TABLE `Ticket_Purchase`
ADD CONSTRAINT `fk_ticketpurchase_type`
    FOREIGN KEY(`ticket_type_id`) REFERENCES `Ticket_Types`(`ticket_type_id`) ON DELETE RESTRICT;

ALTER TABLE `Ticket_Purchase`
ADD CONSTRAINT `fk_ticketpurchase_transaction`
    FOREIGN KEY(`transaction_id`) REFERENCES `Transactions`(`transaction_id`) ON DELETE RESTRICT;

ALTER TABLE `Ticket_Purchase`
ADD CONSTRAINT `fk_ticketpurchase_exhibition`
    FOREIGN KEY(`exhibition_id`) REFERENCES `Exhibition`(`exhibition_id`) ON DELETE SET NULL;

ALTER TABLE `Ticket_Purchase`
ADD CONSTRAINT `fk_ticketpurchase_event`
    FOREIGN KEY(`event_id`) REFERENCES `Events`(`event_id`) ON DELETE SET NULL;

CREATE TABLE `Gift_Shop_Purchase`(
    `purchase_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT UNSIGNED NULL,
    `gift_item_id` INT UNSIGNED NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(8,2) NOT NULL,
    `line_total` DECIMAL(10,2) NOT NULL,
    `purchased_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`purchase_id`),
    INDEX `idx_transaction` (`transaction_id`),
    INDEX `idx_gift_item` (`gift_item_id`),
    CHECK (`quantity` > 0),
    CHECK (`unit_price` >= 0)
);

ALTER TABLE `Gift_Shop_Purchase`
ADD CONSTRAINT `fk_giftpurchase_transaction`
    FOREIGN KEY(`transaction_id`) REFERENCES `Transactions`(`transaction_id`) ON DELETE CASCADE;

ALTER TABLE `Gift_Shop_Purchase`
ADD CONSTRAINT `fk_giftpurchase_item`
    FOREIGN KEY(`gift_item_id`) REFERENCES `Gift_Shop_Items`(`item_id`) ON DELETE RESTRICT;

CREATE TABLE `Cafeteria_Purchase`(
    `purchase_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT UNSIGNED NULL,
    `cafeteria_item_id` INT UNSIGNED NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(8,2) NOT NULL,
    `line_total` DECIMAL(10,2) NOT NULL,
    `purchased_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`purchase_id`),
    INDEX `idx_transaction` (`transaction_id`),
    INDEX `idx_cafeteria_item` (`cafeteria_item_id`),
    CHECK (`quantity` > 0),
    CHECK (`unit_price` >= 0)
);

ALTER TABLE `Cafeteria_Purchase`
ADD CONSTRAINT `fk_cafpurchase_transaction`
    FOREIGN KEY(`transaction_id`) REFERENCES `Transactions`(`transaction_id`) ON DELETE CASCADE;

ALTER TABLE `Cafeteria_Purchase`
ADD CONSTRAINT `fk_cafpurchase_item`
    FOREIGN KEY(`cafeteria_item_id`) REFERENCES `Cafeteria_Items`(`item_id`) ON DELETE RESTRICT;

CREATE TABLE `Membership_Purchase`(
    `purchase_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT UNSIGNED NOT NULL,
    `membership_id` INT UNSIGNED NOT NULL,
    `line_total` DECIMAL(8,2) NOT NULL,
    `is_renewal` BOOLEAN NOT NULL DEFAULT FALSE,
    `purchased_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`purchase_id`),
    INDEX `idx_transaction` (`transaction_id`),
    INDEX `idx_membership` (`membership_id`),
    CHECK (`line_total` >= 0)
);

ALTER TABLE `Membership_Purchase`
ADD CONSTRAINT `fk_memberpurchase_transaction`
    FOREIGN KEY(`transaction_id`) REFERENCES `Transactions`(`transaction_id`) ON DELETE RESTRICT;

ALTER TABLE `Membership_Purchase`
ADD CONSTRAINT `fk_memberpurchase_membership`
    FOREIGN KEY(`membership_id`) REFERENCES `Membership`(`membership_id`) ON DELETE RESTRICT;

CREATE TABLE `Donation`(
    `donation_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `donation_type` ENUM('General Fund', 'Exhibition Support', 'Education Programs', 'Artwork Acquisition', 'Building Maintenance', 'Other') NOT NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT FALSE,
    `dedication_message` TEXT NULL,
    `tax_receipt_sent` BOOLEAN NOT NULL DEFAULT FALSE,
    `donated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`donation_id`),
    INDEX `idx_transaction` (`transaction_id`),
    INDEX `idx_donation_type` (`donation_type`),
    CHECK (`amount` > 0)
);

ALTER TABLE `Donation`
ADD CONSTRAINT `fk_donation_transaction`
    FOREIGN KEY(`transaction_id`) REFERENCES `Transactions`(`transaction_id`) ON DELETE RESTRICT;