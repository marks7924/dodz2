-- ============================================================
-- DODZ FRIED CHICKEN — SEED DATA
-- Migration 004: Initial Data
-- Run AFTER 003_functions.sql
-- ============================================================

-- ============================================================
-- BRANCHES
-- ============================================================

INSERT INTO public.branches (id, name_en, name_ar, map_url) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Seashell Walk Branch', 'سي شيل ووك - الساحل', 'https://maps.app.goo.gl/41ghzJmGZFH5ydau9'),
  ('b1000000-0000-0000-0000-000000000002', 'Marina Walk Branch', 'مارينا ووك - الساحل', 'https://maps.app.goo.gl/uFNMVQf7mARqx3VP6'),
  ('b1000000-0000-0000-0000-000000000003', 'Tagamoa Branch', 'فرع التجمع', 'https://maps.app.goo.gl/PY39jUeRrMDCEcoa9'),
  ('b1000000-0000-0000-0000-000000000004', 'Almaza Branch', 'فرع الماظه', 'https://maps.app.goo.gl/b8dnYd1XsQ31qsb89'),
  ('b1000000-0000-0000-0000-000000000005', 'Nasr City Branch', 'فرع مدينه نصر', 'https://maps.app.goo.gl/xra2XTm54n3K6kaD9'),
  ('b1000000-0000-0000-0000-000000000006', 'Hadayek El-Kobba Branch', 'فرع حدائق القبه', 'https://maps.app.goo.gl/a8UYTCEwjHojwvFy5'),
  ('b1000000-0000-0000-0000-000000000007', 'Ain Shams Branch', 'فرع عين شمس', 'https://maps.app.goo.gl/gYqVryurQyTXWqibA');

-- ============================================================
-- CATEGORIES
-- ============================================================

