package com.hairapy.repositories;

import com.hairapy.models.HairstyleCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HairstyleCatalogRepository extends JpaRepository<HairstyleCatalog, Long> {

    // Free user: chi xem kho gioi han (premiumOnly = false)
    List<HairstyleCatalog> findByPremiumOnlyFalse();

    // Loc theo dang khuon mat (FE CatalogPage co filter nay)
    List<HairstyleCatalog> findByFaceShape(String faceShape);

    List<HairstyleCatalog> findByFaceShapeAndPremiumOnlyFalse(String faceShape);
}
