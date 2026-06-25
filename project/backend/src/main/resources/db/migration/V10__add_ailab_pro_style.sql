-- Thêm cột mã kiểu tóc Pro API (string code thay vì integer)
-- Pro API dùng Stable Diffusion, chỉ thay tóc mà KHÔNG thay mặt
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS ailab_pro_style VARCHAR(50);

-- Mapping V6 seed data → Pro API hair_style codes
UPDATE hairstyle_catalog SET ailab_pro_style = 'MessyTousled'          WHERE name = 'Wolf Cut Pastel';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LowFade'               WHERE name = 'Modern Fade';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongCurly'             WHERE name = 'Sunset Curls';
UPDATE hairstyle_catalog SET ailab_pro_style = 'BobCut'                WHERE name = 'French Chic Bob';
UPDATE hairstyle_catalog SET ailab_pro_style = 'WavyShag'              WHERE name = 'Surf Shag';
UPDATE hairstyle_catalog SET ailab_pro_style = 'Pompadour'             WHERE name = 'Sleek Quiff';

-- Mapping V8 seed data → Pro API hair_style codes
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongWavy'              WHERE name = 'Soft Beach Waves';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongWavyCurtainBangs'  WHERE name = 'Layered Curtain Bangs';
UPDATE hairstyle_catalog SET ailab_pro_style = 'TexturedFringe'        WHERE name = 'Textured Crop';
UPDATE hairstyle_catalog SET ailab_pro_style = 'ShortNeatBob'          WHERE name = 'Layered Bob';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongStraight'          WHERE name = 'Long Straight Layers';
UPDATE hairstyle_catalog SET ailab_pro_style = 'ShoulderLengthHair'    WHERE name = 'Side-Swept Bangs';
UPDATE hairstyle_catalog SET ailab_pro_style = 'ShortNeatBob'          WHERE name = 'Chin-Length Bob';
UPDATE hairstyle_catalog SET ailab_pro_style = 'ShoulderLengthHair'    WHERE name = 'Wavy Lob';
UPDATE hairstyle_catalog SET ailab_pro_style = 'PixieCut'              WHERE name = 'Textured Pixie';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongWavy'              WHERE name = 'Layered Waves';
UPDATE hairstyle_catalog SET ailab_pro_style = 'BobCut'                WHERE name = 'Fringe Bob';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongCurly'             WHERE name = 'Voluminous Curls';
UPDATE hairstyle_catalog SET ailab_pro_style = 'Middle-parted'         WHERE name = 'Sleek Middle Part';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongWavyCurtainBangs'  WHERE name = 'Curtain Bangs Medium';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongStraight'          WHERE name = 'Full Bangs Straight';
UPDATE hairstyle_catalog SET ailab_pro_style = 'CurlyBob'              WHERE name = 'Bouncy Bob';
UPDATE hairstyle_catalog SET ailab_pro_style = 'LongWavy'              WHERE name = 'Classic Long Waves';
UPDATE hairstyle_catalog SET ailab_pro_style = 'ShortPixieWithShavedSides' WHERE name = 'Messy Pixie';
