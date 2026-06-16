import { useRef, useEffect } from "react";

// Hàng cuộn ngang: kéo chuột / vuốt / trackpad + QUÁN TÍNH (momentum) khi thả tay.
export default function DragScroll({ children, className = "" }) {
  const ref = useRef(null);
  const st = useRef({ down: false, startX: 0, scroll: 0, moved: false, vx: 0, lastX: 0, lastT: 0 });
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const stopInertia = () => cancelAnimationFrame(raf.current);

  const onDown = (e) => {
    const el = ref.current;
    stopInertia();
    el.setPointerCapture?.(e.pointerId);
    st.current = { down: true, startX: e.pageX, scroll: el.scrollLeft, moved: false, vx: 0, lastX: e.pageX, lastT: performance.now() };
  };

  const onMove = (e) => {
    const s = st.current;
    if (!s.down) return;
    const dx = e.pageX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    ref.current.scrollLeft = s.scroll - dx;
    // vận tốc tức thời (px/ms)
    const now = performance.now();
    const dt = now - s.lastT || 16;
    s.vx = (e.pageX - s.lastX) / dt;
    s.lastX = e.pageX;
    s.lastT = now;
  };

  const onUp = () => {
    const s = st.current;
    s.down = false;
    // momentum: tiếp tục trôi theo vận tốc, ma sát giảm dần
    let v = s.vx * 16; // px mỗi frame
    const el = ref.current;
    const step = () => {
      if (Math.abs(v) < 0.4) return;
      el.scrollLeft -= v;
      v *= 0.93; // friction
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const onClickCapture = (e) => {
    if (st.current.moved) { e.preventDefault(); e.stopPropagation(); }
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
      className={`flex cursor-grab gap-6 overflow-x-auto select-none pb-6 active:cursor-grabbing
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}
