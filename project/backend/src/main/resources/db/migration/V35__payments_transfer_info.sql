-- Thông tin chuyển khoản RÚT GỌN từ webhook PayOS để admin đối soát.
-- Chỉ lưu 4 số cuối tài khoản người chuyển, KHÔNG lưu số tài khoản đầy đủ.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS counter_bank_name VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS counter_account_name VARCHAR(150);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS counter_account_last4 VARCHAR(4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_description VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_transaction_at TIMESTAMP;
