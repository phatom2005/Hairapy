-- Bảng salon đối tác cho SalonsPage — trước đây FE dùng mock data hardcode trong figmaAssets.js
-- district tách riêng khỏi address để filter dễ, không parse chuỗi địa chỉ
-- service_types lưu comma-separated giống pattern face_shape của hairstyle_catalog (1 salon có thể có nhiều dịch vụ)
CREATE TABLE IF NOT EXISTS salons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(300) NOT NULL,
    district VARCHAR(50) NOT NULL,
    service_types VARCHAR(300),
    price_from INTEGER NOT NULL,
    rating DOUBLE PRECISION NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    image_url VARCHAR(500) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salons_district ON salons (district);

-- RLS deny-all cho PostgREST/Supabase auto-expose, đồng bộ với các bảng khác (xem V15)
-- Backend connect qua JDBC Session Pooler nên không bị ảnh hưởng
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Seed dữ liệu mẫu, thay thế mock SALONS trong figmaAssets.js — ảnh dùng placeholder Unsplash
-- giống pattern V6__seed_hairstyles.sql (Admin có thể cập nhật ảnh thật sau)
INSERT INTO salons (name, address, district, service_types, price_from, rating, verified, image_url, phone, created_at)
VALUES
    ('Elite Hair Design - Quận 1', '123 Lê Lợi, Phường Bến Thành, Quận 1', 'Quận 1', 'Cắt tóc,Nhuộm tóc,Combo trọn gói', 250000, 4.9, true, 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600', '0901234567', NOW()),
    ('The Studio - Quận 3', '45 Nguyễn Đình Chiểu, Quận 3', 'Quận 3', 'Cắt tóc,Uốn/Duỗi tóc', 180000, 4.8, true, 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600', '0901234568', NOW()),
    ('Urban Cut - Quận 7', '88 Nguyễn Văn Linh, Quận 7', 'Quận 7', 'Cắt tóc,Phục hồi tóc', 200000, 4.7, false, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600', '0901234569', NOW()),
    ('Glow Beauty Salon - Bình Thạnh', '12 Điện Biên Phủ, Bình Thạnh', 'Bình Thạnh', 'Nhuộm tóc,Phục hồi tóc,Combo trọn gói', 320000, 4.6, true, 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=600', '0901234570', NOW()),
    ('Metro Barber - Gò Vấp', '200 Quang Trung, Gò Vấp', 'Gò Vấp', 'Cắt tóc', 120000, 4.5, false, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600', '0901234571', NOW()),
    ('Luxe Hair Lounge - Phú Nhuận', '56 Phan Xích Long, Phú Nhuận', 'Phú Nhuận', 'Uốn/Duỗi tóc,Nhuộm tóc,Combo trọn gói', 450000, 4.9, true, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600', '0901234572', NOW())
ON CONFLICT DO NOTHING;
