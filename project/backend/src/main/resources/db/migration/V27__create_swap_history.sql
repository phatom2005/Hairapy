-- Lịch sử ảnh đã thử tóc (giữ 30 ngày, tối đa 20 ảnh/user — xem SwapHistoryService / SwapHistoryScheduler)
CREATE TABLE IF NOT EXISTS swap_history (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hairstyle_id   BIGINT,
    hairstyle_name VARCHAR(150),
    image_url      VARCHAR(500) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swap_history_user_created ON swap_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swap_history_created_at ON swap_history(created_at);

-- Bật Row Level Security (RLS) để bảo vệ bảng trên Supabase (backend truy cập bằng role riêng nên không ảnh hưởng)
ALTER TABLE public.swap_history ENABLE ROW LEVEL SECURITY;
