// Khoi section + tieu de chuan cua trang.
export function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`px-4 py-12 sm:px-10 sm:py-20 lg:px-16 lg:py-24 ${className}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

// center: can giua (features) | false: can trai (trends)
export function SectionHeading({ title, subtitle, center = true, action }) {
  return (
    <div className={`mb-8 sm:mb-12 flex ${center ? "flex-col items-center text-center" : "flex-col sm:flex-row items-start sm:items-end justify-between gap-4"}`}>
      <div className={center ? "flex flex-col items-center gap-2 sm:gap-3" : ""}>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">{title}</h2>
        {subtitle && <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-mauve">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
