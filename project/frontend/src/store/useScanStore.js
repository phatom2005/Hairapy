import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { normalizeImage } from "../utils/imageUtils";

function dataUrlToFile(dataUrl, filename = "scan-session.jpg") {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const blob = new Blob([u8arr], { type: mime });
  return new File([blob], filename, { type: mime });
}

async function fileToDataUrl(file) {
  if (!file) return null;
  try {
    const normalized = await normalizeImage(file);
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Nếu dataURL > 3MB (khoảng 3 * 1024 * 1024 bytes) thì không lưu
        if (typeof result === "string" && result.length > 3 * 1024 * 1024) {
          resolve(null);
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(normalized);
    });
  } catch (err) {
    console.warn("Lỗi đọc dataURL từ file:", err);
    return null;
  }
}

export const useScanStore = create(
  persist(
    (set, get) => ({
      imageFile: null,
      previewUrl: null,
      imageDataUrl: null,
      analysisResult: null,
      analyzing: false,
      error: null,
      selectedHairstyle: null, // Kiểu tóc được chọn từ trang kết quả phân tích
      gender: null, // Giới tính người dùng chọn: "Nam" hoặc "Nữ"

      // Thiết lập ảnh gốc và tạo URL xem trước tạm thời (Blob URL)
      setImage: (file) => {
        const currentPreviewUrl = get().previewUrl;
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }

        if (file) {
          set({
            imageFile: file,
            previewUrl: URL.createObjectURL(file),
            imageDataUrl: null,
            analysisResult: null,
            error: null,
          });

          fileToDataUrl(file).then((dataUrl) => {
            if (get().imageFile === file) {
              set({ imageDataUrl: dataUrl });
            }
          });
        } else {
          set({
            imageFile: null,
            previewUrl: null,
            imageDataUrl: null,
            analysisResult: null,
            error: null,
          });
        }
      },

      // Thiết lập kết quả phân tích khuôn mặt từ MediaPipe
      setResult: (result) => {
        set({ analysisResult: result, error: null });
      },

      // Cho phép người dùng tự chỉnh dáng mặt nếu AI đoán chưa đúng
      overrideFaceShape: (shape) => {
        const currentResult = get().analysisResult;
        if (!currentResult) return;
        set({
          analysisResult: {
            ...currentResult,
            faceShape: shape,
            userOverridden: true,
          },
        });
      },

      // Thiết lập trạng thái đang phân tích
      setAnalyzing: (analyzing) => {
        set({ analyzing });
      },

      // Thiết lập lỗi nếu quá trình quét xảy ra sự cố
      setError: (error) => {
        set({ error });
      },

      // Thiết lập kiểu tóc được chọn
      setSelectedHairstyle: (hairstyle) => {
        set({ selectedHairstyle: hairstyle });
      },

      // Thiết lập giới tính người dùng
      setGender: (gender) => {
        set({ gender });
      },

      // Khôi phục trạng thái ảnh quét từ lịch sử quét lưu trên server
      hydrateFromHistory: async (scan) => {
        const res = await fetch(scan.imageUrl);
        // Không dùng response lỗi (404/403...) làm "ảnh" — tránh gửi file rác lên AI
        if (!res.ok) throw new Error(`Không tải được ảnh lịch sử quét (HTTP ${res.status})`);
        const blob = await res.blob();
        const file = new File([blob], "scan-history.jpg", { type: blob.type || "image/jpeg" });
        const currentPreviewUrl = get().previewUrl;
        if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
        set({
          imageFile: file,
          previewUrl: URL.createObjectURL(file),
          imageDataUrl: null,
          analysisResult: { faceShape: scan.faceShape, hairType: scan.hairType },
          error: null,
        });

        fileToDataUrl(file).then((dataUrl) => {
          if (get().imageFile === file) {
            set({ imageDataUrl: dataUrl });
          }
        });
      },

      // Reset toàn bộ state về mặc định (ví dụ khi người dùng muốn quét lại)
      reset: () => {
        const currentPreviewUrl = get().previewUrl;
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }
        set({
          imageFile: null,
          previewUrl: null,
          imageDataUrl: null,
          analysisResult: null,
          analyzing: false,
          error: null,
          selectedHairstyle: null,
          // Không reset gender khi quét lại — giới tính không thay đổi giữa các lần scan
        });
      },
    }),
    {
      name: "hairapy-scan",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        analysisResult: state.analysisResult,
        gender: state.gender,
        selectedHairstyle: state.selectedHairstyle,
        imageDataUrl: state.imageDataUrl,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("Lỗi khôi phục session scan:", error);
          return;
        }
        if (state && state.imageDataUrl && !state.imageFile) {
          try {
            const file = dataUrlToFile(state.imageDataUrl);
            state.imageFile = file;
            state.previewUrl = URL.createObjectURL(file);
          } catch (err) {
            console.warn("Lỗi tái tạo ảnh từ sessionStorage:", err);
          }
        }
      },
    }
  )
);

/**
 * Hook kiểm tra trạng thái hydration từ sessionStorage dùng useSyncExternalStore
 */
export const useHasHydrated = () => {
  return useSyncExternalStore(
    (callback) => {
      if (!useScanStore.persist) return () => {};
      const unsub = useScanStore.persist.onFinishHydration(() => {
        callback();
      });
      return () => unsub?.();
    },
    () => useScanStore.persist?.hasHydrated?.() ?? true,
    () => true
  );
};
