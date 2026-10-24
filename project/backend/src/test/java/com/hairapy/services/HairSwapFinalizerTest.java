package com.hairapy.services;

import com.hairapy.controllers.HairSwapController;
import com.hairapy.dto.HairSwapPollResult;
import com.hairapy.models.UsageHistory;
import com.hairapy.schedulers.HairSwapTaskCleanupScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HairSwapFinalizerTest {

    @Mock HairSwapService hairSwapService;
    @Mock UsageService usageService;
    @Mock SwapHistoryService swapHistoryService;

    HairSwapFinalizer finalizer;
    UsageHistory reservation;

    @BeforeEach
    void setUp() {
        finalizer = new HairSwapFinalizer(hairSwapService, usageService, swapHistoryService);
        reservation = UsageHistory.builder().build();
        reservation.setId(99L);
    }

    private HairSwapTask newTask() {
        return new HairSwapTask("t1", 7L, reservation, false, 3L, "Kiểu A");
    }

    @Test
    void ailabDone_luuLichSuDungMotLan_khongHoanLuot() {
        when(hairSwapService.checkStatus("t1")).thenReturn(HairSwapPollResult.done("http://ailab/x.jpg"));
        when(hairSwapService.uploadResult("http://ailab/x.jpg", false)).thenReturn("http://cloud/x.jpg");
        HairSwapTask task = newTask();

        assertEquals(HairSwapTask.Status.DONE, finalizer.pollOnce(task));
        // gọi lần 2 (task đã DONE) không upload/ghi lại
        finalizer.pollOnce(task);

        verify(swapHistoryService, times(1)).record(7L, 3L, "Kiểu A", "http://cloud/x.jpg");
        verify(usageService, never()).releaseUsage(any());
    }

    @Test
    void ailabError_hoanLuotDungMotLan_duGoiFailAndRefundHaiLan() {
        when(hairSwapService.checkStatus("t1")).thenReturn(HairSwapPollResult.error("loi AI"));
        HairSwapTask task = newTask();

        assertEquals(HairSwapTask.Status.ERROR, finalizer.pollOnce(task));
        finalizer.failAndRefund(task, "lần 2");
        finalizer.failAndRefund(task, "lần 3");

        verify(usageService, times(1)).releaseUsage(reservation);
    }

    @Test
    void uploadLoi_danhLoiVaHoanLuot() {
        when(hairSwapService.checkStatus("t1")).thenReturn(HairSwapPollResult.done("http://ailab/x.jpg"));
        when(hairSwapService.uploadResult(any(), anyBoolean())).thenThrow(new RuntimeException("cloudinary down"));
        HairSwapTask task = newTask();

        assertEquals(HairSwapTask.Status.ERROR, finalizer.pollOnce(task));
        verify(usageService, times(1)).releaseUsage(reservation);
        verify(swapHistoryService, never()).record(anyLong(), any(), any(), any());
    }

    @Test
    void failAndRefund_taskDaDone_khongDeLoi() {
        when(hairSwapService.checkStatus("t1")).thenReturn(HairSwapPollResult.done("u"));
        when(hairSwapService.uploadResult(eq("u"), anyBoolean())).thenReturn("c");
        HairSwapTask task = newTask();
        finalizer.pollOnce(task);

        finalizer.failAndRefund(task, "x");

        assertEquals(HairSwapTask.Status.DONE, task.getStatus());
        verify(usageService, never()).releaseUsage(any());
    }

    @Test
    void scheduler_taskPendingQuaHanVaAilabVanPending_hoanLuot() {
        HairSwapTask task = newTask();
        HairSwapTaskStore store = mock(HairSwapTaskStore.class);
        when(store.findStalePending(HairSwapController.TASK_TIMEOUT)).thenReturn(List.of(task));
        when(hairSwapService.checkStatus("t1")).thenReturn(HairSwapPollResult.pending());

        new HairSwapTaskCleanupScheduler(store, finalizer).cleanupStaleTasks();

        assertEquals(HairSwapTask.Status.ERROR, task.getStatus());
        verify(usageService, times(1)).releaseUsage(reservation);
        verify(store).evictStale(Duration.ofMinutes(10));
    }

    @Test
    void scheduler_ailabDaXong_luuAnhThayVoHoanLuot() {
        HairSwapTask task = newTask();
        HairSwapTaskStore store = mock(HairSwapTaskStore.class);
        when(store.findStalePending(any(Duration.class))).thenReturn(List.of(task));
        when(hairSwapService.checkStatus("t1")).thenReturn(HairSwapPollResult.done("u"));
        when(hairSwapService.uploadResult(eq("u"), anyBoolean())).thenReturn("c");

        new HairSwapTaskCleanupScheduler(store, finalizer).cleanupStaleTasks();

        verify(swapHistoryService).record(7L, 3L, "Kiểu A", "c");
        verify(usageService, never()).releaseUsage(any());
    }
}
