import { useRef, useEffect, useState } from "react";

// Hàng cuộn ngang: kéo chuột / vuốt / trackpad + QUÁN TÍNH (momentum) khi thả tay.
export default function DragScroll({ children, className = "" }) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const st = useRef({
    down: false,
    startX: 0,
    scroll: 0,
    moved: false,
    vx: 0,
    lastX: 0,
    lastT: 0,
    captured: false,
  });
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const stopInertia = () => cancelAnimationFrame(raf.current);

  const onDown = (e) => {
    // Chỉ xử lý nút chuột chính (chuột trái)
    if (e.button !== undefined && e.button !== 0) return;

    // Nếu nhấn vào nút, liên kết hoặc phần tử tương tác -> bỏ qua drag để click hoạt động chuẩn xác
    if (e.target.closest("button, a, input, select, textarea, [role='button'], [data-no-drag]")) {
      stopInertia();
      return;
    }

    const el = ref.current;
    if (!el) return;
    stopInertia();

    st.current = {
      down: true,
      startX: e.pageX,
      scroll: el.scrollLeft,
      moved: false,
      vx: 0,
      lastX: e.pageX,
      lastT: performance.now(),
      captured: false,
    };
  };

  const onMove = (e) => {
    const s = st.current;
    if (!s.down || !ref.current) return;

    const dx = e.pageX - s.startX;
    if (!s.moved && Math.abs(dx) > 6) {
      s.moved = true;
      setIsDragging(true);
      if (e.pointerId && ref.current?.setPointerCapture && !s.captured) {
        try {
          ref.current.setPointerCapture(e.pointerId);
          s.captured = true;
        } catch {
          // Trình duyệt không hỗ trợ pointer capture — bỏ qua, không ảnh hưởng kéo scroll
        }
      }
    }

    if (s.moved) {
      ref.current.scrollLeft = s.scroll - dx;
      // vận tốc tức thời (px/ms)
      const now = performance.now();
      const dt = now - s.lastT || 16;
      s.vx = (e.pageX - s.lastX) / dt;
      s.lastX = e.pageX;
      s.lastT = now;
    }
  };

  const onUp = (e) => {
    const s = st.current;
    if (!s.down) return;
    s.down = false;
    setIsDragging(false);

    if (s.captured && ref.current?.releasePointerCapture && e?.pointerId) {
      try {
        ref.current.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture có thể đã bị trình duyệt tự release trước đó — bỏ qua
      }
    }
    s.captured = false;

    // Nếu chưa thực sự kéo di chuyển thì không chạy quán tính
    if (!s.moved) return;

    // momentum: tiếp tục trôi theo vận tốc, ma sát giảm dần
    let v = s.vx * 16; // px mỗi frame
    const el = ref.current;
    if (!el) return;

    const step = () => {
      if (!el || Math.abs(v) < 0.4) return;
      el.scrollLeft -= v;
      v *= 0.93; // friction
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const onClickCapture = (e) => {
    // Chỉ ngăn chặn click nếu người dùng đang thực hiện động tác kéo chuột lướt danh sách
    if (st.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={onClickCapture}
      style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
      className={`flex gap-6 overflow-x-auto select-none pb-6
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                  [&_button]:cursor-pointer [&_a]:cursor-pointer
                  [&_button]:active:cursor-pointer [&_a]:active:cursor-pointer
                  ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
    >
      {children}
    </div>
  );
}
