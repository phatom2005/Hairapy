-- Ghi lại kiểu tóc được thử ở mỗi lượt HAIR_SWAP (phục vụ thống kê "kiểu tóc được thử nhiều nhất").
-- Cột nullable: các lượt cũ và các feature khác (FACE_SCAN, AI_STYLIST) để NULL; không hồi tố được.
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS hairstyle_id BIGINT;

-- Index kết hợp cho truy vấn đếm lượt dùng hôm nay (user + feature + thời điểm) — chạy ở mỗi lần reserveUsage.
CREATE INDEX IF NOT EXISTS idx_usage_history_user_feature_used_at
    ON usage_history(user_id, feature, used_at);

-- Index cho thống kê theo kiểu tóc
CREATE INDEX IF NOT EXISTS idx_usage_history_hairstyle_id
    ON usage_history(hairstyle_id) WHERE hairstyle_id IS NOT NULL;
