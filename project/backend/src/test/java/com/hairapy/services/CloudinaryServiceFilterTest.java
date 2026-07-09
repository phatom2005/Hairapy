package com.hairapy.services;

import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CloudinaryServiceFilterTest {

    // Không cần Spring context — new trực tiếp, Cloudinary bean chỉ cần khác null
    // (không dùng tới trong method filterExpiredPublicIds, chỉ dùng ở deleteExpiredResources).
    private final CloudinaryService service = new CloudinaryService(new Cloudinary());

    @Test
    void filterExpiredPublicIds_OnlyReturnsResourcesOlderThan24h() {
        Instant now = Instant.now();
        Instant cutoff = now.minus(24, ChronoUnit.HOURS);

        Map<String, Object> oldResource = Map.of(
                "public_id", "hairapy/ai-results/old-image",
                "created_at", now.minus(25, ChronoUnit.HOURS).toString());
        Map<String, Object> recentResource = Map.of(
                "public_id", "hairapy/ai-results/recent-image",
                "created_at", now.minus(1, ChronoUnit.HOURS).toString());

        List<String> expired = service.filterExpiredPublicIds(List.of(oldResource, recentResource), cutoff);

        assertEquals(1, expired.size());
        assertTrue(expired.contains("hairapy/ai-results/old-image"));
    }

    @Test
    void filterExpiredPublicIds_IgnoresResourceWithMissingFields() {
        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        Map<String, Object> missingCreatedAt = Map.of("public_id", "hairapy/ai-results/broken");

        List<String> expired = service.filterExpiredPublicIds(List.of(missingCreatedAt), cutoff);

        assertTrue(expired.isEmpty());
    }
}
