package com.hairapy.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ lịch sử quét phân tích khuôn mặt của người dùng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "scan_history")
public class ScanHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(name = "face_shape", nullable = false, length = 50)
    private String faceShape;

    @NotBlank
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "hair_type", length = 50)
    private String hairType;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
