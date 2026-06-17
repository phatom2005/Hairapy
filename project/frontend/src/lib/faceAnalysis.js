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
      faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });

      return faceLandmarkerInstance;
    } catch (error) {
      console.error("Lỗi khi khởi tạo MediaPipe FaceLandmarker:", error);
      initPromise = null; // Cho phép thử lại nếu lỗi
      throw error;
    }
  })();

  return initPromise;
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

  if (faceLength === 0 || cheekboneWidth === 0) {
    throw new Error("Kích thước khuôn mặt không hợp lệ để phân tích.");
  }

  // Tính các tỷ lệ khuôn mặt
  const widthToLength = cheekboneWidth / faceLength;
  const foreheadToJaw = foreheadWidth / jawWidth;
  const jawToCheek = jawWidth / cheekboneWidth;

  // Phân loại hình dáng khuôn mặt theo thuật toán chỉ định
  let faceShape = "Oval"; // Mặc định là mặt Oval

  if (widthToLength > 0.85 && jawToCheek > 0.85) {
    faceShape = "Round";
  } else if (widthToLength > 0.8 && jawToCheek > 0.9 && foreheadToJaw < 1.1) {
    faceShape = "Square";
  } else if (widthToLength < 0.65) {
    faceShape = "Oblong";
  } else if (foreheadToJaw > 1.15 && jawToCheek < 0.8) {
    faceShape = "Heart";
  } else if (jawToCheek < 0.78 && foreheadToJaw < 0.95) {
    faceShape = "Diamond";
  }

  return {
    faceShape,
    landmarks,
    metrics: {
      foreheadWidth,
      cheekboneWidth,
      jawWidth,
      faceLength,
      widthToLength,
      foreheadToJaw,
      jawToCheek
    }
  };
}
