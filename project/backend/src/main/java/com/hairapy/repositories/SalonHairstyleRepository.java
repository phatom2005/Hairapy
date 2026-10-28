package com.hairapy.repositories;

import com.hairapy.models.SalonHairstyle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalonHairstyleRepository extends JpaRepository<SalonHairstyle, Long> {

    List<SalonHairstyle> findBySalonId(Long salonId);

    List<SalonHairstyle> findByHairstyleId(Long hairstyleId);

    Optional<SalonHairstyle> findBySalonIdAndHairstyleId(Long salonId, Long hairstyleId);

    @Modifying
    @Query("DELETE FROM SalonHairstyle sh WHERE sh.salon.id = :salonId")
    void deleteBySalonId(@Param("salonId") Long salonId);
}
