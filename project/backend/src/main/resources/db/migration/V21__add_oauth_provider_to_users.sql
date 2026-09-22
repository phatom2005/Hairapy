-- NOTE: Nếu sau này áp dụng "Đợt 1 - Refresh Token" (dùng V20__create_refresh_tokens.sql),
-- phải đổi số file đó thành V22 để tránh trùng với V20/V21 đã có ở đây.

-- Cho phep user dang nhap qua Google/Facebook khong co mat khau noi bo,
-- va ghi nhan user dang ky/dang nhap qua provider nao.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN provider_id VARCHAR(255);
