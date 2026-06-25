package com.hairapy.repositories;

import com.hairapy.models.HairstyleCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HairstyleCatalogRepository extends JpaRepository<HairstyleCatalog, Long> {

    // Free user: chi xem kho gioi han (premiumOnly = false)
    List<HairstyleCatalog> findByPremiumOnlyFalse();

    // Loc theo dang khuon mat — hỗ trợ comma-separated (vd: face_shape = "Oval,Round")
    // Dùng LIKE để tìm kiểu tóc có chứa dáng mặt cụ thể
    @Query("SELECT h FROM HairstyleCatalog h WHERE h.faceShape LIKE %:faceShape%")
    List<HairstyleCatalog> findByFaceShapeContaining(@Param("faceShape") String faceShape);

    // Giữ lại cho backward compat (exact match)
    List<HairstyleCatalog> findByFaceShape(String faceShape);

    List<HairstyleCatalog> findByFaceShapeAndPremiumOnlyFalse(String faceShape);
}
