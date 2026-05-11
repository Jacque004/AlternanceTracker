import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Moins de padding (carte ou colonne latérale). */
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  compact,
  children,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/80 text-center max-w-full min-w-0 ${
        compact ? 'py-8 px-4 sm:px-5' : 'py-12 px-6 sm:px-8'
      } ${className}`}
      role="status"
    >
      {icon != null && (
        <div className={`text-gray-400 ${compact ? 'text-3xl mb-2' : 'text-4xl mb-3'}`} aria-hidden>
          {icon}
        </div>
      )}
      <h3 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
      {description ? (
        <p className={`mt-2 text-gray-600 max-w-md mx-auto ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>
          {description}
        </p>
      ) : null}
      {children ? <div className={`mt-5 flex flex-col sm:flex-row gap-2 justify-center items-center`}>{children}</div> : null}
    </div>
  );
}
