-- Phase 6.1: Admin khoá tài khoản (spam, lạm dụng). Mặc định không khoá.
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
