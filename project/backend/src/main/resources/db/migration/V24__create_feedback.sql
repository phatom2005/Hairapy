-- Tạo bảng feedback lưu trữ đánh giá sao và nhận xét từ người dùng
CREATE TABLE IF NOT EXISTS feedback (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    VARCHAR(500),
    feature    VARCHAR(20)  NOT NULL DEFAULT 'GENERAL',  -- HAIR_SWAP | FACE_SCAN | GENERAL
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Bật Row Level Security (RLS) để bảo vệ bảng trên Supabase
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
