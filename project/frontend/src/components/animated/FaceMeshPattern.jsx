// ===== FaceMeshPattern =====
// Lưới điểm + đường nối mô phỏng Face Mesh THẬT sự giống khuôn mặt người
// (khung mặt hình trứng + lông mày + mắt + mũi + miệng) — giống output của
// Face Mesh API mà Hairapy dùng để phân tích khuôn mặt — đặt làm nền động
// phía sau 2 vòng tròn trang trí trong Hero card.
//
// Toạ độ tính trên viewBox 100x100, mặt đặt giữa (cx=50). Khung mặt dùng công
// thức "trứng" (egg shape): bán kính ngang co lại dần về phía cằm (nửa dưới)
// để không bị tròn xoe như hình oval thường, nhìn thật giống mặt người hơn.
// Các bộ phận (lông mày, mắt, mũi, miệng) đặt theo tỉ lệ khuôn mặt chuẩn.
import { useMemo } from "react";
import { motion } from "motion/react";

// Sinh N điểm theo hình "trứng" quanh tâm (cx,cy) — dùng cho khung mặt.
// chinPinch: độ co bán kính ngang ở nửa dưới (0 = tròn đều, càng lớn càng nhọn cằm)
function eggPoints(cx, cy, rx, ry, count, chinPinch = 0.35) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const bottomFactor = Math.max(0, Math.sin(t)); // >0 ở nửa dưới (cằm)
    const rxT = rx * (1 - chinPinch * Math.pow(bottomFactor, 1.6));
    pts.push({ x: cx + Math.cos(t) * rxT, y: cy + Math.sin(t) * ry });
  }
  return pts;
}

// Sinh N điểm theo hình elip đầy đủ — dùng cho mắt/miệng
function ellipsePoints(cx, cy, rx, ry, count, startAngle = 0, endAngle = Math.PI * 2) {
  const pts = [];
  const span = endAngle - startAngle;
  const n = span >= Math.PI * 2 - 0.001 ? count : count - 1;
  for (let i = 0; i < count; i++) {
    const t = startAngle + (i / n) * span;
    pts.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
  }
  return pts;
}

function chainEdges(startIdx, count, closed) {
  const edges = [];
  const last = closed ? count : count - 1;
  for (let i = 0; i < last; i++) {
    edges.push([startIdx + i, startIdx + ((i + 1) % count)]);
  }
  return edges;
}

function buildFaceMesh() {
  const points = [];
  const edges = [];
  const addGroup = (pts, closed, extraEdges = []) => {
    const start = points.length;
    points.push(...pts);
    edges.push(...chainEdges(start, pts.length, closed));
    extraEdges.forEach(([a, b]) => edges.push([start + a, start + b]));
    return start;
  };

  // Khung mặt hình trứng — 22 điểm, cằm thon hơn trán/gò má
  const contourStart = addGroup(eggPoints(50, 50, 30, 36, 22, 0.4), true);

  // Lông mày trai/phải — cung ngắn, không khép kín
  addGroup(ellipsePoints(37, 37, 9, 3.5, 5, Math.PI * 1.05, Math.PI * 1.95), false);
  addGroup(ellipsePoints(63, 37, 9, 3.5, 5, Math.PI * 1.05, Math.PI * 1.95), false);

  // Mắt trái/phải — elip khép kín + 1 đường chéo tạo cảm giác tam giác hoá
  const leftEye = addGroup(ellipsePoints(37, 46, 7.5, 4, 8, 0, Math.PI * 2), true, [[0, 4]]);
  const rightEye = addGroup(ellipsePoints(63, 46, 7.5, 4, 8, 0, Math.PI * 2), true, [[0, 4]]);

  // Mũi — sống mũi dọc + chân mũi (2 cánh mũi)
  addGroup(
    [
      { x: 50, y: 44 },
      { x: 49, y: 54 },
      { x: 50, y: 60 },
    ],
    false,
  );
  addGroup(
    [
      { x: 45, y: 60 },
      { x: 50, y: 62.5 },
      { x: 55, y: 60 },
    ],
    false,
  );

  // Miệng — elip khép kín + đường ngang môi (tam giác hoá)
  addGroup(ellipsePoints(50, 71, 12, 5, 10, 0, Math.PI * 2), true, [
    [0, 5],
    [2, 8],
  ]);

  // Vài đường nối từ khung mặt vào mắt/lông mày để trông giống lưới tam giác
  // hoá thật (Face Mesh API thật cũng nối contour vào các điểm nội bộ).
  edges.push([contourStart + 3, leftEye]);
  edges.push([contourStart + 2, leftEye + 2]);
  edges.push([contourStart + 19, rightEye]);
  edges.push([contourStart + 20, rightEye + 2]);

  return { points, edges };
}

export default function FaceMeshPattern({ className = "" }) {
  const { points, edges } = useMemo(() => buildFaceMesh(), []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {/* Đường nối tam giác hoá, mờ nhẹ, pulse lệch pha */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={`e-${i}`}
            x1={points[a].x}
            y1={points[a].y}
            x2={points[b].x}
            y2={points[b].y}
            stroke="white"
            strokeWidth={0.2}
            initial={{ opacity: 0.14 }}
            animate={{ opacity: [0.14, 0.38, 0.14] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 12) * 0.15,
            }}
          />
        ))}
        {/* Điểm mốc (landmark), lớn hơn 1 chút, pulse riêng để nổi hơn đường nối */}
        {points.map((p, i) => (
          <motion.circle
            key={`p-${i}`}
            cx={p.x}
            cy={p.y}
            r={0.6}
            fill="white"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 9) * 0.2,
            }}
          />
        ))}
      </svg>

      {/* Dải sáng quét dọc, mô phỏng tia scan chạy qua lưới */}
      <motion.div
        className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-white/25 to-transparent"
        initial={{ y: "-120%" }}
        animate={{ y: ["-120%", "220%"] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
      />
    </div>
  );
}
