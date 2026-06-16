-- Kho kieu toc mau de FE goi y/thu kieu.
-- premium_only = true: chi user co subscription ACTIVE (PRO/PREMIUM) duoc xem/thu.
CREATE TABLE hairstyle_catalog (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    tag           VARCHAR(50),
    face_shape    VARCHAR(30),
    hair_length   VARCHAR(20),
    description   TEXT,
    image_url     VARCHAR(500) NOT NULL,
    premium_only  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_hairstyle_catalog_face_shape ON hairstyle_catalog (face_shape);
