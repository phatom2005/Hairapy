package com.hairapy.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.admin.ApproveSalonApplicationRequest;
import com.hairapy.dto.admin.AssignSalonOwnerRequest;
import com.hairapy.dto.admin.RecordSalonPartnerPaymentRequest;
import com.hairapy.dto.booking.CreateBookingRequest;
import com.hairapy.dto.salonowner.UpdateBookingStatusRequest;
import com.hairapy.models.*;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SalonPartnerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SalonRepository salonRepository;

    @Autowired
    private BookingRequestRepository bookingRequestRepository;

    @Autowired
    private SalonApplicationRepository salonApplicationRepository;

    @Autowired
    private SalonPartnerPaymentRepository salonPartnerPaymentRepository;

    @Autowired
    private HairstyleCatalogRepository hairstyleCatalogRepository;

    @Autowired
    private SwapHistoryRepository swapHistoryRepository;

    private User customerUser;
    private User ownerA;
    private User ownerB;
    private Salon partnerSalon;
    private Salon nonPartnerSalon;

    @BeforeEach
    void setUp() {
        bookingRequestRepository.deleteAll();
        salonPartnerPaymentRepository.deleteAll();
        salonApplicationRepository.deleteAll();
        salonRepository.deleteAll();
        swapHistoryRepository.deleteAll();
        hairstyleCatalogRepository.deleteAll();
        userRepository.deleteAll();

        customerUser = userRepository.save(User.builder()
                .email("customer@test.com")
                .fullName("Khách Hàng Test")
                .phone("0912345678")
                .role(Role.USER)
                .build());

        ownerA = userRepository.save(User.builder()
                .email("owner.a@test.com")
                .fullName("Chủ Salon A")
                .phone("0987654321")
                .role(Role.SALON_OWNER)
                .build());

        ownerB = userRepository.save(User.builder()
                .email("owner.b@test.com")
                .fullName("Chủ Salon B")
                .phone("0933333333")
                .role(Role.SALON_OWNER)
                .build());

        partnerSalon = salonRepository.save(Salon.builder()
                .name("Salon Đẹp A")
                .address("123 Nguyễn Trãi, Q1")
                .district("Quận 1")
                .imageUrl("https://example.com/salon-a.jpg")
                .priceFrom(100000)
                .rating(4.8)
                .verified(true)
                .active(true)
                .owner(ownerA)
                .partnerUntil(LocalDateTime.now().plusDays(30))
                .build());

        nonPartnerSalon = salonRepository.save(Salon.builder()
                .name("Salon Cũ B")
                .address("456 Lê Lợi, Q1")
                .district("Quận 1")
                .imageUrl("https://example.com/salon-b.jpg")
                .priceFrom(80000)
                .rating(4.0)
                .verified(false)
                .active(true)
                .owner(ownerB)
                .partnerUntil(LocalDateTime.now().minusDays(1)) // hết hạn đối tác
                .build());
    }

    @AfterEach
    void tearDown() {
        bookingRequestRepository.deleteAll();
        salonPartnerPaymentRepository.deleteAll();
        salonApplicationRepository.deleteAll();
        salonRepository.deleteAll();
        swapHistoryRepository.deleteAll();
        hairstyleCatalogRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Case 1: Tạo booking hợp lệ -> 201 và salon owner thấy trong list bookings")
    @WithMockUser(username = "customer@test.com", roles = "USER")
    void case1_createValidBooking_ownerSeesInList() throws Exception {
        CreateBookingRequest req = new CreateBookingRequest(
                partnerSalon.getId(),
                null,
                null,
                "Oval",
                LocalDateTime.now().plusDays(2),
                "Nguyễn Văn Khách",
                "0912345678",
                "Tư vấn cắt tóc ngắn",
                true
        );

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.customerName").value("Nguyễn Văn Khách"));

        // Chủ salon A xem danh sách booking
        mockMvc.perform(get("/api/salon-owner/bookings")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("owner.a@test.com").roles("SALON_OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].customerName").value("Nguyễn Văn Khách"));
    }

    @Test
    @DisplayName("Case 2: Salon không phải đối tác hoặc hết hạn -> 400")
    @WithMockUser(username = "customer@test.com", roles = "USER")
    void case2_nonPartnerSalon_returns400() throws Exception {
        CreateBookingRequest req = new CreateBookingRequest(
                nonPartnerSalon.getId(),
                null,
                null,
                "Round",
                LocalDateTime.now().plusDays(2),
                "Nguyễn Văn Khách",
                "0912345678",
                "Đặt lịch",
                true
        );

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("chưa nhận đặt lịch online")));
    }

    @Test
    @DisplayName("Case 3: Quá 3 yêu cầu PENDING -> 429")
    @WithMockUser(username = "customer@test.com", roles = "USER")
    void case3_moreThan3Pending_returns429() throws Exception {
        for (int i = 0; i < 3; i++) {
            bookingRequestRepository.save(BookingRequest.builder()
                    .user(customerUser)
                    .salon(partnerSalon)
                    .customerName("Khách " + i)
                    .customerPhone("0912345678")
                    .preferredTime(LocalDateTime.now().plusDays(1 + i))
                    .status(BookingStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        CreateBookingRequest req = new CreateBookingRequest(
                partnerSalon.getId(),
                null,
                null,
                "Oval",
                LocalDateTime.now().plusDays(5),
                "Khách Thứ Tư",
                "0912345678",
                "Thêm lịch hẹn",
                true
        );

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error", containsString("3 yêu cầu đặt lịch chờ xử lý")));
    }

    @Test
    @DisplayName("Case 4: tryOnImageUrl không thuộc swap_history của user -> lưu null, không ném lỗi")
    @WithMockUser(username = "customer@test.com", roles = "USER")
    void case4_fakeTryOnImageUrl_savedAsNull() throws Exception {
        CreateBookingRequest req = new CreateBookingRequest(
                partnerSalon.getId(),
                null,
                "https://fake-cloudinary.com/other-user-image.jpg",
                "Square",
                LocalDateTime.now().plusDays(2),
                "Khách Hàng",
                "0912345678",
                "Kiểu này",
                true
        );

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tryOnImageUrl").doesNotExist());

        BookingRequest saved = bookingRequestRepository.findAll().get(0);
        assertNull(saved.getTryOnImageUrl());
    }

    @Test
    @DisplayName("Case 5: Owner salon A không đổi được booking của salon B -> 404")
    void case5_ownerCannotAccessOtherSalonBooking() throws Exception {
        BookingRequest bookingB = bookingRequestRepository.save(BookingRequest.builder()
                .user(customerUser)
                .salon(nonPartnerSalon) // thuộc salon B
                .customerName("Khách B")
                .customerPhone("0912345678")
                .preferredTime(LocalDateTime.now().plusDays(2))
                .status(BookingStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());

        UpdateBookingStatusRequest req = new UpdateBookingStatusRequest(BookingStatus.CONFIRMED, "OK");

        mockMvc.perform(put("/api/salon-owner/bookings/" + bookingB.getId() + "/status")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("owner.a@test.com").roles("SALON_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Case 6: Chuyển trạng thái sai (PENDING -> COMPLETED) -> 400")
    void case6_invalidStatusTransition_returns400() throws Exception {
        BookingRequest bookingA = bookingRequestRepository.save(BookingRequest.builder()
                .user(customerUser)
                .salon(partnerSalon)
                .customerName("Khách A")
                .customerPhone("0912345678")
                .preferredTime(LocalDateTime.now().plusDays(2))
                .status(BookingStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());

        UpdateBookingStatusRequest req = new UpdateBookingStatusRequest(BookingStatus.COMPLETED, "Xong");

        mockMvc.perform(put("/api/salon-owner/bookings/" + bookingA.getId() + "/status")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("owner.a@test.com").roles("SALON_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("không hợp lệ")));
    }

    @Test
    @DisplayName("Case 7: Approve đơn đối tác -> user thành SALON_OWNER và salon có partnerUntil ≈ now+30d")
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void case7_approveApplication_createsSalonAndAssignsRole() throws Exception {
        User applicant = userRepository.save(User.builder()
                .email("applicant@test.com")
                .fullName("Ứng Viên Salon")
                .phone("0944444444")
                .role(Role.USER)
                .build());

        SalonApplication app = salonApplicationRepository.save(SalonApplication.builder()
                .user(applicant)
                .salonName("Hair Studio VIP")
                .address("789 CMT8, Q10")
                .district("Quận 10")
                .phone("0944444444")
                .status(ApplicationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());

        mockMvc.perform(post("/api/admin/salon-applications/" + app.getId() + "/approve")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        User updatedUser = userRepository.findById(applicant.getId()).orElseThrow();
        assertEquals(Role.SALON_OWNER, updatedUser.getRole());

        Salon createdSalon = salonRepository.findByOwnerId(applicant.getId()).orElseThrow();
        assertEquals("Hair Studio VIP", createdSalon.getName());
        assertNotNull(createdSalon.getPartnerUntil());
        assertTrue(createdSalon.getPartnerUntil().isAfter(LocalDateTime.now().plusDays(28)));
    }

    @Test
    @DisplayName("Case 8: Partner-payment 2 tháng -> cộng dồn đúng hạn partnerUntil")
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void case8_recordPartnerPayment_accumulatesPartnerUntil() throws Exception {
        LocalDateTime initialUntil = partnerSalon.getPartnerUntil();

        RecordSalonPartnerPaymentRequest req = new RecordSalonPartnerPaymentRequest(2, 598000, "Thanh toán 2 tháng test");

        mockMvc.perform(post("/api/admin/salons/" + partnerSalon.getId() + "/partner-payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.months").value(2))
                .andExpect(jsonPath("$.amount").value(598000));

        Salon updatedSalon = salonRepository.findById(partnerSalon.getId()).orElseThrow();
        // Cộng 60 ngày vào mốc partnerUntil cũ (so sánh ngày để không bị ảnh hưởng bởi nano truncation của DB)
        assertEquals(initialUntil.toLocalDate().plusDays(60), updatedSalon.getPartnerUntil().toLocalDate());
    }

    @Test
    @DisplayName("Case 9: User thường gọi /api/salon-owner/** -> 403 Forbidden")
    @WithMockUser(username = "customer@test.com", roles = "USER")
    void case9_regularUserCannotAccessSalonOwnerApi() throws Exception {
        mockMvc.perform(get("/api/salon-owner/salon"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Case 10: Ràng buộc 1 user - 1 salon: không thể gán 1 user làm chủ 2 salon khác nhau")
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void case10_oneUserOneSalonConstraintEnforced() throws Exception {
        // ownerA đã là chủ của partnerSalon
        // Admin cố tình gán ownerA làm chủ của nonPartnerSalon -> phải trả về 400
        AssignSalonOwnerRequest req = new AssignSalonOwnerRequest("owner.a@test.com");

        mockMvc.perform(put("/api/admin/salons/" + nonPartnerSalon.getId() + "/owner")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("Người dùng này đã là chủ của một salon khác")));
    }
}
