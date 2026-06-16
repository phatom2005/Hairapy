// Nhãn nhỏ. variant: new (lime) | hot (pink) | premium (pink + glow) | neutral
const VARIANTS = {
  new: "bg-lime text-[#151f00]",
  hot: "bg-pink text-white",
  premium: "bg-pink text-white shadow-[0_0_10px_rgba(255,87,207,0.5)]",
  neutral: "bg-canvas text-mauve border border-divider",
};

export default function Badge({ children, variant = "new", className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}
