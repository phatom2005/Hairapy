package com.hairapy.repositories;

import com.hairapy.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hairapy.models.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // Tìm kiếm user theo email hoặc tên (cho admin search)
    @Query("SELECT u FROM User u WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<User> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    // Đếm theo role (cho dashboard)
    long countByRole(Role role);

    // Thống kê user đăng ký theo ngày
    @Query("SELECT CAST(u.createdAt AS date) as day, COUNT(u) as count FROM User u WHERE u.createdAt >= :since GROUP BY CAST(u.createdAt AS date) ORDER BY day")
    List<Object[]> countDailyRegistrationsSince(@Param("since") LocalDateTime since);

    // Thống kê user đăng ký theo tháng
    @Query("SELECT FUNCTION('to_char', u.createdAt, 'YYYY-MM') as month, COUNT(u) as count FROM User u WHERE u.createdAt >= :since GROUP BY FUNCTION('to_char', u.createdAt, 'YYYY-MM') ORDER BY month")
    List<Object[]> countMonthlyRegistrationsSince(@Param("since") LocalDateTime since);
}
