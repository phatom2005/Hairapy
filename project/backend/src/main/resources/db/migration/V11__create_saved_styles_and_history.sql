-- =========================================================
-- V11: Create saved_hairstyles and scan_history tables
-- =========================================================

CREATE TABLE IF NOT EXISTS saved_hairstyles (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hairstyle_id BIGINT    NOT NULL REFERENCES hairstyle_catalog(id) ON DELETE CASCADE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_hairstyle UNIQUE (user_id, hairstyle_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_hairstyles_user_id ON saved_hairstyles(user_id);

CREATE TABLE IF NOT EXISTS scan_history (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    face_shape  VARCHAR(50)  NOT NULL,
    image_url   VARCHAR(500) NOT NULL,
    hair_type   VARCHAR(50),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at);
