package com.hairapy.controllers;

import com.hairapy.models.*;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HairstyleCatalogTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HairstyleCatalogRepository hairstyleCatalogRepository;

    @Autowired
    private SavedHairstyleRepository savedHairstyleRepository;

    @Autowired
    private UsageHistoryRepository usageHistoryRepository;

    @Autowired
    private UserRepository userRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.hairapy.services.HairSwapService hairSwapService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.hairapy.services.CloudinaryService cloudinaryService;

    private User testUser;
    private HairstyleCatalog activeStyle;
    private HairstyleCatalog inactiveStyle;

    @BeforeEach
    void setUp() {
        usageHistoryRepository.deleteAll();
        savedHairstyleRepository.deleteAll();
        hairstyleCatalogRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
                .email("catalog_fan@hairapy.id.vn")
                .fullName("Catalog Fan")
                .role(Role.USER)
                .build());

        activeStyle = hairstyleCatalogRepository.save(HairstyleCatalog.builder()
                .name("Tóc Layer Nam")
                .imageUrl("https://example.com/layer.jpg")
                .gender("Nam")
                .ailabProStyle("layer_male")
                .active(true)
                .build());

        inactiveStyle = hairstyleCatalogRepository.save(HairstyleCatalog.builder()
                .name("Tóc Đã Ngừng Hỗ Trợ")
                .imageUrl("https://example.com/discontinued.jpg")
                .gender("Nam")
                .ailabProStyle("discontinued_style")
                .active(false)
                .build());
    }

    @AfterEach
    void tearDown() {
        usageHistoryRepository.deleteAll();
        savedHairstyleRepository.deleteAll();
        hairstyleCatalogRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "catalog_fan@hairapy.id.vn")
    void getHairstyles_Public_HidesInactiveStyles() throws Exception {
        mockMvc.perform(get("/api/hairstyles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Tóc Layer Nam"));
    }

    @Test
    @WithMockUser(username = "catalog_fan@hairapy.id.vn")
    void getHairstyleById_ReturnsInactiveStyleWithActiveFalse() throws Exception {
        mockMvc.perform(get("/api/hairstyles/" + inactiveStyle.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tóc Đã Ngừng Hỗ Trợ"))
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteHairstyle_WhenSavedByUsers_Returns409Conflict() throws Exception {
        savedHairstyleRepository.save(SavedHairstyle.builder()
                .user(testUser)
                .hairstyle(activeStyle)
                .build());

        mockMvc.perform(delete("/api/admin/catalog/" + activeStyle.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.savedCount").value(1))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void patchActive_TogglesStatus() throws Exception {
        mockMvc.perform(patch("/api/admin/catalog/" + activeStyle.getId() + "/active")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        HairstyleCatalog updated = hairstyleCatalogRepository.findById(activeStyle.getId()).orElseThrow();
        assertFalse(updated.isActive());
    }

    @Test
    @WithMockUser(username = "catalog_fan@hairapy.id.vn")
    void getHairstyles_SortPopular_OrdersByUsageCount() throws Exception {
        HairstyleCatalog popularStyle = hairstyleCatalogRepository.save(HairstyleCatalog.builder()
                .name("Tóc Rất Phổ Biến")
                .imageUrl("https://example.com/popular.jpg")
                .gender("Nam")
                .ailabProStyle("popular_style")
                .active(true)
                .build());

        // Tạo 3 lượt thử cho popularStyle trong 30 ngày qua
        for (int i = 0; i < 3; i++) {
            usageHistoryRepository.save(UsageHistory.builder()
                    .user(testUser)
                    .feature("HAIR_SWAP")
                    .hairstyleId(popularStyle.getId())
                    .usedAt(LocalDateTime.now().minusDays(2))
                    .build());
        }

        mockMvc.perform(get("/api/hairstyles?sort=popular"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Tóc Rất Phổ Biến"))
                .andExpect(jsonPath("$[1].name").value("Tóc Layer Nam"));
    }

    @Test
    @WithMockUser(username = "catalog_fan@hairapy.id.vn")
    void submitHairSwap_InactiveStyle_Returns400() throws Exception {
        // Ảnh JPEG giả dạng chuẩn: ít nhất 12 bytes với FF D8 FF
        byte[] validJpeg = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("image", "selfie.jpg", "image/jpeg", validJpeg);

        mockMvc.perform(multipart("/api/swap/submit")
                        .file(file)
                        .param("hairstyleId", String.valueOf(inactiveStyle.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Kiểu tóc này đã ngừng hỗ trợ."));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createHairstyle_InvalidAilabProStyle_Returns400() throws Exception {
        mockMvc.perform(multipart("/api/admin/catalog")
                        .param("name", "Kiểu Lạ")
                        .param("imageUrl", "https://example.com/test.jpg")
                        .param("ailabProStyle", "InvalidStyleCode999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Mã kiểu AI không hợp lệ."));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createHairstyle_DuplicateCodeAndColor_Returns409_AndSameCodeDifferentColor_Ok() throws Exception {
        mockMvc.perform(multipart("/api/admin/catalog")
                        .param("name", "BuzzCut Gốc")
                        .param("imageUrl", "https://example.com/buzz.jpg")
                        .param("ailabProStyle", "BuzzCut"))
                .andExpect(status().isCreated());

        // Trùng mã và màu (màu null/gốc) -> 409
        mockMvc.perform(multipart("/api/admin/catalog")
                        .param("name", "BuzzCut Trùng")
                        .param("imageUrl", "https://example.com/buzz2.jpg")
                        .param("ailabProStyle", "BuzzCut"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").exists());

        // Cùng mã khác màu -> 201 Created
        mockMvc.perform(multipart("/api/admin/catalog")
                        .param("name", "BuzzCut Vàng")
                        .param("imageUrl", "https://example.com/buzz-blonde.jpg")
                        .param("ailabProStyle", "BuzzCut")
                        .param("ailabColor", "blonde"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createVariants_GeneratesNewItemsAndSkipsExisting() throws Exception {
        activeStyle.setAilabProStyle("UnderCut");
        activeStyle = hairstyleCatalogRepository.save(activeStyle);

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // Tạo 2 màu: brown và blonde
        mockMvc.perform(post("/api/admin/catalog/" + activeStyle.getId() + "/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(java.util.Map.of("colors", java.util.List.of("brown", "blonde")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created", hasSize(2)))
                .andExpect(jsonPath("$.created[0].name").value("Tóc Layer Nam · Nâu"))
                .andExpect(jsonPath("$.created[1].name").value("Tóc Layer Nam · Vàng"));

        // Gọi lại với brown (đã có) và red (mới)
        mockMvc.perform(post("/api/admin/catalog/" + activeStyle.getId() + "/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(java.util.Map.of("colors", java.util.List.of("brown", "red")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created", hasSize(1)))
                .andExpect(jsonPath("$.created[0].name").value("Tóc Layer Nam · Đỏ"))
                .andExpect(jsonPath("$.skipped", hasSize(1)))
                .andExpect(jsonPath("$.skipped[0]").value("brown"));
    }

    @Test
    @WithMockUser(username = "catalog_fan@hairapy.id.vn")
    void submitHairSwap_WithAilabColor_UsesCatalogColorWhenClientOmits() throws Exception {
        activeStyle.setAilabProStyle("UnderCut");
        activeStyle.setAilabColor("burgundy");
        activeStyle = hairstyleCatalogRepository.save(activeStyle);

        org.mockito.Mockito.when(hairSwapService.submitTask(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("UnderCut"),
                org.mockito.ArgumentMatchers.eq("burgundy")
        )).thenReturn("task-burgundy-999");

        byte[] validJpeg = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("image", "selfie.jpg", "image/jpeg", validJpeg);

        mockMvc.perform(multipart("/api/swap/submit")
                        .file(file)
                        .param("hairstyleId", String.valueOf(activeStyle.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value("task-burgundy-999"));

        org.mockito.Mockito.verify(hairSwapService, org.mockito.Mockito.times(1))
                .submitTask(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq("UnderCut"), org.mockito.ArgumentMatchers.eq("burgundy"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void sampleEndpoints_PutSetsSampleByAiTrue_AndUpdatingAilabStyleResetsSampleByAi() throws Exception {
        activeStyle.setAilabProStyle("UnderCut");
        activeStyle = hairstyleCatalogRepository.save(activeStyle);

        // PUT /sample áp dụng ảnh
        mockMvc.perform(put("/api/admin/catalog/" + activeStyle.getId() + "/sample")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageUrl\":\"https://res.cloudinary.com/demo/image/upload/hairapy/catalog-candidates/model1.jpg\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sampleByAi").value(true));

        HairstyleCatalog current = hairstyleCatalogRepository.findById(activeStyle.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(current.isSampleByAi());

        // Đổi ailabProStyle qua PUT catalog -> sampleByAi tự reset về false
        mockMvc.perform(multipart("/api/admin/catalog/" + activeStyle.getId())
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .param("ailabProStyle", "Pompadour"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sampleByAi").value(false));

        current = hairstyleCatalogRepository.findById(activeStyle.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(current.isSampleByAi());
    }

    @Test
    @WithMockUser(roles = "USER")
    void sampleEndpoints_CalledByUser_Returns403() throws Exception {
        byte[] validJpeg = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("image", "selfie.jpg", "image/jpeg", validJpeg);

        mockMvc.perform(multipart("/api/admin/catalog/" + activeStyle.getId() + "/sample")
                        .file(file))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "catalog_fan@hairapy.id.vn")
    void getHairstyles_FilterByColor_ReturnsMatchingStyles() throws Exception {
        HairstyleCatalog brownStyle = hairstyleCatalogRepository.save(HairstyleCatalog.builder()
                .name("Tóc Nâu Hạt Dẻ")
                .imageUrl("https://example.com/brown.jpg")
                .gender("Nam")
                .ailabProStyle("CombOver")
                .ailabColor("brown")
                .active(true)
                .build());

        // Lọc màu brown -> chỉ có brownStyle
        mockMvc.perform(get("/api/hairstyles?color=brown"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Tóc Nâu Hạt Dẻ"));

        // Lọc màu original -> chỉ có activeStyle (màu null)
        mockMvc.perform(get("/api/hairstyles?color=original"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Tóc Layer Nam"));
    }
}

