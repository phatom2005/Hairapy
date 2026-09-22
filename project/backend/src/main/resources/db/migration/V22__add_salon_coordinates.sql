-- NOTE: Nếu sau này áp dụng "Đợt 1 - Refresh Token" (dùng V20__create_refresh_tokens.sql),
-- phải đổi số file đó thành V23 để tránh trùng với V20, V21, V22 đã có ở đây.

ALTER TABLE salons ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE salons ADD COLUMN longitude DOUBLE PRECISION;

-- Toạ độ ước lượng trung tâm quận cho mục đích demo (admin có thể cập nhật lại chính xác hơn qua trang Admin Salon)
UPDATE salons SET latitude = 10.7721, longitude = 106.6980 WHERE name = 'Elite Hair Design - Quận 1';
UPDATE salons SET latitude = 10.7860, longitude = 106.6910 WHERE name = 'The Studio - Quận 3';
UPDATE salons SET latitude = 10.7290, longitude = 106.7020 WHERE name = 'Urban Cut - Quận 7';
UPDATE salons SET latitude = 10.8010, longitude = 106.7100 WHERE name = 'Glow Beauty Salon - Bình Thạnh';
UPDATE salons SET latitude = 10.8380, longitude = 106.6790 WHERE name = 'Metro Barber - Gò Vấp';
UPDATE salons SET latitude = 10.7990, longitude = 106.6850 WHERE name = 'Luxe Hair Lounge - Phú Nhuận';
