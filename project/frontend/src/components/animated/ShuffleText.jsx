// ===== Shuffle Text =====
// Hiệu ứng scramble từng từ rồi settle. Chạy 1 lần khi mount (KHÔNG loop).
// Kích thước mỗi từ cố định theo từ thật nên không gây xô lệch bố cục (CLS).
// Stagger giữa các từ → cảm giác cinematic.
//
// Usage:
//   <ShuffleText words={["Scan.", "Style.", "Smile."]} />

import { useEffect, useState, useRef } from "react";

const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&";

/** Bản xáo "cố định" của 1 từ: giữ dấu chấm/khoảng trắng, chữ cái thay bằng ký tự theo vị trí. */
function scrambleFixed(word, idx, chars) {
  let out = "";
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    out += /[a-zA-Z]/.test(ch) ? chars[(i * 7 + idx * 13 + 3) % chars.length] : ch;
  }
  return out;
}

export default function ShuffleText({
  words,
  // Thời gian shuffle mỗi từ (ms)
  duration = 700,
  // Delay giữa các từ (ms)
  stagger = 150,
  // Tốc độ render scramble (fps)
  fps = 30,
  // Bộ ký tự scramble
  chars = DEFAULT_CHARS,
  className = "",
  // Function render từng từ (cho phép gradient riêng cho từng từ)
  renderWord,
}) {
  // Khung hình đầu: mọi từ đã hiện dạng chữ xáo (cùng độ dài, KHÔNG để rỗng) để tiêu đề có đủ diện tích
  // ngay lần vẽ đầu → Largest Contentful Paint được tính sớm thay vì đợi từ cuối xáo xong (~1,5s).
  // Dùng công thức cố định thay cho Math.random để render thuần (không đổi giữa các lần render).
  const [display, setDisplay] = useState(() =>
    words.map((word, idx) => scrambleFixed(word, idx, chars)),
  );
  const isReducedMotion = useRef(false);

  useEffect(() => {
    // Check prefers-reduced-motion → hiển thị full luôn, không scramble
    isReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isReducedMotion.current) {
      setDisplay(words);
      return;
    }

    const intervals = [];
    words.forEach((word, idx) => {
      const startDelay = idx * stagger;
      const totalFrames = Math.ceil((duration / 1000) * fps);
      let frame = 0;

      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          const progress = frame / totalFrames;
          // Số ký tự đã reveal (từ trái sang phải)
          const revealCount = Math.floor(progress * word.length);

          let result = "";
          for (let i = 0; i < word.length; i++) {
            const ch = word[i];
            // Giữ nguyên ký tự không phải chữ (dấu chấm, space)
            if (i < revealCount || !/[a-zA-Z]/.test(ch)) {
              result += ch;
            } else {
              result += chars[Math.floor(Math.random() * chars.length)];
            }
          }

          setDisplay((prev) => {
            const next = [...prev];
            next[idx] = result;
            return next;
          });

          frame++;
          if (frame > totalFrames) {
            clearInterval(interval);
            setDisplay((prev) => {
              const next = [...prev];
              next[idx] = word;
              return next;
            });
          }
        }, 1000 / fps);
        intervals.push(interval);
      }, startDelay);
      intervals.push(timer);
    });

    return () => intervals.forEach((id) => clearInterval(id) || clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.join("|")]);

  const render = (w, i) => (renderWord ? renderWord(w, i) : w);

  // Mỗi từ là 1 ô 2 lớp chồng lên nhau:
  //  - lớp dưới: từ THẬT, ẩn (visibility:hidden) → quyết định kích thước ô ngay từ đầu;
  //  - lớp trên: chữ đang xáo trộn, rộng 0 + tràn ra ngoài nên rộng/hẹp thế nào cũng không đổi
  //    kích thước ô. (Không dùng position:absolute vì gradient bg-clip-text của thẻ cha
  //    không áp lên phần tử absolute → chữ bị trong suốt.)
  // Nhờ vậy chữ ngẫu nhiên rộng/hẹp khác nhau không làm cả dòng co giãn và đẩy nội dung bên dưới
  // (trước đây gây Cumulative Layout Shift ~0.6–1.0 trên mobile khi dùng font Unbounded).
  // Trình đọc màn hình chỉ đọc bản sr-only (từ thật), không đọc chữ xáo trộn.
  return (
    <span className={className}>
      <span className="sr-only">{words.join(" ")}</span>
      {display.map((w, i) => (
        <span key={i} aria-hidden="true">
          <span className="inline-grid whitespace-nowrap">
            <span className="invisible col-start-1 row-start-1">{render(words[i], i)}</span>
            <span className="col-start-1 row-start-1 w-0 overflow-visible">{render(w, i)}</span>
          </span>
          {i < display.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}
