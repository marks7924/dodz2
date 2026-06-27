-- ============================================================
-- Migration 022: New Menu Catalog & Seed Customizations
-- ============================================================

-- 1. Prune existing menu catalog
DELETE FROM public.menu_items;
DELETE FROM public.categories;
DELETE FROM public.customization_groups;

-- 2. Insert new categories
INSERT INTO public.categories (id, name_en, name_ar, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Offers & Bundles', 'أقوى العروض والـ Bundles', 1),
  ('c1000000-0000-0000-0000-000000000002', 'Beef Burgers', 'سندوتشات البرجر', 2),
  ('c1000000-0000-0000-0000-000000000007', 'Chicken Sandwiches', 'سندوتشات الدجاج', 3),
  ('c1000000-0000-0000-0000-000000000003', 'Single & Family Broasted/Tenders Meals', 'الوجبات الفردية والعائلية', 4),
  ('c1000000-0000-0000-0000-000000000004', 'Sides, Mac & Cheese, and Rizo', 'الأصناف الجانبية، الماك أند تشيز والريزو', 5),
  ('c1000000-0000-0000-0000-000000000005', 'Kids Meals', 'وجبات الأطفال', 6),
  ('c1000000-0000-0000-0000-000000000006', 'Desserts & Beverages', 'الحلويات والمشروبات', 7);

-- 3. Insert new menu items (All using /placeholder.png image)
INSERT INTO public.menu_items (id, category_id, name_en, name_ar, desc_en, desc_ar, price_single, price_double, image_url, sort_order) VALUES
  -- Category 1: Offers & Bundles
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Family Feast Deal', 'عرض لِمّة العيلة',
   '6 pieces of fried broasted chicken + fries + 3 bread + coleslaw + ranch sauce + cheddar sauce',
   '6 قطع دجاج بروستد + بطاطس + 3 خبز + كول سلو + صوص رانش + صوص تشيدر',
   469.95, NULL, '/placeholder.png', 1),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'Festival Box', 'بوكس المهرجان',
   '4 Chicken pieces + 4 Tenders + 4 Wings + 2 Sandwiches + 3 Sauces + Family fries',
   '4 قطع دجاج + 4 قطع تندرز + 4 أجنحة دجاج + 2 سندوتش + 3 صوصات + بطاطس عائلية',
   894.60, NULL, '/placeholder.png', 2),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
   'Nashi Bundle', 'ناشي بندل',
   '2 Nashville sandwiches + Cheesy fries + Chicken wings with Hot Honey sauce',
   '2 سندوتش ناشفيل + بطاطس بالجبنة + أجنحة دجاج بصوص الهاني هوت',
   534.60, NULL, '/placeholder.png', 3),
  ('f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001',
   'Solo Kerev', 'سولو كريف',
   '1 Sandwich of your choice + 1 piece of chicken + fries + coleslaw + a drink',
   '1 سندوتش من اختيارك + 1 قطعة دجاج + بطاطس + كول سلو + مشروب',
   375.00, NULL, '/placeholder.png', 4),
  ('f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001',
   'Double Dibs', 'دبل ديبس',
   '2 Sandwiches of your choice + 2 Nashville tenders + cheesy fries + a cup of sauce + 2 drinks',
   '2 سندوتش من اختيارك + 2 ناشفيل تندرز + بطاطس بالجبنة + كوب صوص + 2 مشروب',
   750.00, NULL, '/placeholder.png', 5),

  -- Category 7: Chicken Sandwiches
  ('f1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000007',
   'Super Crunchy', 'سوبر كرانشي',
   'Chicken pieces, cheddar sauce, BBQ, Doodz sauce, smoked turkey, lettuce, and pickled cucumber',
   'قطع دجاج، صوص تشيدر، باربكيو، صوص دودز، تركي مدخن، خس، ومخلل',
   220.00, NULL, '/placeholder.png', 1),
  ('f1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007',
   'Dodz Pizza Wich', 'سندوتش دودز بيتزا ويتش',
   'Crispy chicken breast, marinara sauce, pepperoni, mushrooms, mozzarella cheese, and ranch sauce',
   'صدر دجاج، صوص مارينارا، ببروني، مشروم، موتزاريلًا ورانش',
   59.00, NULL, '/placeholder.png', 2),
  ('f1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000007',
   'Dodz Secret Sandwich', 'سندوتش دودز سيكرت',
   'Crispy chicken, buffalo sauce, ranch, American cheddar, lettuce, and pickles',
   'دجاج مقرمش، صوص بافلو، رانش، تشيدر أمريكي، ومخلل',
   59.00, NULL, '/placeholder.png', 3),
  ('f1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000007',
   'Cheese Lava Sandwich', 'سندوتش تشيز لافا',
   'Loaded with liquid cheddar cheese sauce, lettuce, and mayo',
   'غرقان بصوص جبنة التشيدر السائلة، خس، ومايونيز',
   59.00, NULL, '/placeholder.png', 4),
  ('f1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000007',
   'Fire Dodz', 'فاير دودز',
   'Crispy breast topped with spicy cheddar fingers, hot comeback sauce, hot cheddar sauce, and jalapenos',
   'صدر دجاج، أصابع تشيدر حارة، صوص كامباك حار، وهالبينو',
   180.00, NULL, '/placeholder.png', 5),
  ('f1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000007',
   'Mighty D', 'مايتي دي',
   'Crispy chicken breast, melted American cheese, comeback sauce, lettuce, and pickles',
   'صدر دجاج مقرمش، جبنة أمريكية، خس، ومخلل وصوص كامباك',
   170.00, NULL, '/placeholder.png', 6),

  -- Category 2: Beef Burgers
  ('f1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000002',
   'Mushroom Honey Burger', 'مشروم هاني برجر',
   'Grilled smashed beef burger, American cheese, mushrooms, honey BBQ sauce, comeback sauce, onions, and pickles',
   'برجر لحم مشوي (سماش)، مشروم، صوص هاني باربكيو، وكامباك',
   190.00, NULL, '/placeholder.png', 7),

  -- Category 3: Single & Family Broasted/Tenders Meals
  ('f1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000003',
   'Dodz Snack', 'دوز سناك',
   '2 pieces of fried chicken + French fries + coleslaw + bread',
   '2 قطعة دجاج مقلي + بطاطس + كول سلو + خبز',
   155.00, NULL, '/placeholder.png', 1),
  ('f1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000003',
   'Tender Box', 'بوكس التندرز',
   '3 pieces of chicken tenders + French fries + coleslaw + bread',
   '3 قطع تشيكن تندرز + بطاطس + كول سلو + خبز',
   215.00, NULL, '/placeholder.png', 2),
  ('f1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000003',
   'Dodz Dinner', 'دينر دوز',
   '3 pieces of fried chicken + French fries + coleslaw + bread',
   '3 قطع دجاج مقلي + بطاطس + كول سلو + خبز',
   245.00, NULL, '/placeholder.png', 3),
  ('f1000000-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000003',
   'Nashville Tenders Meal', 'وجبة ناشفيل تندرز',
   '3 Nashville tenders + signature Doodz sauce + fresh toast bread + crispy fried corn',
   '3 قطع ناشفيل تندرز + صوص دودز + توست طازج + ذرة مقلية',
   250.00, NULL, '/placeholder.png', 4),
  ('f1000000-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000003',
   'Mix Box', 'مكس بوكس',
   '2 pieces of fried chicken + 2 chicken tenders + French fries + coleslaw + bread',
   '2 قطعة دجاج + 2 تشيكن تندرز + بطاطس + كول سلو + خبز',
   299.00, NULL, '/placeholder.png', 5),
  ('f1000000-0000-0000-0000-000000000018', 'c1000000-0000-0000-0000-000000000003',
   'Super Dudes / Super Tender Box', 'سوبر دودز / سوبر تندرز بوكس',
   '4 or 5 pieces of chicken/tenders + potatoes + coleslaw + bread',
   '4 أو 5 قطع دجاج أو تندرز + بطاطس + كول سلو + خبز',
   320.00, 360.00, '/placeholder.png', 6),
  ('f1000000-0000-0000-0000-000000000019', 'c1000000-0000-0000-0000-000000000003',
   'Super Tender Nashville', 'سوبر تندر ناشفيل',
   '5 pieces of Nashville chicken tenders with special sauces + toast + fried corn',
   '5 قطع ناشفيل تندرز مع صوصات خاصة + توست + ذرة مقلية',
   350.00, NULL, '/placeholder.png', 7),
  ('f1000000-0000-0000-0000-000000000020', 'c1000000-0000-0000-0000-000000000003',
   'Tender Family Meal', 'وجبة تندر العائلية',
   '10 Tenders + family sides + 1L drink',
   '10 قطع تندرز + جانبيات + لتر مشروب',
   715.00, NULL, '/placeholder.png', 8),
  ('f1000000-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000003',
   'Family Mix Meal', 'وجبة مكس العائلية',
   '6 Fried chicken pieces + 6 tenders + family sides + 1L drink',
   '6 قطع دجاج + 6 تندرز + جانبيات + لتر مشروب',
   770.00, NULL, '/placeholder.png', 9),
  ('f1000000-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000003',
   'Family Standard Meal', 'الوجبة العائلية القياسية',
   '8 Fried chicken pieces + family sides + 1L drink',
   '8 قطع دجاج مقلي + جانبيات + لتر مشروب',
   799.00, NULL, '/placeholder.png', 10),
  ('f1000000-0000-0000-0000-000000000023', 'c1000000-0000-0000-0000-000000000003',
   'Star Meal', 'وجبة ستار',
   '12 Fried chicken pieces + family sides + 1L drink',
   '12 قطعة دجاج مقلي + جانبيات + لتر مشروب',
   860.00, NULL, '/placeholder.png', 11),
  ('f1000000-0000-0000-0000-000000000024', 'c1000000-0000-0000-0000-000000000003',
   'Mega Star Family Meal', 'وجبة ميجا ستار العائلية',
   '15 Fried chicken pieces + family sides + 1L drink',
   '15 قطعة دجاج مقلي + جانبيات + لتر مشروب',
   985.00, NULL, '/placeholder.png', 12),

  -- Category 4: Sides, Mac & Cheese, and Rizo
  ('f1000000-0000-0000-0000-000000000025', 'c1000000-0000-0000-0000-000000000004',
   'Coleslaw Salad', 'سلطة كولسلو',
   'Freshly prepared coleslaw salad cup',
   'كوب متوسط سلطة كول سلو',
   50.00, NULL, '/placeholder.png', 1),
  ('f1000000-0000-0000-0000-000000000026', 'c1000000-0000-0000-0000-000000000004',
   'Regular French Fries', 'بطاطس محمرة عادية',
   'Golden crispy French fries medium packet',
   'باكيت متوسط بطاطس محمرة عادية',
   60.00, NULL, '/placeholder.png', 2),
  ('f1000000-0000-0000-0000-000000000027', 'c1000000-0000-0000-0000-000000000004',
   'Family Fries Pack', 'بطاطس حجم عائلي',
   'Golden French fries family size pack',
   'بطاطس حجم عائلي',
   135.00, NULL, '/placeholder.png', 3),
  ('f1000000-0000-0000-0000-000000000028', 'c1000000-0000-0000-0000-000000000004',
   'Cheesy Fries / Nashville Loaded Fries', 'بطاطس بالجبنة',
   'Fries topped with hot cheddar cheese sauce or tenders',
   'بطاطس بصوص التشيدر الساخن أو قطع التندرز',
   135.00, NULL, '/placeholder.png', 4),
  ('f1000000-0000-0000-0000-000000000029', 'c1000000-0000-0000-0000-000000000004',
   'Curly Cheesy Fries', 'كيرلي فرايز بصوص الجبنة',
   'Crispy curly fries covered in cheese sauce',
   'كيرلي فرايز بصوص الجبنة',
   165.00, NULL, '/placeholder.png', 5),
  ('f1000000-0000-0000-0000-000000000030', 'c1000000-0000-0000-0000-000000000004',
   'Plain Rizo', 'ريزو سادة',
   'Signature seasoned rice without chicken',
   'ريزو سادة بدون فراخ',
   45.00, NULL, '/placeholder.png', 6),
  ('f1000000-0000-0000-0000-000000000031', 'c1000000-0000-0000-0000-000000000004',
   'Loaded Chicken Rizo', 'ريزو لودد بقطع الدجاج',
   'Seasoned rice loaded with crispy chicken pieces',
   'ريزو لودد بقطع الدجاج',
   140.00, 155.00, '/placeholder.png', 7),
  ('f1000000-0000-0000-0000-000000000032', 'c1000000-0000-0000-0000-000000000004',
   'Plain Mac and Cheese', 'ماك أند تشيز سادة',
   'Creamy pasta covered with warm cheddar cheese sauce',
   'مكرونة كريمية بصوص التشيدر سادة',
   120.00, NULL, '/placeholder.png', 8),
  ('f1000000-0000-0000-0000-000000000033', 'c1000000-0000-0000-0000-000000000004',
   'Chicken Mac and Cheese', 'تشيكن ماك أند تشيز',
   'Loaded with crispy chicken strips and ranch sauce',
   'لودد بقطع الفراخ المقرمشة وصوص الرانش',
   155.00, NULL, '/placeholder.png', 9),
  ('f1000000-0000-0000-0000-000000000034', 'c1000000-0000-0000-0000-000000000004',
   'BBQ Sauce Cup', 'كوب صوص باربكيو',
   'Signature BBQ sauce dipping cup',
   'كوب صوص باربكيو للتغميس',
   33.00, NULL, '/placeholder.png', 10),
  ('f1000000-0000-0000-0000-000000000035', 'c1000000-0000-0000-0000-000000000004',
   'Comeback Sauce Cup', 'كوب صوص كامباك',
   'Signature Comeback sauce dipping cup',
   'كوب صوص كامباك للتغميس',
   33.00, NULL, '/placeholder.png', 11),
  ('f1000000-0000-0000-0000-000000000036', 'c1000000-0000-0000-0000-000000000004',
   'Ranch Sauce Cup', 'كوب صوص رانش',
   'Signature Ranch sauce dipping cup',
   'كوب صوص رانش للتغميس',
   33.00, NULL, '/placeholder.png', 12),
  ('f1000000-0000-0000-0000-000000000037', 'c1000000-0000-0000-0000-000000000004',
   'Buffalo Sauce Cup', 'كوب صوص بافلو',
   'Signature Buffalo sauce dipping cup',
   'كوب صوص بافلو للتغميس',
   33.00, NULL, '/placeholder.png', 13),
  ('f1000000-0000-0000-0000-000000000038', 'c1000000-0000-0000-0000-000000000004',
   'Doodz Sauce Cup', 'كوب صوص دودز',
   'Signature Doodz sauce dipping cup',
   'كوب صوص دودز للتغميس',
   33.00, NULL, '/placeholder.png', 14),

  -- Category 5: Kids Meals
  ('f1000000-0000-0000-0000-000000000039', 'c1000000-0000-0000-0000-000000000005',
   'Beef Burger Kids Meal', 'وجبة برجر لحم للأطفال',
   'Includes kids sized beef burger + fries + juice + toy',
   'تأتي مع بطاطس + عصير + لعبة أطفال',
   135.00, NULL, '/placeholder.png', 1),
  ('f1000000-0000-0000-0000-000000000040', 'c1000000-0000-0000-0000-000000000005',
   'Chicken Tender Kids Meal', 'وجبة تشيكن تندر للأطفال',
   'Includes crispy chicken tenders + fries + juice + toy',
   'تأتي مع بطاطس + عصير + لعبة أطفال',
   135.00, NULL, '/placeholder.png', 2),
  ('f1000000-0000-0000-0000-000000000041', 'c1000000-0000-0000-0000-000000000005',
   'Broasted Chicken Piece Meal', 'وجبة قطعة فراخ بروستد للأطفال',
   'Includes 1 piece of broasted chicken + fries + juice + toy',
   'تأتي مع بطاطس + عصير + لعبة أطفال',
   135.00, NULL, '/placeholder.png', 3),

  -- Category 6: Desserts & Beverages
  ('f1000000-0000-0000-0000-000000000042', 'c1000000-0000-0000-0000-000000000006',
   'Mineral Water', 'مياه معدنية',
   'Bottled chilled mineral water',
   'زجاجة مياه معدنية نقية وباردة',
   15.00, 25.00, '/placeholder.png', 1),
  ('f1000000-0000-0000-0000-000000000043', 'c1000000-0000-0000-0000-000000000006',
   'Lotus Biscoff Milkshake', 'ميلك شيك لوتس',
   'Milkshake with Lotus Biscoff biscuit crumbs and syrup',
   'ميلك شيك لوتس بيسكوف الحجم الأساسي',
   39.00, NULL, '/placeholder.png', 2),
  ('f1000000-0000-0000-0000-000000000044', 'c1000000-0000-0000-0000-000000000006',
   'Nutella Chocolate Milkshake', 'ميلك شيك نوتيلا',
   'Rich milkshake loaded with premium Nutella chocolate',
   'ميلك شيك نوتيلا شوكليت الحجم الأساسي',
   39.00, NULL, '/placeholder.png', 3),
  ('f1000000-0000-0000-0000-000000000045', 'c1000000-0000-0000-0000-000000000006',
   'Oreo Shake', 'أوريو شيك',
   'Oreo shake loaded with Oreo biscuits crumbs and syrup',
   'أوريو شيك الحجم الأساسي',
   39.00, NULL, '/placeholder.png', 4);

