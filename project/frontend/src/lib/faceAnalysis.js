import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

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
      // Tải bộ giải quyết tệp tin WASM từ CDN jsDelivr
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );

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
 * Phân loại hình dáng khuôn mặt từ 4 số đo (không phụ thuộc MediaPipe/landmark thật) —
 * tách riêng thành pure function để unit test độc lập.
 *
 * Thuật toán dựa theo cách phân loại phổ biến bằng 3 tỷ lệ:
 * - R1 = faceLength / cheekboneWidth (dài/rộng) — chỉ số quan trọng nhất, quyết định nhóm
 *   "ngắn/rộng" (Round/Square), "dài" (Oblong), hay "cân đối" (Oval/Heart/Diamond).
 * - R2 = foreheadWidth / jawWidth — trán rộng hơn hàm rõ rệt là đặc trưng mặt Heart.
 * - R3 = cheekboneWidth / trung bình(forehead, jaw) — gò má nổi bật nhất là đặc trưng mặt Diamond.
 *
 * Khác bản cũ: bản cũ dùng nhiều điều kiện AND hẹp, khiến phần lớn khuôn mặt "bình thường"
 * (không cực đoan) rơi vào nhánh mặc định Oval dù tỷ lệ trán/hàm/gò má thực ra lệch rõ về
 * Heart/Diamond. Bản mới luôn kiểm tra R2/R3 trước khi kết luận Oval, nên Oval chỉ thắng khi
 * tỷ lệ thực sự cân đối — không phải vì "không khớp điều kiện nào khác".
 */
export function classifyFaceShape({ foreheadWidth, cheekboneWidth, jawWidth, faceLength }) {
  if (faceLength === 0 || cheekboneWidth === 0) {
    throw new Error("Kích thước khuôn mặt không hợp lệ để phân tích.");
  }

  const r1 = faceLength / cheekboneWidth;
  const r2 = foreheadWidth / jawWidth;
  const r3 = cheekboneWidth / ((foreheadWidth + jawWidth) / 2);
  const jawToCheek = jawWidth / cheekboneWidth;

  let faceShape;

  if (r1 <= 1.15) {
    // Mặt "ngắn/rộng" — phân biệt Round (hàm mềm) và Square (hàm gần vuông, rộng gần bằng gò má).
    faceShape = jawToCheek > 0.88 ? "Square" : "Round";
  } else if (r1 >= 1.6) {
    faceShape = "Oblong";
  } else if (r2 >= 1.15) {
    faceShape = "Heart";
  } else if (r3 >= 1.1) {
    faceShape = "Diamond";
  } else {
    faceShape = "Oval";
  }

  return {
    faceShape,
    metrics: {
      r1, r2, r3, jawToCheek, foreheadWidth, cheekboneWidth, jawWidth, faceLength,
      // Alias giữ tương thích ngược — ResultsPage.jsx đang đọc trực tiếp 2 field cũ này
      // (metrics.widthToLength, metrics.foreheadToJaw) để hiển thị "Tỷ lệ rộng/dài",
      // "Tỷ lệ trán/hàm" và tính symmetryScore/styleScore. KHÔNG xoá 2 field này,
      // nếu không ResultsPage sẽ hiện "N/A" cho 2 dòng biometrics đó.
      widthToLength: 1 / r1,
      foreheadToJaw: r2,
    },
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

  // Lấy các điểm mốc chính để tính toán kích thước khuôn mặt:
  // - foreheadWidth: khoảng cách giữa landmark 70 và 300 (hai bên trán)
  // - cheekboneWidth: khoảng cách giữa landmark 234 và 454 (hai bên gò má)
  // - jawWidth: khoảng cách giữa landmark 172 và 397 (hai bên hàm)
  // - faceLength: khoảng cách giữa landmark 10 (trán trên) và 152 (cằm dưới)
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

  const { faceShape, metrics } = classifyFaceShape({ foreheadWidth, cheekboneWidth, jawWidth, faceLength });

  return { faceShape, landmarks, metrics };
}
