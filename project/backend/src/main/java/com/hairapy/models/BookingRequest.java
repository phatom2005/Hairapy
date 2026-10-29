package com.hairapy.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "booking_requests", indexes = {
        @Index(name = "idx_booking_salon_status", columnList = "salon_id, status"),
        @Index(name = "idx_booking_user", columnList = "user_id")
})
public class BookingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(name = "hairstyle_id")
    private Long hairstyleId;

    @Column(name = "hairstyle_name", length = 150)
    private String hairstyleName;

    @Column(name = "try_on_image_url", length = 500)
    private String tryOnImageUrl;

    @Column(name = "face_shape", length = 30)
    private String faceShape;

    @NotNull
    @Column(name = "preferred_time", nullable = false)
    private LocalDateTime preferredTime;

    @NotBlank
    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @NotBlank
    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    @Column(length = 500)
    private String note;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "salon_note", length = 300)
    private String salonNote;

    @Column(name = "ga_client_id", length = 100)
    private String gaClientId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
