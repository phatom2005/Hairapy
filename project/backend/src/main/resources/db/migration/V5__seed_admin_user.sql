-- Seed admin user mặc định
-- Email: admin@hairapy.ai
-- Password: Admin@123
INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
VALUES ('admin@hairapy.ai', '$2a$10$qpMDKPqc8.d6LMBeKJzGgefm7AZEgq5G7BkRpc.uMvxdR5s0bMBjO', 'Hairapy Admin', 'ADMIN', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
