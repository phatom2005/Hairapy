// ===== Shuffle Text =====
// Hiệu ứng scramble từng từ rồi settle. Chạy 1 lần khi mount (KHÔNG loop).
// Stagger giữa các từ → cảm giác cinematic.
//
// Usage:
//   <ShuffleText words={["Scan.", "Style.", "Smile."]} />

import { useEffect, useState, useRef } from "react";

const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&";

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
  // Mảng state cho từng từ — initial = "" để khỏi flash chữ thật
  const [display, setDisplay] = useState(() => words.map(() => ""));
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

  return (
    <span className={className}>
      {display.map((w, i) => (
        <span key={i} className="inline-block">
          {renderWord ? renderWord(w, i) : w}
          {i < display.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}
