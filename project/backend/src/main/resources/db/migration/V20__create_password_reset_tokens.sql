-- NOTE: Nếu sau này áp dụng "Đợt 1 - Refresh Token" (dùng V20__create_refresh_tokens.sql),
-- phải đổi số file đó thành V22 để tránh trùng với V20/V21 đã có ở đây.

-- Token dat lai mat khau, luu dang hash SHA-256 (khong luu token goc), het han sau 30 phut,
-- danh dau used=true sau khi dung 1 lan de khong the tai su dung.
CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
