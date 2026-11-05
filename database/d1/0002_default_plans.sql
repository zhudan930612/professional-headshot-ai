-- Defaults for a new local/test database. Imported production plans are never overwritten.
INSERT INTO subscription_plans(id,name,display_name,price,quota,bonus_quota,quality,has_watermark,features,is_active,sort_order,created_at,updated_at)
VALUES
('free','Free','Free',0,5,0,'1K',1,'["5 lifetime images","With watermark"]',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('professional','Professional','Professional',25,30,0,'1K',0,'["30 lifetime images","No watermark"]',1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('executive','Executive','Executive',45,60,10,'2K',0,'["60 images plus 10 bonus","No watermark"]',1,2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;
