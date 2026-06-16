// Thẻ trắng bo góc + đổ bóng. padding bật/tắt qua prop.
export default function Card({ children, className = "", padded = true }) {
  return (
    <div className={`rounded-3xl border border-divider/10 bg-white shadow-sm ${padded ? "p-8" : ""} ${className}`}>
      {children}
    </div>
  );
}
