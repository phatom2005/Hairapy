package com.hairapy.repositories;

import com.hairapy.models.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    // Token mới nhất của user — dùng để áp cooldown khi gửi lại
    Optional<EmailVerificationToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByUserId(Long userId);
}
