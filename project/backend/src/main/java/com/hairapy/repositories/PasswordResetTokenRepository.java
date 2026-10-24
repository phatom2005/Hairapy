package com.hairapy.repositories;

import com.hairapy.models.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    void deleteByUserId(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE PasswordResetToken p SET p.used = true WHERE p.user.id = :userId")
    void markAllUsedByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}