INSERT INTO public.categories (id, name_en, name_ar, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Beef Burgers', 'برجر لحم', 1),
  ('c1000000-0000-0000-0000-000000000002', 'Fried Chicken', 'فرايد تشيكن', 2),
  ('c1000000-0000-0000-0000-000000000003', 'Sides & Appetizers', 'المقبلات والجانبيات', 3),
  ('c1000000-0000-0000-0000-000000000004', 'Drinks', 'المشروبات', 4);

-- ============================================================
-- MENU ITEMS
-- ============================================================

INSERT INTO public.menu_items (id, category_id, name_en, name_ar, desc_en, desc_ar, price_single, price_double, image_url, sort_order) VALUES
  -- Beef Burgers
  ('f1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'Dodz Burger', 'دودز برجر',
   'Charcoal grilled beef patty, lettuce, tomatoes, pickled cucumbers, cheddar cheese, and Dodz special sauce.',
   'قطعة لحم مشوية على الفحم، خس، طماطم، خيار مخلل، جبنة شيدر، صوص دودز المميز',
   120, 170,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 1),

  ('f1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000001',
   'Mushroom Burger', 'مشروم برجر',
   'Grilled beef patty with fresh mushroom pieces and creamy mushroom sauce.',
   'قطعة لحم مشوية مع قطع المشروم الفريش وصوص المشروم الكريمي',
   135, 185,
   'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', 2),

  -- Fried Chicken
  ('f1000000-0000-0000-0000-000000000003',
   'c1000000-0000-0000-0000-000000000002',
   'Crispy Chicken Sandwich', 'ساندوتش دجاج كريسبي',
   'Crunchy fried chicken breast, turkey, lettuce, pickled cucumbers, and melted cheese sauce.',
   'صدر دجاج مقلي مقرمش، تركي، خس، خيار مخلل، صوص الجبنة السايحة',
   110, 155,
   'https://images.unsplash.com/photo-1627662236973-4f8259fa2441?w=600&auto=format&fit=crop&q=80', 1),

  ('f1000000-0000-0000-0000-000000000004',
   'c1000000-0000-0000-0000-000000000002',
   'Dodz Fire Chicken 🌶️', 'دودز فاير تشيكن 🌶️',
   'Spicy crispy chicken, jalapenos, spicy fire sauce, and cheddar cheese.',
   'دجاج مقرمش حار، هالبينو، صوص الفاير الحار، وجبنة شيدر',
   115, 160,
   'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', 2),

  ('f1000000-0000-0000-0000-000000000005',
   'c1000000-0000-0000-0000-000000000002',
   'Fried Chicken Meal (3 Pcs)', 'وجبة الدجاج المقرمش (٣ قطع)',
   '3 Pcs Chicken + Fries + Coleslaw + Bun',
   '٣ قطع دجاج مقرمش + بطاطس + كولسلو + خبز',
   165, NULL,
   'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', 3),

  ('f1000000-0000-0000-0000-000000000006',
   'c1000000-0000-0000-0000-000000000002',
   'Fried Chicken Meal (5 Pcs)', 'وجبة الدجاج المقرمش (٥ قطع)',
   '5 Pcs Chicken + Fries + Coleslaw + 2 Buns',
   '٥ قطع دجاج مقرمش + بطاطس + كولسلو + ٢ خبز',
   240, NULL,
   'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', 4),

  -- Sides & Appetizers
  ('f1000000-0000-0000-0000-000000000007',
   'c1000000-0000-0000-0000-000000000003',
   'French Fries', 'بطاطس مقلية',
   'Golden, crispy classic French fries.',
   'أصابع بطاطس مقلية مقرمشة وذهبية',
   35, NULL,
   'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', 1),

  ('f1000000-0000-0000-0000-000000000008',
   'c1000000-0000-0000-0000-000000000003',
   'Cheesy Fries', 'بطاطس بالجبنة',
   'French fries loaded with hot melted cheddar cheese sauce.',
   'بطاطس مقلية مغطاة بصوص جبنة شيدر سايحة',
   55, NULL,
   'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop&q=80', 2),

  ('f1000000-0000-0000-0000-000000000009',
   'c1000000-0000-0000-0000-000000000003',
   'Chicken Strips (3 Pcs)', 'تشيكن ستربس (٣ قطع)',
   '3 Pieces of crispy hand-breaded chicken tenders with dipping sauce.',
   '٣ قطع ستربس دجاج مقرمش ومتبل مع صوص خارجي',
   75, NULL,
   'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', 3),

  ('f1000000-0000-0000-0000-000000000010',
   'c1000000-0000-0000-0000-000000000003',
   'Mozzarella Sticks (4 Pcs)', 'أصابع موتزاريلا (٤ قطع)',
   '4 Pieces of golden crispy mozzarella sticks.',
   '٤ أصابع جبنة موتزاريلا مقلية مقرمشة وسايحة',
   60, NULL,
   'https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=600&auto=format&fit=crop&q=80', 4),

  ('f1000000-0000-0000-0000-000000000011',
   'c1000000-0000-0000-0000-000000000003',
   'Coleslaw Salad', 'سلطة كولسلو',
   'Freshly prepared shredded cabbage and carrot in sweet creamy dressing.',
   'كرنب وجزر مبشور طازة مع صوص كريمي حلو',
   25, NULL,
   'https://images.unsplash.com/photo-1625938146369-adc83368bda7?w=600&auto=format&fit=crop&q=80', 5),

  -- Drinks
  ('f1000000-0000-0000-0000-000000000012',
   'c1000000-0000-0000-0000-000000000004',
   'Soft Drinks (Pepsi/7Up/Mirinda)', 'مشروب غازي (بيبسي/سفن اب/ميرندا)',
   'Chilled soft drinks of your choice.',
   'كانز مشروب غازي بارد من اختيارك',
   20, NULL,
   'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', 1),

  ('f1000000-0000-0000-0000-000000000013',
   'c1000000-0000-0000-0000-000000000004',
   'Mineral Water', 'مياه معدنية',
   'Refreshing bottled mineral water.',
   'زجاجة مياه معدنية نقية وباردة',
   10, NULL,
   'https://images.unsplash.com/photo-1608885898957-a599fb1b4600?w=600&auto=format&fit=crop&q=80', 2);

-- ============================================================
-- COUPONS
-- ============================================================

INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, expiry_date, usage_limit, is_active) VALUES
  ('FIRST15', 'PERCENT', 15, 0, NOW() + INTERVAL '1 year', 1000, TRUE),
  ('DODZ10', 'FIXED', 30, 100, NOW() + INTERVAL '1 year', 500, TRUE),
  ('WELCOME20', 'PERCENT', 20, 150, NOW() + INTERVAL '6 months', 200, TRUE);

-- ============================================================
-- RESTAURANT SETTINGS
-- ============================================================

INSERT INTO public.restaurant_settings (key, value, description) VALUES
  ('delivery_fee_base', '40', 'Base delivery fee in EGP'),
  ('delivery_fee_per_km', '3', 'Additional fee per km in EGP'),
  ('min_order_delivery', '50', 'Minimum order value for delivery in EGP'),
  ('restaurant_name_en', 'Dodz Fried Chicken', 'Restaurant name in English'),
  ('restaurant_name_ar', 'دودز فرايد تشيكن', 'Restaurant name in Arabic'),
  ('restaurant_phone', '+20-100-000-0000', 'Main restaurant phone'),
  ('support_email', 'support@dodz.com', 'Support email address'),
  ('order_acceptance_auto', 'false', 'Auto-accept orders without staff action'),
  ('max_delivery_radius_km', '15', 'Maximum delivery radius in km');
