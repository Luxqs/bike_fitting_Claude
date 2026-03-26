// ─── StepHeader Component ─────────────────────────────────────────────────────

interface StepHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  className?: string;
}

export function StepHeader({ title, subtitle, icon, className = '' }: StepHeaderProps) {
  return (
    <div className={`mb-6 animate-fade-in ${className}`}>
      {icon && (
        <div className="text-4xl mb-3">{icon}</div>
      )}
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-gray-500 text-sm leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
