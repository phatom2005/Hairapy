-- Dam bao moi user chi co toi da 1 subscription ACTIVE tai mot thoi diem.
-- Ho tro thiet ke "cach B": khi het han, set status=EXPIRED tren row cu,
-- KHONG tao row FREE moi. FREE la trang thai ngam dinh khi khong co row ACTIVE nao.
CREATE UNIQUE INDEX uniq_active_subscription_per_user
    ON subscriptions (user_id)
    WHERE status = 'ACTIVE';
