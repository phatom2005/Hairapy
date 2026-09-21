package com.hairapy.controllers;

import com.hairapy.dto.UsageSummaryResponse;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller cung cấp thông tin quota (lượt dùng còn lại) cho user hiện tại,
 * để FE hiển thị trước khi user bấm quét/thử kiểu tóc.
 */
@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
public class UsageController {

    private final UsageService usageService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getMyUsage(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));
        UsageSummaryResponse summary = usageService.getUsageSummary(user);
        return ResponseEntity.ok(summary);
    }
}