-- 4. Seed customization groups and options
-- Group 1: Spiciness Level
INSERT INTO public.customization_groups (id, name_en, name_ar, min_selected, max_selected) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Spiciness Level', 'درجة الحرقان', 1, 1);
INSERT INTO public.customization_options (id, group_id, name_en, name_ar, price) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Original (Cold)', 'عادي (Original)', 0),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Spicy (Hot)', 'حار (Spicy)', 0);

-- Group 2: Combo Meal Upgrade
INSERT INTO public.customization_groups (id, name_en, name_ar, min_selected, max_selected) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'Combo Meal Upgrade', 'وجبة كومبو', 0, 1);
INSERT INTO public.customization_options (id, group_id, name_en, name_ar, price) VALUES
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Add Combo (Fries + Drink)', 'تحويل لوجبة كومبو (بطاطس + مشروب)', 70);

-- Group 3: Combo Fries Upgrade
INSERT INTO public.customization_groups (id, name_en, name_ar, min_selected, max_selected) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'Combo Fries Upgrade', 'ترقية البطاطس في الكومبو', 0, 1);
INSERT INTO public.customization_options (id, group_id, name_en, name_ar, price) VALUES
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'Upgrade to Cheesy Fries', 'ترقية لبطاطس بالجبنة', 45);

