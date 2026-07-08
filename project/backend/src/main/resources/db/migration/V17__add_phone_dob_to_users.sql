-- Thêm cột phone + date_of_birth cho Settings page (cập nhật hồ sơ cá nhân)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
