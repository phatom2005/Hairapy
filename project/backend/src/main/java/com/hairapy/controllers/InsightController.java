package com.hairapy.controllers;

import com.hairapy.dto.insight.FaceShapeStyleResponse;
import com.hairapy.dto.insight.TrendingStyleResponse;
import com.hairapy.services.TrendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cung cấp dữ liệu xu hướng kiểu tóc cho người dùng và đối tác.
 * Không yêu cầu đăng nhập (permitAll).
 */
@RestController
@RequestMapping("/api/insights")
@RequiredArgsConstructor
public class InsightController {

    private final TrendService trendService;

    /**
     * Lấy danh sách kiểu tóc đang hot trong 7 ngày qua.
     */
    @GetMapping("/trending")
    public ResponseEntity<List<TrendingStyleResponse>> getTrending(
            @RequestParam(required = false) String gender,
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(trendService.getTrending(gender, limit));
    }

    /**
     * Lấy danh sách kiểu tóc được thử nhiều nhất bởi người có cùng dáng mặt trong 30 ngày qua.
     */
    @GetMapping("/face-shape/{shape}")
    public ResponseEntity<List<FaceShapeStyleResponse>> getFaceShapeStyles(
            @PathVariable String shape) {
        return ResponseEntity.ok(trendService.getFaceShapeStyles(shape));
    }
}