-- Group 4: Sandwich Add-ons
INSERT INTO public.customization_groups (id, name_en, name_ar, min_selected, max_selected) VALUES
  ('a1000000-0000-0000-0000-000000000004', 'Sandwich Add-ons', 'إضافات السندوتشات', 0, 10);
INSERT INTO public.customization_options (id, group_id, name_en, name_ar, price) VALUES
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000004', 'Add Liquid Cheddar Cheese', 'إضافة صوص تشيدر سائل ساخن', 25),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004', 'Add Smoked Turkey Slice', 'إضافة شريحة تركي مدخن', 30),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004', 'Add Spicy Cheddar Fingers', 'إضافة أصابع تشيدر حارة', 40),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004', 'Add Mozzarella Bomb', 'إضافة قنبلة موتزاريلًا', 60),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000004', 'Extra Crispy Chicken Piece', 'قطعة فراخ كريسبي إضافية', 75),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004', 'Extra Smashed Beef Patty', 'قطعة برجر لحم سماش إضافية', 65),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000004', 'Add Extra Dipping Sauce', 'إضافة صوص جانبي خارجي (رانش / بافلو / إلخ)', 20);

-- Group 5: A La Carte Additions
INSERT INTO public.customization_groups (id, name_en, name_ar, min_selected, max_selected) VALUES
  ('a1000000-0000-0000-0000-000000000005', 'A La Carte Additions', 'إضافة قطع منفصلة', 0, 10);
