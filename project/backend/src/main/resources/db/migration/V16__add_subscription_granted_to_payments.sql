-- Cờ đánh dấu đã cấp Subscription cho giao dịch này chưa — dùng để idempotent
-- hóa việc xử lý thanh toán (webhook có thể gọi lại nhiều lần, và luồng poll
-- FE cũng có thể trigger cấp gói — cả 2 phải dùng chung 1 cổng kiểm tra).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_granted BOOLEAN NOT NULL DEFAULT FALSE;
