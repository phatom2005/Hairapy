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
 * Đổi kích thước mask (nearest-neighbor) cho khớp đúng width*height của canvas đang vẽ.
 * Bắt buộc phải khớp: recolorHair duyệt mask theo chỉ số pixel của canvas — lệch kích thước sẽ ra sọc ngang.
 */
export function resizeMask(mask, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) return mask;
  const out = new Float32Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y * srcH) / dstH));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x * srcW) / dstW));
      out[y * dstW + x] = mask[sy * srcW + sx];
    }
  }
  return out;
}

/**
 * Trả Float32Array độ tin cậy "là tóc" (0..1) có kích thước ĐÚNG targetWidth*targetHeight.
 * @param imageSource ảnh/canvas đưa vào model (nên là canvas đã thu nhỏ đúng kích thước hiển thị)
 */
export async function getHairMask(imageSource, targetWidth, targetHeight) {
  const segmenter = await initHairSegmenter();
  const result = segmenter.segment(imageSource);
  try {
    const masks = result.confidenceMasks;
    if (!masks || !masks[HAIR_INDEX]) {
      throw new Error("Không thể phân đoạn vùng tóc từ ảnh.");
    }
    const mpMask = masks[HAIR_INDEX];
    // Copy độc lập ra mảng Float32Array mới để giải phóng tài nguyên MediaPipe an toàn
    const maskCopy = new Float32Array(mpMask.getAsFloat32Array());
    const w = targetWidth ?? mpMask.width;
    const h = targetHeight ?? mpMask.height;
    return resizeMask(maskCopy, mpMask.width, mpMask.height, w, h);
  } finally {
    if (result.close) {
      result.close();
    }
  }
}
