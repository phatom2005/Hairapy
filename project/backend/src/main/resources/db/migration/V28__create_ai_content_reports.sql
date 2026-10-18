-- Báo cáo nội dung do AI tạo ra (yêu cầu của chính sách Google Play về nội dung AI):
-- người dùng báo cáo ảnh thử tóc không phù hợp / bị lỗi ngay trong ứng dụng.
CREATE TABLE IF NOT EXISTS ai_content_reports (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature      VARCHAR(20)  NOT NULL DEFAULT 'HAIR_SWAP',
    reason       VARCHAR(30)  NOT NULL,
    comment      VARCHAR(500),
    image_url    VARCHAR(500),
    hairstyle_id BIGINT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_status_created ON ai_content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_created ON ai_content_reports(user_id, created_at DESC);

-- Bật Row Level Security (RLS) để bảo vệ bảng trên Supabase (backend truy cập bằng role riêng nên không ảnh hưởng)
ALTER TABLE public.ai_content_reports ENABLE ROW LEVEL SECURITY;
