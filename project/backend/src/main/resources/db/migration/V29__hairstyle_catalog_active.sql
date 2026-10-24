-- Cho phép ẩn kiểu tóc thay vì xoá cứng (giữ "Yêu thích" của khách)
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
