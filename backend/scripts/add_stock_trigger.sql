DELIMITER $$

-- Trigger for insert when stock is 0 (not stocked yet then trigger the is available is = 0 since the default is always true)
CREATE TRIGGER before_giftshop_insert
BEFORE INSERT ON Gift_Shop_Items
FOR EACH ROW
BEGIN
    IF NEW.stock_quantity = 0 THEN
        SET NEW.is_available = FALSE;
    END IF;
END$$

-- Trigger for update operations when stock is 0 then trigger then is available =0 then it wont be showing in the gift shop
CREATE TRIGGER before_giftshop_update
BEFORE UPDATE ON Gift_Shop_Items
FOR EACH ROW
BEGIN
    IF NEW.stock_quantity = 0 THEN
        SET NEW.is_available = FALSE;
    END IF;
END$$

DELIMITER ;

