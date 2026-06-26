package com.hairapy.config;

/**
 * Cấu hình PayOS — không cần bean riêng.
 * API keys được inject trực tiếp trong PaymentService qua @Value.
 * RestTemplate được tạo inline trong PaymentService constructor.
 */
