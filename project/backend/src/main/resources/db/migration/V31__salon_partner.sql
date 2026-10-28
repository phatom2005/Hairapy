-- Mở rộng salon thành đối tác: chủ salon, hạn gói đối tác, mô tả, ẩn/hiện, lượt xem
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS partner_until TIMESTAMP;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS description VARCHAR(1000);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_salons_owner ON salons(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Salon nhận làm những kiểu tóc nào (giá riêng tuỳ chọn)
CREATE TABLE IF NOT EXISTS salon_hairstyles (
    id           BIGSERIAL PRIMARY KEY,
    salon_id     BIGINT  NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    hairstyle_id BIGINT  NOT NULL REFERENCES hairstyle_catalog(id) ON DELETE CASCADE,
    price        INTEGER,
    CONSTRAINT uniq_salon_hairstyle UNIQUE (salon_id, hairstyle_id)
);
CREATE INDEX IF NOT EXISTS idx_salon_hairstyles_hairstyle ON salon_hairstyles(hairstyle_id);

-- Yêu cầu đặt lịch từ khách
CREATE TABLE IF NOT EXISTS booking_requests (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salon_id          BIGINT       NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    hairstyle_id      BIGINT       REFERENCES hairstyle_catalog(id) ON DELETE SET NULL,
    hairstyle_name    VARCHAR(150),
    try_on_image_url  VARCHAR(500),
    face_shape        VARCHAR(30),
    preferred_time    TIMESTAMP    NOT NULL,
    customer_name     VARCHAR(100) NOT NULL,
    customer_phone    VARCHAR(20)  NOT NULL,
    note              VARCHAR(500),
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    salon_note        VARCHAR(300),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_salon_status ON booking_requests(salon_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_user ON booking_requests(user_id);

-- Đơn đăng ký làm đối tác
CREATE TABLE IF NOT EXISTS salon_applications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salon_name  VARCHAR(150) NOT NULL,
    address     VARCHAR(300) NOT NULL,
    district    VARCHAR(50)  NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    message     VARCHAR(500),
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    admin_note  VARCHAR(300),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Thanh toán Gói Đối tác (MÔ PHỎNG — admin ghi nhận tay)
CREATE TABLE IF NOT EXISTS salon_partner_payments (
    id          BIGSERIAL PRIMARY KEY,
    salon_id    BIGINT       NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    months      INTEGER      NOT NULL CHECK (months BETWEEN 1 AND 12),
    amount      INTEGER      NOT NULL CHECK (amount >= 0),
    note        VARCHAR(300),
    created_by  VARCHAR(255),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.salon_hairstyles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_partner_payments ENABLE ROW LEVEL SECURITY;

-- Demo update: 4 salon seed đã verified có sẵn trạng thái đối tác 30 ngày
UPDATE salons SET partner_until = NOW() + INTERVAL '30 days' WHERE verified = TRUE;
