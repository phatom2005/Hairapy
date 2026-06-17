package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminUserResponse;
import com.hairapy.dto.admin.UpdateUserRoleRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản trị thực hiện các nghiệp vụ quản lý người dùng (xem danh sách, đổi vai trò).
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    /**
     * Lấy danh sách người dùng có phân trang và hỗ trợ tìm kiếm.
     */
    @GetMapping
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @RequestParam(value = "search", required = false) String search,
            Pageable pageable
    ) {
        Page<User> usersPage;
        if (search != null && !search.trim().isEmpty()) {
            usersPage = userRepository.searchByKeyword(search.trim(), pageable);
        } else {
            usersPage = userRepository.findAll(pageable);
        }

        Page<AdminUserResponse> responsePage = usersPage.map(this::mapToAdminUserResponse);
        return ResponseEntity.ok(responsePage);
    }

    /**
     * Lấy chi tiết thông tin của 1 người dùng.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        return ResponseEntity.ok(mapToAdminUserResponse(user));
    }

    /**
     * Cập nhật vai trò người dùng (USER <-> ADMIN).
     * Kiểm tra không cho phép Admin tự hạ quyền của bản thân.
     */
    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        // Kiểm tra xem vai trò truyền vào có hợp lệ hay không
        Role newRole;
        try {
            newRole = Role.valueOf(request.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Vai trò không hợp lệ. Chỉ chấp nhận USER hoặc ADMIN.");
        }

        // Kiểm tra không cho phép tự hạ quyền của chính mình
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (user.getEmail().equalsIgnoreCase(currentEmail) && newRole != Role.ADMIN) {
            return ResponseEntity.badRequest().body("Bạn không thể tự hạ vai trò quản trị viên của chính mình.");
        }

        user.setRole(newRole);
        User updatedUser = userRepository.save(user);

        return ResponseEntity.ok(mapToAdminUserResponse(updatedUser));
    }

    private AdminUserResponse mapToAdminUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
