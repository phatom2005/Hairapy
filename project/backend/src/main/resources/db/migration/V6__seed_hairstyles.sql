-- Seed dữ liệu mẫu danh mục kiểu tóc
-- Tương ứng với dữ liệu mock hiện tại ở CatalogPage.jsx
-- Ảnh mẫu sử dụng URL placeholder (Admin có thể cập nhật ảnh thật qua trang quản trị)
INSERT INTO hairstyle_catalog (name, tag, face_shape, hair_length, description, image_url, premium_only, created_at)
VALUES
    ('Wolf Cut Pastel',  'Thịnh hành', 'Trái xoan', 'Vừa',  'Sự kết hợp hoàn hảo giữa nét phá cách và dịu dàng.', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600', false, NOW()),
    ('Modern Fade',      'Kinh điển',  'Vuông',     'Ngắn', 'Gọn gàng, nam tính và vô cùng lịch lãm.',             'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600', false, NOW()),
    ('Sunset Curls',     'Bán chạy',   'Tròn',      'Dài',  'Quyến rũ với những lọn tóc xoăn bồng bềnh.',         'https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=600', false, NOW()),
    ('French Chic Bob',  'Mới',        'Dài',       'Ngắn', 'Vẻ đẹp tối giản, thanh lịch vượt thời gian.',        'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600', false, NOW()),
    ('Surf Shag',        'Viral',      'Tròn',      'Vừa',  'Phong cách tự do, phóng khoáng như nắng hè.',         'https://images.unsplash.com/photo-1595956553066-fe24a8c33395?w=600', true,  NOW()),
    ('Sleek Quiff',      'Thanh lịch', 'Trái xoan', 'Ngắn', 'Sự lựa chọn hàng đầu cho quý ông công sở.',          'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600', true,  NOW())
ON CONFLICT DO NOTHING;
