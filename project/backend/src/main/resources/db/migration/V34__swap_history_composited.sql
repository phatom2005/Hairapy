-- Phase 7.2: ảnh thử tóc đã được ghép giữ nguyên gương mặt/trang phục gốc (identity-preserving composite)
ALTER TABLE swap_history ADD COLUMN IF NOT EXISTS composited BOOLEAN NOT NULL DEFAULT FALSE;
