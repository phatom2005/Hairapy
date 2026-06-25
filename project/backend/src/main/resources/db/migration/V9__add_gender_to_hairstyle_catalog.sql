-- Thêm cột giới tính để cá nhân hóa gợi ý kiểu tóc
-- Giá trị: 'Nam', 'Nữ', 'Unisex' (mặc định Unisex cho backward-compatible)
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'Unisex' NOT NULL;

-- Cập nhật gender cho seed V6
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Wolf Cut Pastel';
UPDATE hairstyle_catalog SET gender = 'Nam'     WHERE name = 'Modern Fade';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Sunset Curls';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'French Chic Bob';
UPDATE hairstyle_catalog SET gender = 'Unisex'  WHERE name = 'Surf Shag';
UPDATE hairstyle_catalog SET gender = 'Nam'     WHERE name = 'Sleek Quiff';

-- Cập nhật gender cho seed V8
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Soft Beach Waves';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Layered Curtain Bangs';
UPDATE hairstyle_catalog SET gender = 'Nam'     WHERE name = 'Textured Crop';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Layered Bob';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Long Straight Layers';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Side-Swept Bangs';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Chin-Length Bob';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Wavy Lob';
UPDATE hairstyle_catalog SET gender = 'Unisex'  WHERE name = 'Textured Pixie';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Layered Waves';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Fringe Bob';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Voluminous Curls';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Sleek Middle Part';
UPDATE hairstyle_catalog SET gender = 'Unisex'  WHERE name = 'Curtain Bangs Medium';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Full Bangs Straight';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Bouncy Bob';
UPDATE hairstyle_catalog SET gender = 'Nữ'     WHERE name = 'Classic Long Waves';
UPDATE hairstyle_catalog SET gender = 'Unisex'  WHERE name = 'Messy Pixie';

-- Index để tăng tốc filter theo gender
CREATE INDEX IF NOT EXISTS idx_hairstyle_catalog_gender ON hairstyle_catalog(gender);
