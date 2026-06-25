-- =========================================================
-- V12: Fix image URL for Messy Pixie to use a female portrait
-- =========================================================

UPDATE hairstyle_catalog 
SET image_url = 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600'
WHERE name = 'Messy Pixie';
