import { FilesetResolver } from "@mediapipe/tasks-vision";

let visionFilesetPromise = null;

/**
 * Singleton cache cho FilesetResolver dùng chung giữa FaceLandmarker và ImageSegmenter,
 * đồng bộ đúng phiên bản 0.10.35 với package.json.
 */
export function getVisionFileset() {
  if (!visionFilesetPromise) {
    visionFilesetPromise = FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
    );
  }
  return visionFilesetPromise;
}
