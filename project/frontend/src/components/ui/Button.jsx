import { Link } from "react-router-dom";

// Nút dùng chung. Tự render <Link>, <a> hoặc <button> tuỳ prop.
// variant: primary | outline | pink | ghost | dark
// size: sm | md | lg
const VARIANTS = {
  primary: "bg-primary text-white shadow hover:opacity-90",
  brand: "bg-brand text-white shadow-lg hover:bg-brand/90",
  outline: "bg-white border-2 border-primary text-primary hover:bg-canvas",
  pink: "bg-pink text-[#64004e] shadow-xl hover:opacity-90",
  ghost: "text-mauve hover:text-ink",
  dark: "bg-ink text-white hover:opacity-90",
};
const SIZES = {
  sm: "px-6 py-2.5 text-sm",
  md: "px-8 py-3.5 text-base",
  lg: "px-10 py-4 text-lg",
};

export default function Button({
  children, variant = "primary", size = "md", to, href,
  className = "", icon, ...props
}) {
  const cls =
    `inline-flex items-center justify-center gap-2 rounded-full font-bold ` +
    `transition active:scale-[0.99] ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (to) return <Link to={to} className={cls} {...props}>{children}{icon}</Link>;
  if (href) return <a href={href} className={cls} {...props}>{children}{icon}</a>;
  return <button className={cls} {...props}>{children}{icon}</button>;
}
