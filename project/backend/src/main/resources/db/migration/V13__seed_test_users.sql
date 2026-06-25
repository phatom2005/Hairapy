-- Seed thêm các tài khoản kiểm thử mặc định
-- Tất cả các tài khoản dưới đây đều sử dụng password: Admin@123 (mã băm bcrypt tương tự admin)

-- 1. Tài khoản USER thường (Chưa đăng ký Premium, mặc định dùng thử bản miễn phí)
INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
VALUES ('user@hairapy.ai', '$2a$10$qpMDKPqc8.d6LMBeKJzGgefm7AZEgq5G7BkRpc.uMvxdR5s0bMBjO', 'Regular User', 'USER', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Tài khoản TESTER (Bypass quota lượt thử)
INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
VALUES ('tester@hairapy.ai', '$2a$10$qpMDKPqc8.d6LMBeKJzGgefm7AZEgq5G7BkRpc.uMvxdR5s0bMBjO', 'QA Tester', 'TESTER', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Tài khoản PREMIUM (Đã có sẵn subscription PREMIUM)
INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
VALUES ('premium@hairapy.ai', '$2a$10$qpMDKPqc8.d6LMBeKJzGgefm7AZEgq5G7BkRpc.uMvxdR5s0bMBjO', 'Premium Member', 'USER', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Thêm subscription active cho premium user
INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, created_at)
SELECT id, 'PREMIUM', 'ACTIVE', NOW(), NOW() + INTERVAL '30 day', NOW()
FROM users
WHERE email = 'premium@hairapy.ai'
  AND NOT EXISTS (
      SELECT 1 FROM subscriptions s WHERE s.user_id = users.id AND s.status = 'ACTIVE'
  );
