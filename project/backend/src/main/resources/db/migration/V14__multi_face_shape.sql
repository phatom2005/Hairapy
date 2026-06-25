-- V14: Mở rộng cột face_shape để hỗ trợ nhiều dáng mặt (comma-separated)
-- Ví dụ: "Oval,Round,Heart" thay vì chỉ "Oval"
ALTER TABLE hairstyle_catalog ALTER COLUMN face_shape TYPE VARCHAR(200);
