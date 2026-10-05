package com.hairapy.services;

import com.hairapy.dto.auth.AuthResponse;
import com.hairapy.dto.auth.LoginRequest;
import com.hairapy.dto.auth.RegisterRequest;
import com.hairapy.dto.auth.RegisterResponse;
import com.hairapy.exceptions.EmailNotVerifiedException;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import com.hairapy.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final GoogleAuthService googleAuthService;
    private final FacebookAuthService facebookAuthService;
    private final EmailVerificationService emailVerificationService;

    /**
     * Đăng ký tài khoản người dùng mới.
     *
     * @param request thông tin đăng ký tài khoản mới.
     * @return RegisterResponse — KHÔNG có JWT, user phải xác minh email qua link được gửi rồi mới đăng nhập.
     */
    public RegisterResponse register(RegisterRequest request) {
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
                .emailVerified(false)
                .build();

        // Lưu thông tin người dùng vào cơ sở dữ liệu
        userRepository.save(user);

        // Gửi email xác minh (không throw nếu Resend lỗi — user có thể bấm gửi lại)
        emailVerificationService.sendVerification(user);

        return new RegisterResponse(user.getEmail(),
                "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập.");
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

        // Chỉ kiểm tra SAU khi mật khẩu đúng để không lộ trạng thái xác minh cho người không phải chủ tài khoản
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Email chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác minh.");
        }

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
        if (user.getRole() == Role.TESTER) {
            return "TESTER";
        }
        if (subscriptionService.isPaidUser(user.getId())) {
            return "PREMIUM";
        }
        return "USER";
    }

    /**
     * Cập nhật hồ sơ cá nhân (fullName, phone, dateOfBirth) cho user hiện tại.
     */
    @Transactional
    public com.hairapy.dto.auth.UserMeResponse updateProfile(User user, com.hairapy.dto.auth.UpdateProfileRequest request) {
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setDateOfBirth(request.dateOfBirth());
        userRepository.save(user);

        String effectiveRole = resolveEffectiveRole(user);
        return new com.hairapy.dto.auth.UserMeResponse(
                user.getEmail(), effectiveRole, user.getFullName(), user.getPhone(), user.getDateOfBirth());
    }

    /**
     * Đăng nhập/đăng ký qua Google. Nếu email đã tồn tại (kể cả tài khoản LOCAL trước đó),
     * đăng nhập luôn vào tài khoản đó — an toàn vì Google đã xác thực chủ sở hữu email.
     */
    @Transactional
    public AuthResponse loginWithGoogle(String accessToken) {
        GoogleAuthService.GoogleProfile profile = googleAuthService.verifyAndFetchProfile(accessToken);

        User user = userRepository.findByEmail(profile.email()).orElseGet(() -> {
            User newUser = User.builder()
                    .email(profile.email())
                    .passwordHash(null)
                    .fullName(profile.name())
                    .role(Role.USER)
                    .provider(com.hairapy.models.AuthProvider.GOOGLE)
                    .providerId(profile.sub())
                    .emailVerified(true)
                    .build();
            return userRepository.save(newUser);
        });

        // Google đã xác thực chủ sở hữu email → coi như đã xác minh (kể cả tài khoản LOCAL chưa xác minh trước đó)
        boolean dirty = false;
        if (user.getProviderId() == null) {
            user.setProviderId(profile.sub());
            dirty = true;
        }
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            dirty = true;
        }
        if (dirty) {
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);
        String effectiveRole = resolveEffectiveRole(user);

        return new AuthResponse(token, user.getEmail(), effectiveRole, user.getFullName());
    }

    /**
     * Đăng nhập/đăng ký qua Facebook. Nếu email đã tồn tại (kể cả tài khoản LOCAL trước đó),
     * đăng nhập luôn vào tài khoản đó.
     */
    @Transactional
    public AuthResponse loginWithFacebook(String accessToken) {
        FacebookAuthService.FacebookProfile profile = facebookAuthService.verifyAndFetchProfile(accessToken);

        User user = userRepository.findByProviderAndProviderId(com.hairapy.models.AuthProvider.FACEBOOK, profile.id())
                .orElseGet(() -> userRepository.findByEmail(profile.email()).orElseGet(() -> {
                    User newUser = User.builder()
                            .email(profile.email())
                            .passwordHash(null)
                            .fullName(profile.name())
                            .role(Role.USER)
                            .provider(com.hairapy.models.AuthProvider.FACEBOOK)
                            .providerId(profile.id())
                            .emailVerified(true)
                            .build();
                    return userRepository.save(newUser);
                }));

        // Facebook đã xác thực email → coi như đã xác minh
        boolean dirty = false;
        if (user.getProviderId() == null) {
            user.setProviderId(profile.id());
            dirty = true;
        }
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            dirty = true;
        }
        if (dirty) {
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);
        String effectiveRole = resolveEffectiveRole(user);

        return new AuthResponse(token, user.getEmail(), effectiveRole, user.getFullName());
    }
}
