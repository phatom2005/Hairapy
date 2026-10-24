package com.hairapy.utils;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VnTimeTest {

    private TimeZone original;

    @BeforeEach
    void setUp() {
        original = TimeZone.getDefault();
    }

    @AfterEach
    void tearDown() {
        TimeZone.setDefault(original);
    }

    @Test
    void startOfDayVn_khiServerChayUtc_lui7Tieng() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        assertEquals(LocalDateTime.of(2026, 10, 20, 17, 0), VnTime.startOfDayVn(LocalDate.of(2026, 10, 21)));
    }

    @Test
    void startOfDayVn_khiServerChayGioVn_giuNguyen0h() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        assertEquals(LocalDateTime.of(2026, 10, 21, 0, 0), VnTime.startOfDayVn(LocalDate.of(2026, 10, 21)));
    }
}
