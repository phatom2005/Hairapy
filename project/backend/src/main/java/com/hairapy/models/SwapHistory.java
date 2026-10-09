package com.hairapy.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Một ảnh kết quả thử tóc (AI hair swap) của người dùng. Ảnh lưu trên Cloudinary (folder swap-history),
 * giữ tối đa 30 ngày và 20 ảnh/user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "swap_history", indexes = {
        @Index(name = "idx_swap_history_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_swap_history_created_at", columnList = "created_at")
})
public class SwapHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "hairstyle_id")
    private Long hairstyleId;

    @Column(name = "hairstyle_name", length = 150)
    private String hairstyleName;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
