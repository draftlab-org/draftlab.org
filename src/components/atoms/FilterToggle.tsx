import type { CSSProperties } from 'react';

export interface FilterToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  iconSvg?: string;
  swatchStyle?: CSSProperties;
  title?: string;
}

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

export default function FilterToggle({
  label,
  active,
  onToggle,
  iconSvg,
  swatchStyle,
  title,
}: FilterToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      title={title ?? label}
      className={cx(
        'group relative inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        active
          ? 'border-transparent gradient-phase-light text-ink shadow-sm'
          : 'border-gray-200 bg-white text-ink-muted/70 grayscale hover:border-gray-300 hover:text-ink hover:grayscale-0'
      )}
    >
      {iconSvg && (
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      )}
      {swatchStyle && (
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 shrink-0 rounded-full"
          style={swatchStyle}
        />
      )}
      <span className="font-medium">{label}</span>
    </button>
  );
}
