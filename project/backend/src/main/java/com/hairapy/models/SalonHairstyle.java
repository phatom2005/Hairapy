package com.hairapy.models;

import jakarta.persistence.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "salon_hairstyles", uniqueConstraints = {
        @UniqueConstraint(name = "uniq_salon_hairstyle", columnNames = {"salon_id", "hairstyle_id"})
}, indexes = {
        @Index(name = "idx_salon_hairstyles_hairstyle", columnList = "hairstyle_id")
})
public class SalonHairstyle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hairstyle_id", nullable = false)
    private HairstyleCatalog hairstyle;

    private Integer price;
}
