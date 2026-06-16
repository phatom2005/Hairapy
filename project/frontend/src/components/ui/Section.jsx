// Khoi section + tieu de chuan cua trang.
export function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`px-6 py-24 sm:px-16 ${className}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

// center: can giua (features) | false: can trai (trends)
export function SectionHeading({ title, subtitle, center = true, action }) {
  return (
    <div className={`mb-12 flex ${center ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div className={center ? "flex flex-col items-center gap-3" : ""}>
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{title}</h2>
        {subtitle && <p className="mt-2 text-base text-mauve">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
