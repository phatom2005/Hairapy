package com.hairapy.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Báo cáo của người dùng về nội dung do AI tạo ra (vd: ảnh thử tóc không phù hợp).
 * Chỉ lưu URL ảnh kết quả để admin xem lại, không lưu ảnh gốc của người dùng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ai_content_reports", indexes = {
        @Index(name = "idx_ai_reports_status_created", columnList = "status, created_at"),
        @Index(name = "idx_ai_reports_user_created", columnList = "user_id, created_at")
})
public class AiContentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FeedbackFeature feature = FeedbackFeature.HAIR_SWAP;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiReportReason reason;

    @Column(length = 500)
    private String comment;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "hairstyle_id")
    private Long hairstyleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AiReportStatus status = AiReportStatus.NEW;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
