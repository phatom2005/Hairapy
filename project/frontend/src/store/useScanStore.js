import { create } from "zustand";

export const useScanStore = create((set, get) => ({
  imageFile: null,
  previewUrl: null,
  analysisResult: null,
  analyzing: false,
  error: null,

  // Thiết lập ảnh gốc và tạo URL xem trước tạm thời (Blob URL)
  setImage: (file) => {
    // Thu hồi URL xem trước cũ nếu có để tránh rò rỉ bộ nhớ (memory leak)
    const currentPreviewUrl = get().previewUrl;
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }

    if (file) {
      set({
        imageFile: file,
        previewUrl: URL.createObjectURL(file),
        analysisResult: null,
        error: null,
      });
    } else {
      set({
        imageFile: null,
        previewUrl: null,
        analysisResult: null,
        error: null,
      });
    }
  },

  // Thiết lập kết quả phân tích khuôn mặt từ MediaPipe
  setResult: (result) => {
    set({ analysisResult: result, error: null });
  },

  // Thiết lập trạng thái đang phân tích
  setAnalyzing: (analyzing) => {
    set({ analyzing });
  },

  // Thiết lập lỗi nếu quá trình quét xảy ra sự cố
  setError: (error) => {
    set({ error });
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
      analysisResult: null,
      analyzing: false,
      error: null,
    });
  },
}));
