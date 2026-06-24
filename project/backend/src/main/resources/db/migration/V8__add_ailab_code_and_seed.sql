-- Thêm cột mã kiểu tóc tương ứng AILab API
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS ailab_hair_type INTEGER;

-- Cập nhật mã AILab cho 6 kiểu tóc đã có
UPDATE hairstyle_catalog SET ailab_hair_type = 801 WHERE name = 'Wolf Cut Pastel';   -- Wispy bangs
UPDATE hairstyle_catalog SET ailab_hair_type = 603 WHERE name = 'Modern Fade';       -- Short hair
UPDATE hairstyle_catalog SET ailab_hair_type = 401 WHERE name = 'Sunset Curls';      -- Long curly
UPDATE hairstyle_catalog SET ailab_hair_type = 301 WHERE name = 'French Chic Bob';   -- Bob-cut
UPDATE hairstyle_catalog SET ailab_hair_type = 3   WHERE name = 'Surf Shag';         -- Volume
UPDATE hairstyle_catalog SET ailab_hair_type = 901 WHERE name = 'Sleek Quiff';       -- Straight

-- Thêm seed data mới để mỗi face_shape có ít nhất 4 kiểu tóc
-- Sử dụng ảnh Unsplash miễn phí, sẽ thay bằng ảnh thật sau
INSERT INTO hairstyle_catalog (name, tag, face_shape, hair_length, description, image_url, premium_only, ailab_hair_type)
VALUES
  -- Thêm cho Vuông (hiện chỉ có 1)
  ('Soft Beach Waves', 'Thịnh hành', 'Vuông', 'Dài',  'Sóng biển mềm mại làm dịu các góc cạnh gương mặt vuông.', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600', false, 401),
  ('Layered Curtain Bangs', 'Mới', 'Vuông', 'Vừa', 'Mái bay rủ nhẹ hai bên, layer mềm mại che góc hàm.', 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600', false, 2),
  ('Textured Crop', 'Kinh điển', 'Vuông', 'Ngắn', 'Kiểu crop ngắn tạo texture phần đỉnh, phù hợp mặt vuông nam.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', true, 603),

  -- Thêm cho Tròn (hiện có 2)
  ('Layered Bob', 'Mới', 'Tròn', 'Ngắn', 'Bob tỉa tầng kéo dài tỷ lệ gương mặt tròn.', 'https://images.unsplash.com/photo-1554519934-e32b1629d9ee?w=600', false, 301),
  ('Long Straight Layers', 'Kinh điển', 'Tròn', 'Dài', 'Tóc thẳng tầng dài tạo cảm giác gương mặt thon thả.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600', true, 901),

  -- Thêm cho Trái tim (Heart) — hiện có 0
  ('Side-Swept Bangs', 'Thịnh hành', 'Trái tim', 'Vừa', 'Mái lệch che bớt trán rộng, cân bằng cằm nhọn.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600', false, 801),
  ('Chin-Length Bob', 'Mới', 'Trái tim', 'Ngắn', 'Bob ngang cằm tạo độ đầy đặn phần cằm hẹp.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600', false, 301),
  ('Wavy Lob', 'Bán chạy', 'Trái tim', 'Vừa', 'Long bob xoăn nhẹ ôm gương mặt hình trái tim hoàn hảo.', 'https://images.unsplash.com/photo-1499557354967-2b2d8910bcca?w=600', false, 402),
  ('Textured Pixie', 'Viral', 'Trái tim', 'Ngắn', 'Pixie phá cách, tạo texture phần đỉnh nổi bật.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600', true, 4),

  -- Thêm cho Kim cương (Diamond) — hiện có 0
  ('Layered Waves', 'Thịnh hành', 'Kim cương', 'Vừa', 'Sóng tầng ôm nhẹ gò má, cân bằng dáng mặt kim cương.', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600', false, 2),
  ('Fringe Bob', 'Mới', 'Kim cương', 'Ngắn', 'Bob có mái che trán hẹp, làm dịu gò má cao.', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600', false, 0),
  ('Voluminous Curls', 'Bán chạy', 'Kim cương', 'Dài', 'Xoăn bồng bềnh tạo độ phồng vùng thái dương.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600', false, 401),
  ('Sleek Middle Part', 'Kinh điển', 'Kim cương', 'Dài', 'Ngôi giữa thẳng mượt, tóc ôm sát gò má.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600', true, 503),

  -- Thêm cho Dài/Thuôn (Oblong) — hiện có 1
  ('Curtain Bangs Medium', 'Thịnh hành', 'Dài', 'Vừa', 'Mái bay rủ nhẹ rút ngắn chiều dài thị giác gương mặt thuôn.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', false, 801),
  ('Full Bangs Straight', 'Mới', 'Dài', 'Dài', 'Mái bằng dày che trán cao, giảm chiều dài gương mặt.', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600', false, 0),
  ('Bouncy Bob', 'Bán chạy', 'Dài', 'Ngắn', 'Bob xoăn nhẹ tạo chiều rộng cho gương mặt thuôn dài.', 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=600', false, 402),

  -- Thêm cho Trái xoan (hiện có 2)
  ('Classic Long Waves', 'Kinh điển', 'Trái xoan', 'Dài', 'Sóng dài cổ điển tôn vinh sự cân đối tự nhiên.', 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600', false, 1),
  ('Messy Pixie', 'Viral', 'Trái xoan', 'Ngắn', 'Pixie rối phóng khoáng, hoàn hảo cho mặt trái xoan.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600', false, 603)
ON CONFLICT DO NOTHING;
