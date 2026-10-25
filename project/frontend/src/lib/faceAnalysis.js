import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { getVisionFileset } from "./visionFileset";

// Khởi tạo thực thể FaceLandmarker dạng Singleton
let faceLandmarkerInstance = null;
let initPromise = null;

// Hàm tính khoảng cách Euclid 3D giữa hai điểm landmark
const calculateDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
};

// Hàm khởi tạo bộ phân tích khuôn mặt (preload model)
export async function initFaceAnalyzer() {
  if (faceLandmarkerInstance) {
    return faceLandmarkerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Tải bộ giải quyết tệp tin WASM dùng chung từ getVisionFileset
      const filesetResolver = await getVisionFileset();

      // Khởi tạo FaceLandmarker từ model task CDN của Google
      // Ưu tiên GPU, fallback CPU nếu thiết bị không hỗ trợ WebGPU
      const modelOptions = {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      };

      try {
        faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, modelOptions);
      } catch {
        // Fallback sang CPU nếu GPU không khả dụng
        console.warn("GPU delegate không khả dụng, chuyển sang CPU.");
        modelOptions.baseOptions.delegate = "CPU";
        faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, modelOptions);
      }

      return faceLandmarkerInstance;
    } catch (error) {
      console.error("Lỗi khi khởi tạo MediaPipe FaceLandmarker:", error);
      initPromise = null; // Cho phép thử lại nếu lỗi
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Hàm quyết định dáng mặt từ các chỉ số tỷ lệ r1, r2, r3, jawToCheek
 */
export function decideShape({ r1, r2, r3, jawToCheek }) {
  if (r1 <= 1.15) {
    // Mặt "ngắn/rộng" — phân biệt Round (hàm mềm) và Square (hàm gần vuông, rộng gần bằng gò má).
    return jawToCheek > 0.88 ? "Square" : "Round";
  } else if (r1 >= 1.6) {
    return "Oblong";
  } else if (r2 >= 1.15) {
    return "Heart";
  } else if (r3 >= 1.1) {
    return "Diamond";
  } else {
    return "Oval";
  }
}

/**
 * Tìm dáng mặt "gần thứ hai" bằng cách biến thiên từng chỉ số +/-5%.
 * Trả về dáng đầu tiên khác dáng chính, hoặc null nếu kết quả hoàn toàn ổn định.
 */
export function getAlternativeShape(metrics) {
  if (!metrics) return null;
  const { r1, r2, r3, jawToCheek } = metrics;
  const primaryShape = decideShape({ r1, r2, r3, jawToCheek });

  const multipliers = [0.95, 1.05];
  const keys = ["r1", "r2", "r3", "jawToCheek"];

  for (const key of keys) {
    for (const m of multipliers) {
      const perturbed = { r1, r2, r3, jawToCheek, [key]: metrics[key] * m };
      const shape = decideShape(perturbed);
      if (shape !== primaryShape) {
        return shape;
      }
    }
  }

  return null;
}

/**
 * Phân loại hình dáng khuôn mặt từ 4 số đo (không phụ thuộc MediaPipe/landmark thật) —
 * tách riêng thành pure function để unit test độc lập.
 */
export function classifyFaceShape({ foreheadWidth, cheekboneWidth, jawWidth, faceLength }) {
  if (faceLength === 0 || cheekboneWidth === 0) {
    throw new Error("Kích thước khuôn mặt không hợp lệ để phân tích.");
  }

  const r1 = faceLength / cheekboneWidth;
  const r2 = foreheadWidth / jawWidth;
  const r3 = cheekboneWidth / ((foreheadWidth + jawWidth) / 2);
  const jawToCheek = jawWidth / cheekboneWidth;

  const faceShape = decideShape({ r1, r2, r3, jawToCheek });
  const metrics = {
    r1,
    r2,
    r3,
    jawToCheek,
    foreheadWidth,
    cheekboneWidth,
    jawWidth,
    faceLength,
    widthToLength: 1 / r1,
    foreheadToJaw: r2,
  };
  const alternativeShape = getAlternativeShape(metrics);

  return {
    faceShape,
    alternativeShape,
    metrics,
  };
}

// Hàm phân tích hình dáng khuôn mặt từ phần tử hình ảnh (HTMLImageElement)
export async function analyzeFace(imageElement) {
  const landmarker = await initFaceAnalyzer();
  
  // Tiến hành nhận diện các điểm trên khuôn mặt
  const result = landmarker.detect(imageElement);

  if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error("Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp/chọn ảnh rõ mặt hơn.");
  }

  const landmarks = result.faceLandmarks[0];

  const p70 = landmarks[70];
  const p300 = landmarks[300];
  const p234 = landmarks[234];
  const p454 = landmarks[454];
  const p172 = landmarks[172];
  const p397 = landmarks[397];
  const p10 = landmarks[10];
  const p152 = landmarks[152];

  const foreheadWidth = calculateDistance(p70, p300);
  const cheekboneWidth = calculateDistance(p234, p454);
  const jawWidth = calculateDistance(p172, p397);
  const faceLength = calculateDistance(p10, p152);

  const { faceShape, alternativeShape, metrics } = classifyFaceShape({
    foreheadWidth,
    cheekboneWidth,
    jawWidth,
    faceLength,
  });

  return { faceShape, alternativeShape, landmarks, metrics };
}
