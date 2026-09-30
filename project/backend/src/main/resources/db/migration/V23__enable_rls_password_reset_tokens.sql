-- Bật RLS deny-all cho password_reset_tokens (V20 tạo bảng nhưng quên bật RLS)
-- Supabase advisor báo rls_disabled_in_public: PostgREST đang expose bảng này ra public
-- Không tạo policy => deny-all cho anon/authenticated; backend dùng JDBC (role postgres) nên bypass RLS
-- Idempotent: chạy lại nhiều lần vẫn an toàn. KHÔNG đụng flyway_schema_history (xem V15 crash-loop)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
