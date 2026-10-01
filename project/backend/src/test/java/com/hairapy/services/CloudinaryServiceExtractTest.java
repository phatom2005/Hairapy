package com.hairapy.services;
 
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CloudinaryServiceExtractTest {

    private final CloudinaryService service = new CloudinaryService(new Cloudinary());

    @Test
    void extractPublicId_StandardUrlWithVersion_ReturnsPublicId() {
        String url = "https://res.cloudinary.com/demo/image/upload/v1234567/hairapy/scans/sample.jpg";
        assertEquals("hairapy/scans/sample", service.extractPublicId(url));
    }

    @Test
    void extractPublicId_UrlWithoutVersion_ReturnsPublicId() {
        String url = "https://res.cloudinary.com/demo/image/upload/hairapy/scans/sample.png";
        assertEquals("hairapy/scans/sample", service.extractPublicId(url));
    }

    @Test
    void extractPublicId_UrlWithTransformationsAndVersion_ReturnsPublicId() {
        String url = "https://res.cloudinary.com/demo/image/upload/c_fill,w_300/v987654/hairapy/scans/face_123.webp";
        assertEquals("hairapy/scans/face_123", service.extractPublicId(url));
    }

    @Test
    void extractPublicId_InvalidOrEmptyUrl_ReturnsNull() {
        assertNull(service.extractPublicId(null));
        assertNull(service.extractPublicId(""));
        assertNull(service.extractPublicId("https://example.com/not-cloudinary/test.jpg"));
    }
}
