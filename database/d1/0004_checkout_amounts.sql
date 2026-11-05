ALTER TABLE payment_events ADD COLUMN discount_minor INTEGER NOT NULL DEFAULT 0 CHECK(discount_minor>=0);
ALTER TABLE payment_events ADD COLUMN tax_minor INTEGER CHECK(tax_minor>=0);
ALTER TABLE payment_events ADD COLUMN discount_id TEXT;
ALTER TABLE payment_events ADD COLUMN tax_inclusive INTEGER NOT NULL DEFAULT 0 CHECK(tax_inclusive IN (0,1));
ALTER TABLE payment_transactions ADD COLUMN discount_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount_minor>=0);
ALTER TABLE payment_transactions ADD COLUMN tax_amount_minor INTEGER CHECK(tax_amount_minor>=0);
ALTER TABLE payment_transactions ADD COLUMN creem_discount_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN tax_inclusive INTEGER NOT NULL DEFAULT 0 CHECK(tax_inclusive IN (0,1));

DROP TRIGGER checkout_guard;
CREATE TRIGGER checkout_guard BEFORE INSERT ON payment_events WHEN NEW.event_type='checkout.completed'
BEGIN
  SELECT RAISE(ABORT, 'Payment terms mismatch') WHERE NOT EXISTS (
    SELECT 1 FROM payment_transactions p WHERE p.id=NEW.payment_id AND p.status='pending'
      AND p.creem_product_id=NEW.product_id AND p.granted_quota>=0 AND p.granted_bonus_quota>=0
      AND upper(p.currency)=upper(NEW.currency) AND round(p.amount*100)=NEW.amount_minor
      AND NEW.discount_minor<=NEW.amount_minor AND (NEW.discount_minor=0 OR NEW.discount_id IS NOT NULL)
      AND (
        -- Compatibility during deployment: old workers only settle full-price orders.
        (NEW.tax_minor IS NULL AND NEW.discount_minor=0 AND NEW.paid_minor>=NEW.amount_minor)
        OR (NEW.tax_minor IS NOT NULL
          AND NEW.paid_minor=NEW.amount_minor-NEW.discount_minor+CASE WHEN NEW.tax_inclusive=1 THEN 0 ELSE NEW.tax_minor END
          AND (NEW.tax_inclusive=0 OR NEW.tax_minor<=NEW.paid_minor))
      )
      AND (p.creem_checkout_id IS NULL OR p.creem_checkout_id=NEW.checkout_id)
      AND (p.creem_order_id IS NULL OR p.creem_order_id LIKE 'ch_%' OR p.creem_order_id=NEW.order_id)
  );
END;
CREATE TRIGGER checkout_amounts AFTER INSERT ON payment_events WHEN NEW.event_type='checkout.completed'
BEGIN
  UPDATE payment_transactions SET discount_amount_minor=NEW.discount_minor,
    tax_amount_minor=coalesce(NEW.tax_minor,NEW.paid_minor-NEW.amount_minor),creem_discount_id=NEW.discount_id,tax_inclusive=NEW.tax_inclusive
  WHERE id=NEW.payment_id;
END;
