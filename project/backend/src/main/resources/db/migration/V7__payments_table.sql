-- =========================================================
-- V6: payments table schema
-- =========================================================

CREATE TABLE IF NOT EXISTS payments (
    id                   BIGSERIAL    PRIMARY KEY,
    user_id              BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_code           BIGINT       NOT NULL UNIQUE,  -- Mã đơn hàng của PayOS (kiểu long, duy nhất)
    plan                 VARCHAR(20)  NOT NULL,          -- Gói thanh toán: PRO hoặc PREMIUM
    amount               INTEGER      NOT NULL,          -- Số tiền thanh toán (VND)
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- Trạng thái: PENDING, PAID, CANCELLED
    payos_transaction_id VARCHAR(100),                   -- ID giao dịch từ PayOS callback
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    paid_at              TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_code ON payments(order_code);
