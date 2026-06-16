package com.hairapy.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// Kho kieu toc mau de FE thu/goi y. premiumOnly=true -> chi user Premium (PRO/PREMIUM) duoc xem/thu,
// Free chi thay danh sach gioi han (premiumOnly=false).
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "hairstyle_catalog", indexes = {
        @Index(name = "idx_hairstyle_catalog_face_shape", columnList = "face_shape")
})
public class HairstyleCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String name;

    // Nhan hien thi FE: "Thinh hanh", "Moi", "Vien", "Ban chay"...
    @Column(length = 50)
    private String tag;

    // "Trai xoan", "Vuong", "Tron", "Dai"...
    @Column(name = "face_shape", length = 30)
    private String faceShape;

    // "Ngan", "Vua", "Dai"
    @Column(name = "hair_length", length = 20)
    private String hairLength;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotBlank
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "premium_only", nullable = false)
    @Builder.Default
    private boolean premiumOnly = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