INSERT INTO public.customization_options (id, group_id, name_en, name_ar, price) VALUES
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000005', 'Extra Broasted Chicken Piece', 'قطعة فراخ بروستد إضافية', 88),
  ('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000005', 'Extra Crispy Fillet Piece', 'قطعة فيليه دجاج مقرمش إضافية', 94),
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000005', 'Extra Crispy Tender Piece', 'قطعة تندر كريسبي إضافية', 66),
  ('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000005', 'Extra Brioche Bun', 'خبز بريوش إضافي', 12);

-- Group 6: Milkshake Additions
INSERT INTO public.customization_groups (id, name_en, name_ar, min_selected, max_selected) VALUES
  ('a1000000-0000-0000-0000-000000000006', 'Milkshake Additions', 'إضافات الشيك', 0, 2);
INSERT INTO public.customization_options (id, group_id, name_en, name_ar, price) VALUES
  ('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000006', 'Extra Scoop of Vanilla Ice Cream', 'إضافة بوله آيس كريم إضافية', 25),
  ('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000006', 'Extra Syrup Sauce', 'إضافة اكسترا صوص', 15);

-- 5. Link menu items with their allowed customization groups
-- Link Sandwiches
INSERT INTO public.menu_item_customization_groups (menu_item_id, group_id) VALUES
  ('f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004'),

  ('f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004'),

  ('f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004'),

  ('f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000004'),

  ('f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004'),

  ('f1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000004'),

  ('f1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000002'),
  ('f1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000004');

-- Link Broasted Meals
INSERT INTO public.menu_item_customization_groups (menu_item_id, group_id) VALUES
  ('f1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000005'),
  ('f1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000005');

-- Link Shakes
INSERT INTO public.menu_item_customization_groups (menu_item_id, group_id) VALUES
  ('f1000000-0000-0000-0000-000000000043', 'a1000000-0000-0000-0000-000000000006'),
  ('f1000000-0000-0000-0000-000000000044', 'a1000000-0000-0000-0000-000000000006'),
  ('f1000000-0000-0000-0000-000000000045', 'a1000000-0000-0000-0000-000000000006');
