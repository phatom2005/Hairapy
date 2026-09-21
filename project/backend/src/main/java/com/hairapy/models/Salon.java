package com.hairapy.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// Salon doi tac hien thi o SalonsPage. Truoc day FE dung mock data hardcode trong figmaAssets.js.
// service_types luu comma-separated giong pattern face_shape cua HairstyleCatalog.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "salons", indexes = {
        @Index(name = "idx_salons_district", columnList = "district")
})
public class Salon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 300)
    private String address;

    // "Quận 1", "Quận 3", "Bình Thạnh"...
    @NotBlank
    @Column(nullable = false, length = 50)
    private String district;

    // Comma-separated: "Cắt tóc,Nhuộm tóc,Combo trọn gói"
    @Column(name = "service_types", length = 300)
    private String serviceTypes;

    // Giá khởi điểm (VND)
    @Column(name = "price_from", nullable = false)
    private Integer priceFrom;

    @Column(nullable = false)
    @Builder.Default
    private Double rating = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private boolean verified = false;

    @NotBlank
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(length = 20)
    private String phone;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
