-- V30__catalog_overhaul.sql
-- Đánh dấu ảnh mẫu đã được tạo bằng AI đúng mã kiểu (hiện nhãn "Ảnh minh hoạ do AI tạo")
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS sample_by_ai BOOLEAN NOT NULL DEFAULT FALSE;
-- Biến thể màu: màu AILab mặc định của mục (NULL = màu tóc gốc của ảnh) + trỏ về kiểu gốc
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS ailab_color VARCHAR(30);
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS base_style_id BIGINT REFERENCES hairstyle_catalog(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_catalog_base_style ON hairstyle_catalog(base_style_id);
-- KHÔNG tạo unique index (mã, màu) ở DB: DB local seed cũ còn mục trùng mã → index sẽ fail; kiểm tra trùng ở tầng ứng dụng.

-- ===== Sửa map sai / trùng mã trên dữ liệu production (điều kiện kép để DB local khác dữ liệu sẽ không bị ảnh hưởng) =====
UPDATE hairstyle_catalog SET ailab_pro_style = 'CombOver',
       description = 'Rẽ ngôi lệch 7/3 chải gọn sang một bên, lịch sự và dễ chăm sóc — hợp đi học, đi làm.'
 WHERE id = 3 AND gender = 'Nam' AND ailab_pro_style = 'LongCurly';
UPDATE hairstyle_catalog SET name = 'Low Fade Gọn Gàng' WHERE id = 2 AND ailab_pro_style = 'LowFade' AND name = 'Undercut Quiff';
UPDATE hairstyle_catalog SET name = 'Pompadour Cổ Điển' WHERE id = 6 AND ailab_pro_style = 'Pompadour';
UPDATE hairstyle_catalog SET ailab_pro_style = 'WavyFrenchBobVibesfrom1920' WHERE id = 4 AND ailab_pro_style = 'BobCut';
UPDATE hairstyle_catalog SET ailab_pro_style = 'bowlCut' WHERE id = 17 AND ailab_pro_style = 'BobCut';
UPDATE hairstyle_catalog SET name = 'Tóc Ngang Vai Uốn Nhẹ', ailab_pro_style = 'ShoulderLengthHair',
       description = 'Tóc dài ngang vai uốn nhẹ phần đuôi, dễ chăm sóc và hợp nhiều dáng mặt.'
 WHERE id = 20 AND ailab_pro_style = 'LongWavyCurtainBangs';
UPDATE hairstyle_catalog SET gender = 'Unisex' WHERE id = 14 AND ailab_pro_style = 'CurlyShag';

-- ===== Thêm kiểu mới (mỗi kiểu 1 mã AI riêng). Ẩn (active=false) cho tới khi admin tạo ảnh mẫu AI ở trang Admin =====
INSERT INTO hairstyle_catalog (name, tag, face_shape, hair_length, description, image_url, premium_only, gender, ailab_pro_style, active, sample_by_ai)
SELECT v.name, v.tag, v.face_shape, v.hair_length, v.description, 'https://placehold.co/600x800/png?text=Hairapy',
       v.premium_only, v.gender, v.code, FALSE, FALSE
FROM (VALUES
  -- Nam
  ('Undercut Cổ Điển','Thịnh hành','Trái xoan,Vuông,Kim cương','Ngắn','Hai bên cạo sát, phần đỉnh để dài vuốt gọn — mạnh mẽ, dễ tạo kiểu.',FALSE,'Nam','UnderCut'),
  ('Faux Hawk Cá Tính','Viral','Tròn,Trái xoan,Trái tim','Ngắn','Phần giữa vuốt dựng nhẹ, hai bên ngắn — kéo dài khuôn mặt, cá tính nhưng không quá nổi loạn.',TRUE,'Nam','FauxHawk'),
  ('Tóc Dựng Spiky','Mới','Tròn,Vuông,Trái xoan','Ngắn','Tóc ngắn vuốt dựng từng chóp, năng động, hợp mặt tròn cần thêm chiều cao.',FALSE,'Nam','Spiky'),
  ('Man Bun Búi Cao','Viral','Trái xoan,Vuông,Kim cương','Dài','Tóc dài búi gọn sau đầu, phóng khoáng, phong cách nghệ sĩ.',TRUE,'Nam','ManBun'),
  ('Afro Xoăn Tự Nhiên','Mới','Dài,Trái xoan,Kim cương','Vừa','Xoăn tít bồng bềnh tạo khối tròn, tăng độ đầy cho gương mặt dài.',TRUE,'Nam','Afro'),
  ('Undercut Tóc Dài','Thịnh hành','Trái xoan,Vuông,Dài','Dài','Hai bên cạo gọn, phần trên để dài thả hoặc vuốt ngược — cá tính, nổi bật.',TRUE,'Nam','UndercutLongHair'),
  ('Mái Tỉa Texture','Bán chạy','Dài,Trái tim,Trái xoan','Ngắn','Tóc ngắn tỉa texture, mái rủ nhẹ xuống trán — trẻ trung, che trán cao.',FALSE,'Nam','TexturedFringe'),
  ('Bowl Cut Mái Bằng','Mới','Trái xoan,Dài,Trái tim','Ngắn','Tóc ôm đầu với mái bằng, phong cách Hàn Quốc trẻ trung.',FALSE,'Nam','BluntBowlCut'),
  ('Tóc Dài Buộc Gọn','Thanh lịch','Trái xoan,Vuông,Kim cương','Dài','Tóc dài buộc gọn sau gáy, lịch sự mà vẫn phóng khoáng.',TRUE,'Nam','LongHairTiedUp'),
  ('Side Part Fade','Thanh lịch','Tròn,Vuông,Trái xoan','Ngắn','Rẽ ngôi lệch chải gọn kết hợp fade cao hai bên — chỉn chu, hiện đại.',FALSE,'Nam','SidePartCombOverHairstyleWithHighFade'),
  -- Nữ
  ('Búi Đôi Dễ Thương','Viral','Trái xoan,Trái tim,Kim cương','Dài','Hai búi tròn trên đỉnh đầu, tinh nghịch, hợp đi chơi, dã ngoại.',FALSE,'Nữ','DoubleBun'),
  ('Updo Sang Trọng','Thanh lịch','Trái xoan,Trái tim,Dài','Dài','Tóc vấn cao gọn gàng, tôn cổ và đường hàm — hợp tiệc, sự kiện.',TRUE,'Nữ','Updo'),
  ('Búi Thấp Chignon','Thanh lịch','Trái xoan,Kim cương,Vuông','Dài','Búi thấp sau gáy kiểu Pháp, dịu dàng và trang nhã.',TRUE,'Nữ','Chignon'),
  ('Vuốt Ngược Cá Tính','Thịnh hành','Trái xoan,Kim cương,Trái tim','Ngắn','Tóc vuốt ngược bóng mượt, sắc sảo, hiện đại.',TRUE,'Nữ','SlickedBack'),
  ('Bob Xoăn Tầng','Mới','Dài,Trái tim,Kim cương','Ngắn','Bob ngắn xếp tầng lọn xoăn, tạo độ phồng hai bên cho mặt dài.',FALSE,'Nữ','StackedCurlsInShortBob'),
  ('Buộc Hai Bên Ngắn','Viral','Tròn,Trái xoan','Vừa','Hai chùm tóc buộc thấp hai bên, trẻ trung, dễ thương.',FALSE,'Nữ','ShortTwintails'),
  ('Pixie Xoăn','Mới','Trái xoan,Trái tim,Dài','Ngắn','Pixie ngắn với lọn xoăn nhỏ, năng động và độc đáo.',TRUE,'Nữ','ShortCurlyPixie'),
  ('Tết Đuôi Cá','Bán chạy','Trái xoan,Tròn,Vuông','Dài','Bím tết đuôi cá mềm mại, nữ tính, hợp đi chơi.',FALSE,'Nữ','FishtailBraid'),
  ('Tết Hai Bím','Thịnh hành','Trái xoan,Trái tim,Tròn','Dài','Hai bím tết hai bên gọn gàng, năng động.',FALSE,'Nữ','TwinBraids'),
  ('Cột Đuôi Ngựa','Kinh điển','Trái xoan,Trái tim,Kim cương','Dài','Tóc buộc cao đuôi ngựa — gọn, trẻ trung, hợp đi học, tập thể thao.',FALSE,'Nữ','Ponytail'),
  ('Buộc Hai Bên Dài','Viral','Tròn,Trái xoan','Dài','Hai chùm tóc dài buộc cao hai bên, phong cách idol.',FALSE,'Nữ','LongTwintails'),
  ('Hime Cut Công Chúa','Viral','Tròn,Vuông,Dài','Dài','Mái bằng + hai lọn mai cắt ngang má, tóc dài thẳng — phong cách Nhật.',TRUE,'Nữ','LongHimeCut'),
  ('Xoăn Afro Lơi','Mới','Dài,Trái xoan,Kim cương','Vừa','Xoăn lơi bồng bềnh dạng afro mềm, tăng độ dày cho tóc.',TRUE,'Nữ','LooseCurlyAfro'),
  ('Tết Box Braids','Mới','Trái xoan,Dài,Kim cương','Dài','Nhiều bím tết nhỏ đều nhau, cá tính, phong cách đường phố.',TRUE,'Nữ','BoxBraids')
) AS v(name, tag, face_shape, hair_length, description, premium_only, gender, code)
WHERE NOT EXISTS (SELECT 1 FROM hairstyle_catalog h WHERE h.ailab_pro_style = v.code);
