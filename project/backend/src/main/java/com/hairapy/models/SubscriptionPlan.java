package com.hairapy.models;

// PRO = goi Tuan, PREMIUM = goi Thang - cung mot tier quyen loi (Premium trong CLAUDE.md),
// chi khac gia/thoi han thanh toan. Khong tao them tier quyen loi rieng cho PRO.
// Moi noi check quyen loi nen goi isPaid() thay vi so sanh truc tiep == PRO/PREMIUM.
public enum SubscriptionPlan {
    FREE,
    PRO,
    PREMIUM;

    public boolean isPaid() {
        return this != FREE;
    }
}
