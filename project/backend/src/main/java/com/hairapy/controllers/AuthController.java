package com.hairapy.controllers;

import com.hairapy.dto.auth.AuthResponse;
import com.hairapy.dto.auth.LoginRequest;
import com.hairapy.dto.auth.RegisterRequest;
import com.hairapy.dto.auth.UserMeResponse;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import com.hairapy.services.AuthService;
import com.hairapy.security.TokenBlacklistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Controller chịu trách nhiệm định tuyến các yêu cầu xác thực API hệ thống.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final com.hairapy.services.PasswordResetService passwordResetService;

    /**
     * Endpoint đăng ký tài khoản mới.
     *
     * @param request dữ liệu đăng ký người dùng được validate.
     * @return ResponseEntity chứa thông tin AuthResponse kèm theo HTTP Status 201 Created.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Endpoint đăng nhập tài khoản.
     *
     * @param request dữ liệu đăng nhập người dùng được validate.
     * @return ResponseEntity chứa thông tin AuthResponse kèm theo HTTP Status 200 OK.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint lấy thông tin chi tiết của người dùng đang đăng nhập hiện tại từ JWT token.
     *
     * @param userDetails thông tin Principal đã xác thực lấy từ Context của Spring Security.
     * @return ResponseEntity chứa UserMeResponse kèm theo HTTP Status 200 OK.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        // Lấy thông tin user dựa trên email (UserDetails.getUsername())
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));

        // Trả về role hiệu lực (bạo gồm cả PREMIUM nếu có subscription đang hoạt động)
        String effectiveRole = authService.resolveEffectiveRole(user);
        return ResponseEntity.ok(new UserMeResponse(
                user.getEmail(), effectiveRole, user.getFullName(), user.getPhone(), user.getDateOfBirth()));
    }

    /**
     * Endpoint cập nhật hồ sơ cá nhân (Settings page) của người dùng hiện tại.
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @jakarta.validation.Valid @RequestBody com.hairapy.dto.auth.UpdateProfileRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));
        UserMeResponse updated = authService.updateProfile(user, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Endpoint đăng xuất — thu hồi token hiện tại bằng cách đưa vào blacklist Redis
     * (TTL = thời gian còn lại của token). Sau khi gọi, token này không dùng được nữa
     * dù chưa hết hạn tự nhiên.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenBlacklistService.blacklist(token);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody com.hairapy.dto.auth.ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody com.hairapy.dto.auth.ResetPasswordRequest request) {
        passwordResetService.confirmReset(request.token(), request.newPassword(), request.confirmPassword());
        return ResponseEntity.ok(java.util.Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(@Valid @RequestBody com.hairapy.dto.auth.GoogleLoginRequest request) {
        AuthResponse response = authService.loginWithGoogle(request.accessToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/facebook")
    public ResponseEntity<AuthResponse> loginWithFacebook(@Valid @RequestBody com.hairapy.dto.auth.FacebookLoginRequest request) {
        AuthResponse response = authService.loginWithFacebook(request.accessToken());
        return ResponseEntity.ok(response);
    }
}
