import { ImageSegmenter } from "@mediapipe/tasks-vision";
import { getVisionFileset } from "./visionFileset";

// Model selfie multiclass: category 0 = nền, 1 = TÓC, 2 = da người, 3 = da mặt, 4 = quần áo, 5 = khác
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
const HAIR_INDEX = 1;
let segmenterPromise = null;

/**
 * Khởi tạo 1 lần (lazy) — chỉ gọi khi người dùng mở công cụ màu, KHÔNG preload ở trang khác.
 */
export async function initHairSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const fileset = await getVisionFileset();
      try {
        return await ImageSegmenter.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
      } catch (gpuErr) {
        console.warn("GPU delegate không khả dụng, thử chuyển sang CPU:", gpuErr);
        try {
          return await ImageSegmenter.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "CPU",
            },
            runningMode: "IMAGE",
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          });
        } catch (cpuErr) {
          throw new Error(
            "Thiết bị của bạn chưa hỗ trợ xem trước màu — hãy dùng nút Tạo bằng AI",
            { cause: cpuErr }
          );
        }
      }
    })();
  }
  return segmenterPromise;
}

/**
 * Trả Float32Array độ tin cậy "là tóc" (0..1) kích thước width*height của ảnh đầu vào.
 */
export async function getHairMask(imageElement) {
  const segmenter = await initHairSegmenter();
  const result = segmenter.segment(imageElement);
  try {
    const masks = result.confidenceMasks;
    if (!masks || !masks[HAIR_INDEX]) {
      throw new Error("Không thể phân đoạn vùng tóc từ ảnh.");
    }
    const floatArray = masks[HAIR_INDEX].getAsFloat32Array();
    // Copy độc lập ra mảng Float32Array mới để giải phóng tài nguyên MediaPipe an toàn
    const maskCopy = new Float32Array(floatArray);
    return maskCopy;
  } finally {
    if (result.close) {
      result.close();
    }
  }
}
