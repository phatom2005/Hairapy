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
}
