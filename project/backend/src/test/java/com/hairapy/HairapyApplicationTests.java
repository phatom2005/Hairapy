package com.hairapy;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class HairapyApplicationTests {

    @org.springframework.beans.factory.annotation.Autowired
    private com.hairapy.repositories.UserRepository userRepository;

    @Test
    void diagnoseDatabase() {
        System.out.println("DIAGNOSE START");
        try {
            long count = userRepository.count();
            System.out.println("TOTAL USERS IN DB: " + count);
            
            java.util.Optional<com.hairapy.models.User> adminOpt = userRepository.findByEmail("admin@hairapy.ai");
            if (adminOpt.isPresent()) {
                com.hairapy.models.User admin = adminOpt.get();
                System.out.println("ADMIN FOUND: email=" + admin.getEmail() + ", role=" + admin.getRole() + ", name=" + admin.getFullName());
            } else {
                System.out.println("ADMIN NOT FOUND in DB!");
                System.out.println("ALL USERS LIST:");
                userRepository.findAll().forEach(u -> 
                    System.out.println("- id=" + u.getId() + ", email=" + u.getEmail() + ", role=" + u.getRole() + ", name=" + u.getFullName())
                );
            }
        } catch (Exception e) {
            System.out.println("DIAGNOSE ERROR: " + e.getMessage());
            e.printStackTrace();
        }
        System.out.println("DIAGNOSE END");
    }
}
