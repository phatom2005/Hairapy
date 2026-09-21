package com.hairapy.services;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class HairSwapTaskStoreTest {

    @Test
    void registerAndGet_WorksCorrectly() {
        HairSwapTaskStore store = new HairSwapTaskStore();
        HairSwapTask task = new HairSwapTask("task-123", 1L, null, false);

        store.register(task);

        assertEquals(1, store.size());
        assertEquals(task, store.get("task-123"));
        assertNull(store.get("non-existent"));
    }

    @Test
    void evictStale_RemovesExpiredTasks() throws InterruptedException {
        HairSwapTaskStore store = new HairSwapTaskStore();
        HairSwapTask task = new HairSwapTask("task-1", 1L, null, false);
        store.register(task);

        // Chờ 10ms để task lớn hơn Duration.ofMillis(5)
        Thread.sleep(10);

        int evicted = store.evictStale(Duration.ofMillis(5));
        assertEquals(1, evicted);
        assertEquals(0, store.size());
        assertNull(store.get("task-1"));
    }

    @Test
    void taskGuards_PreventDuplicateRefundAndUpload() {
        HairSwapTask task = new HairSwapTask("task-abc", 1L, null, false);

        // Refund guard
        assertTrue(task.tryMarkRefunded());
        assertFalse(task.tryMarkRefunded());

        // Upload guard
        assertTrue(task.tryMarkUploaded());
        assertFalse(task.tryMarkUploaded());
    }

    @Test
    void markDoneAndMarkError_SetsState() {
        HairSwapTask task = new HairSwapTask("task-xyz", 1L, null, true);
        assertEquals(HairSwapTask.Status.PENDING, task.getStatus());

        task.markDone("https://res.cloudinary.com/result.jpg");
        assertEquals(HairSwapTask.Status.DONE, task.getStatus());
        assertEquals("https://res.cloudinary.com/result.jpg", task.getResultImageUrl());

        task.markError("Something failed");
        assertEquals(HairSwapTask.Status.ERROR, task.getStatus());
        assertEquals("Something failed", task.getErrorMessage());
    }
}
