// Phase 6.6: @mediapipe/tasks-vision (~vài trăm KB) chỉ tải khi thật sự quét mặt / đổi màu tóc,
// không nằm trong bundle đầu của trang chủ.
let tasksVisionPromise = null;
export function loadTasksVision() {
  if (!tasksVisionPromise) {
    tasksVisionPromise = import("@mediapipe/tasks-vision").catch((err) => {
      tasksVisionPromise = null; // cho phép thử lại nếu mạng lỗi
      throw err;
    });
  }
  return tasksVisionPromise;
}

let visionFilesetPromise = null;

/**
 * Singleton cache cho FilesetResolver dùng chung giữa FaceLandmarker và ImageSegmenter,
 * đồng bộ đúng phiên bản 0.10.35 với package.json.
 */
export function getVisionFileset() {
  if (!visionFilesetPromise) {
    visionFilesetPromise = loadTasksVision()
      .then(({ FilesetResolver }) =>
        FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm")
      )
      .catch((err) => {
        visionFilesetPromise = null;
        throw err;
      });
  }
  return visionFilesetPromise;
}
