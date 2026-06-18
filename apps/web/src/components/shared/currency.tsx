/**
 * Currency — formats RON with Romanian locale (1.234,56 RON).
 *
 * Usage: <Currency value={47580.00} />
 * Renders: "47.580,00 RON"
 */
interface CurrencyProps {
  value: number;
  /** Currency symbol, defaults to "RON" */
  currency?: string;
  /** If true, show just the number without currency suffix */
  compact?: boolean;
  className?: string;
}

const RON_FORMATTER = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const RON_COMPACT_FORMATTER = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function Currency({
  value,
  currency = "RON",
  compact = false,
  className,
}: CurrencyProps) {
  const formatted = compact
    ? RON_COMPACT_FORMATTER.format(value)
    : RON_FORMATTER.format(value);

  return (
    <span className={className}>
      {formatted}
      {!compact && ` ${currency}`}
    </span>
  );
}

/**
 * Utility function for formatting RON values outside of React.
 */
export function formatRON(value: number, compact = false): string {
  const formatted = compact
    ? RON_COMPACT_FORMATTER.format(value)
    : RON_FORMATTER.format(value);
  return compact ? formatted : `${formatted} RON`;
}
