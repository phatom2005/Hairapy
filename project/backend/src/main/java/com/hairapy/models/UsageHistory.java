package com.hairapy.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "usage_history", indexes = {
        @Index(name = "idx_usage_history_user_id", columnList = "user_id"),
        @Index(name = "idx_usage_history_used_at", columnList = "used_at")
})
public class UsageHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String feature;

    @Column(nullable = false)
    private LocalDateTime usedAt;
}
