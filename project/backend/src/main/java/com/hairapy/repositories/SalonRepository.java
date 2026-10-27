package com.hairapy.repositories;

import com.hairapy.models.Salon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {

    // Sap xep mac dinh: salon verified len truoc, roi theo rating giam dan
    // (loc theo district/serviceType/gia/search lam o Controller vi dataset nho, giong pattern HairstyleCatalogController)
    List<Salon> findAllByOrderByVerifiedDescRatingDesc();

    java.util.Optional<Salon> findByOwnerId(Long ownerId);

    boolean existsByOwnerId(Long ownerId);

    List<Salon> findByActiveTrue();

    long countByActiveTrueAndPartnerUntilAfter(java.time.LocalDateTime now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Salon s SET s.viewCount = s.viewCount + 1 WHERE s.id = :id")
    void incrementViewCount(@org.springframework.data.repository.query.Param("id") Long id);
}
