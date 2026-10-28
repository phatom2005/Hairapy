package com.hairapy.repositories;

import com.hairapy.models.BookingRequest;
import com.hairapy.models.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRequestRepository extends JpaRepository<BookingRequest, Long> {

    Page<BookingRequest> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<BookingRequest> findBySalonIdOrderByCreatedAtDesc(Long salonId, Pageable pageable);

    Page<BookingRequest> findBySalonIdAndStatusOrderByCreatedAtDesc(Long salonId, BookingStatus status, Pageable pageable);

    Page<BookingRequest> findByStatusOrderByCreatedAtDesc(BookingStatus status, Pageable pageable);

    Page<BookingRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByUserIdAndStatus(Long userId, BookingStatus status);

    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime after);

    List<BookingRequest> findByStatusAndPreferredTimeBefore(BookingStatus status, LocalDateTime time);

    long countBySalonIdAndStatus(Long salonId, BookingStatus status);

    long countBySalonId(Long salonId);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByStatusAndCreatedAtBetween(BookingStatus status, LocalDateTime start, LocalDateTime end);

    @Query("SELECT b.hairstyleName, COUNT(b) FROM BookingRequest b WHERE b.salon.id = :salonId AND b.hairstyleName IS NOT NULL GROUP BY b.hairstyleName ORDER BY COUNT(b) DESC")
    List<Object[]> findTopRequestedHairstylesBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM BookingRequest b WHERE b.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
