package com.hairapy.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin giao dịch thanh toán qua PayOS.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "order_code", nullable = false, unique = true)
    private Long orderCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionPlan plan;

    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "payos_transaction_id", length = 100)
    private String payosTransactionId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "subscription_granted", nullable = false)
    @Builder.Default
    private boolean subscriptionGranted = false;

    @Column(name = "ga_client_id", length = 100)
    private String gaClientId;

    // ===== Thông tin chuyển khoản rút gọn từ webhook PayOS (V35) — dùng để admin đối soát =====
    /** Tên ngân hàng người chuyển (hoặc mã BIN nếu PayOS không gửi tên). */
    @Column(name = "counter_bank_name", length = 100)
    private String counterBankName;

    /** Tên chủ tài khoản người chuyển. */
    @Column(name = "counter_account_name", length = 150)
    private String counterAccountName;

    /** CHỈ 4 số cuối tài khoản người chuyển (không lưu số đầy đủ). */
    @Column(name = "counter_account_last4", length = 4)
    private String counterAccountLast4;

    /** Nội dung chuyển khoản. */
    @Column(name = "transfer_description", length = 255)
    private String transferDescription;

    /** Thời điểm giao dịch phía ngân hàng (PayOS transactionDateTime). */
    @Column(name = "bank_transaction_at")
    private LocalDateTime bankTransactionAt;
}
