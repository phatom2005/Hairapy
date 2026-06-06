package com.hairapy;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.jwt.secret=dGVzdC1zZWNyZXQta2V5LWZvci1oYWlyYXB5LXRlc3RpbmctdXNlLW9ubHk=",
    "app.cors.allowed-origins=http://localhost:5173",
    "sentry.dsn="
})
class HairapyApplicationTests {

    @Test
    void contextLoads() {
    }
}
