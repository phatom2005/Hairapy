package com.hairapy.dto;

import com.hairapy.models.Item;

import java.time.LocalDateTime;

public record ItemDTO(
        Long id,
        String name,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ItemDTO from(Item item) {
        return new ItemDTO(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
