import { useState } from "react";
import { EyeIcon } from "../icons";

// Ô input có label + icon trái, hỗ trợ toggle hiện/ẩn mật khẩu.
// Nhận thêm value/onChange/name... qua ...props.
export default function Input({
  label, type = "text", placeholder, icon, rightSlot,
  togglePassword = false, className = "", ...props
}) {
  const [show, setShow] = useState(false);
  const inputType = togglePassword ? (show ? "text" : "password") : type;

  return (
    <label className={`flex w-full flex-col gap-2 ${className}`}>
      {(label || rightSlot) && (
        <div className="flex items-center justify-between px-1">
          {label && <span className="text-sm font-semibold tracking-wide text-mauve">{label}</span>}
          {rightSlot}
        </div>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/60">
            {icon}
          </span>
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          className={`w-full rounded-3xl border-2 border-line bg-white py-4 pr-12 text-base text-ink
                     outline-none transition placeholder:text-muted/50 focus:border-brand
                     ${icon ? "pl-12" : "pl-5"}`}
          {...props}
        />
        {togglePassword && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/70 hover:text-mauve">
            <EyeIcon off={show} />
          </button>
        )}
      </div>
    </label>
  );
}
