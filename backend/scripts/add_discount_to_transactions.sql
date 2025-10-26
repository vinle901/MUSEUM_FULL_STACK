-- Add discount fields to Transactions table
-- This allows POS to track membership discounts applied to transactions

ALTER TABLE Transactions
ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Membership discount percentage applied',
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total discount amount in dollars',
ADD COLUMN subtotal_before_discount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Subtotal before applying discount';

-- Update existing records to have the same values (no discount)
UPDATE Transactions
SET subtotal_before_discount = total_price,
    discount_percentage = 0.00,
    discount_amount = 0.00
WHERE subtotal_before_discount IS NULL OR subtotal_before_discount = 0;
