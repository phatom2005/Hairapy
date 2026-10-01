package com.hairapy.controllers;

import com.hairapy.dto.auth.DeleteAccountRequest;
import com.hairapy.models.AuthProvider;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import com.hairapy.security.TokenBlacklistService;
import com.hairapy.services.AccountDeletionService;
import com.hairapy.services.AuthService;
import com.hairapy.services.CloudinaryService;
import com.hairapy.services.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerDeleteAccountTest {

    @Mock
    private AuthService authService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private PasswordResetService passwordResetService;
    @Mock
    private AccountDeletionService accountDeletionService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private CloudinaryService cloudinaryService;

    @Mock
    private UserDetails userDetails;

    private AuthController authController;

    @BeforeEach
    void setUp() {
        authController = new AuthController(
                authService,
                userRepository,
                tokenBlacklistService,
                passwordResetService,
                accountDeletionService,
                passwordEncoder,
                cloudinaryService
        );
    }

    @Test
    void deleteMyAccount_LocalUserCorrectPassword_Returns200AndBlacklistsToken() {
        when(userDetails.getUsername()).thenReturn("user@hairapy.id.vn");
        User user = User.builder()
                .id(10L)
                .email("user@hairapy.id.vn")
                .passwordHash("encoded_secret")
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .build();

        when(userRepository.findByEmail("user@hairapy.id.vn")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded_secret")).thenReturn(true);
        when(accountDeletionService.deleteAccount(user)).thenReturn(List.of("hairapy/scans/img1"));

        DeleteAccountRequest request = new DeleteAccountRequest("secret123");
        ResponseEntity<?> response = authController.deleteMyAccount(userDetails, "Bearer sample-jwt-token", request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Đã xoá tài khoản.", body.get("message"));

        verify(tokenBlacklistService).blacklist("sample-jwt-token");
        verify(cloudinaryService).delete("hairapy/scans/img1");
    }

    @Test
    void deleteMyAccount_LocalUserWrongPassword_Returns400() {
        when(userDetails.getUsername()).thenReturn("user@hairapy.id.vn");
        User user = User.builder()
                .id(10L)
                .email("user@hairapy.id.vn")
                .passwordHash("encoded_secret")
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .build();

        when(userRepository.findByEmail("user@hairapy.id.vn")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_pass", "encoded_secret")).thenReturn(false);

        DeleteAccountRequest request = new DeleteAccountRequest("wrong_pass");
        ResponseEntity<?> response = authController.deleteMyAccount(userDetails, "Bearer sample-jwt-token", request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Mật khẩu không đúng.", body.get("error"));

        verifyNoInteractions(accountDeletionService);
    }

    @Test
    void deleteMyAccount_AdminUser_Returns403() {
        when(userDetails.getUsername()).thenReturn("admin@hairapy.id.vn");
        User admin = User.builder()
                .id(1L)
                .email("admin@hairapy.id.vn")
                .role(Role.ADMIN)
                .provider(AuthProvider.LOCAL)
                .build();

        when(userRepository.findByEmail("admin@hairapy.id.vn")).thenReturn(Optional.of(admin));

        DeleteAccountRequest request = new DeleteAccountRequest("any_pass");
        ResponseEntity<?> response = authController.deleteMyAccount(userDetails, "Bearer token", request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Không thể xoá tài khoản quản trị.", body.get("error"));

        verifyNoInteractions(accountDeletionService);
    }

    @Test
    void deleteMyAccount_GoogleUser_SkipsPasswordCheckAndReturns200() {
        when(userDetails.getUsername()).thenReturn("google@hairapy.id.vn");
        User googleUser = User.builder()
                .id(20L)
                .email("google@hairapy.id.vn")
                .role(Role.USER)
                .provider(AuthProvider.GOOGLE)
                .build();

        when(userRepository.findByEmail("google@hairapy.id.vn")).thenReturn(Optional.of(googleUser));
        when(accountDeletionService.deleteAccount(googleUser)).thenReturn(List.of());

        ResponseEntity<?> response = authController.deleteMyAccount(userDetails, null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Đã xoá tài khoản.", body.get("message"));

        verify(accountDeletionService).deleteAccount(googleUser);
        verifyNoInteractions(passwordEncoder);
    }
}
