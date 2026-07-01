-- Bật RLS trên tất cả bảng public để chặn PostgREST (Supabase auto-expose API)
-- Backend connect qua JDBC/Session Pooler nên KHÔNG bị ảnh hưởng bởi RLS này
-- (JDBC dùng role riêng, không phải anon/authenticated role mà PostgREST dùng)
-- Không tạo policy nào => deny-all mặc định cho PostgREST, đúng ý vì ta không dùng Supabase Auth/RLS

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hairstyle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_hairstyles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

