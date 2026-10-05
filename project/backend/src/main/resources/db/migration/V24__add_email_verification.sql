-- Xác minh email khi đăng ký.
-- Toàn bộ user HIỆN CÓ (gồm admin, tester, seed, user Google/Facebook) được coi là đã xác minh
-- để không bị khóa đăng nhập; chỉ user đăng ký mới sau migration này mới phải xác minh.
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET email_verified = TRUE;

-- Token xác minh email: lưu hash SHA-256 (không lưu token gốc), hết hạn sau 24 giờ,
-- đánh dấu used=true sau khi dùng. Cùng pattern với password_reset_tokens (V20).
CREATE TABLE email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- RLS deny-all cho PostgREST/Supabase auto-expose (xem V15, V23). Backend dùng JDBC role postgres nên bypass RLS.
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
