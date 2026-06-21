package com.hairapy.services;

import com.hairapy.dto.auth.AuthResponse;
import com.hairapy.dto.auth.LoginRequest;
import com.hairapy.dto.auth.RegisterRequest;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import com.hairapy.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Service xử lý các nghiệp vụ liên quan đến xác thực người dùng (Đăng ký, Đăng nhập).
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final SubscriptionService subscriptionService;

    /**
     * Đăng ký tài khoản người dùng mới.
     *
     * @param request thông tin đăng ký tài khoản mới.
     * @return AuthResponse chứa token JWT và thông tin người dùng vừa đăng ký.
     */
    public AuthResponse register(RegisterRequest request) {
        // Kiểm tra xem mật khẩu xác nhận có khớp với mật khẩu chính không
        if (!request.password().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }

        // Kiểm tra xem email đã được đăng ký trước đó chưa
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }

        // Tạo đối tượng User mới với mật khẩu được băm và phân quyền mặc định là USER
        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .fullName(request.fullName())
                .build();

        // Lưu thông tin người dùng vào cơ sở dữ liệu
        userRepository.save(user);

        // Tạo JWT token từ thông tin người dùng
        String token = jwtService.generateToken(user);

        // Trả về kết quả đăng ký thành công (user mới luôn là FREE vì chưa có subscription)
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getFullName());
    }

    /**
     * Đăng nhập người dùng vào hệ thống.
     *
     * @param request thông tin đăng nhập bao gồm email và mật khẩu.
     * @return AuthResponse chứa token JWT và thông tin người dùng sau khi đăng nhập thành công.
     */
    public AuthResponse login(LoginRequest request) {
        // Thực hiện xác thực thông tin đăng nhập thông qua AuthenticationManager của Spring Security
        // Nếu thông tin đăng nhập sai, AuthenticationManager sẽ tự động ném ra BadCredentialsException
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        // Lấy thông tin người dùng từ cơ sở dữ liệu sau khi xác thực thành công
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));

        // Tạo JWT token từ thông tin người dùng
        String token = jwtService.generateToken(user);

        // Xác định role hiển thị: ADMIN giữ nguyên, USER thường kiểm tra thêm subscription
        String effectiveRole = resolveEffectiveRole(user);

        // Trả về kết quả đăng nhập thành công
        return new AuthResponse(token, user.getEmail(), effectiveRole, user.getFullName());
    }

    /**
     * Xác định role hiển thị cho Frontend:
     * - ADMIN → "ADMIN"
     * - USER với subscription trả phí đang ACTIVE → "PREMIUM"
     * - USER thường → "USER"
     */
    public String resolveEffectiveRole(User user) {
        if (user.getRole() == Role.ADMIN) {
            return "ADMIN";
        }
        if (subscriptionService.isPaidUser(user.getId())) {
            return "PREMIUM";
        }
        return "USER";
    }
}
