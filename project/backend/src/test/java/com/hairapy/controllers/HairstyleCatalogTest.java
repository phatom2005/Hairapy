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
}
