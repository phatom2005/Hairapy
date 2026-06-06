-- =========================================================
-- V1: Initial schema
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL    PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan        VARCHAR(20) NOT NULL DEFAULT 'FREE',
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    start_date  TIMESTAMP,
    end_date    TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS usage_history (
    id       BIGSERIAL    PRIMARY KEY,
    user_id  BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature  VARCHAR(100) NOT NULL,
    used_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_history_user_id ON usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_used_at  ON usage_history(used_at);

CREATE TABLE IF NOT EXISTS items (
    id          BIGSERIAL    PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);
