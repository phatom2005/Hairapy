package com.hairapy.dto.auth;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO chứa thông tin phản hồi của người dùng hiện tại đang đăng nhập.
 * Mobile đang dùng chung — CHỈ ĐƯỢC THÊM field ở cuối, không đổi/xoá field cũ.
 */
public record UserMeResponse(
    String email,
    String role,
    String fullName,
    String phone,
    LocalDate dateOfBirth,
    String plan,               // FREE | PRO | PREMIUM — gói đang thực sự hưởng
    LocalDateTime planEndDate, // null nếu FREE (hoặc Admin/Tester)
    String provider,           // LOCAL | GOOGLE | FACEBOOK
    boolean hasPassword,       // passwordHash != null
    Long salonId,              // null nếu không phải chủ salon
    Long id                    // id số nội bộ của user (dùng cho GA user_id, v.v.)
) {}
