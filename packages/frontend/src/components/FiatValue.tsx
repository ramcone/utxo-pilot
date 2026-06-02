import { useBTCPrice } from '../hooks/useBTCPrice';

interface Props {
  sats: number;
  /** 'inline' shows "≈ $3,921.42" on the same line in muted text */
  /** 'block'  shows on its own line, slightly larger */
  display?: 'inline' | 'block';
  className?: string;
}

export default function FiatValue({ sats, display = 'inline', className }: Props) {
  const { toFiat, currency } = useBTCPrice();
  const value = toFiat(sats);
  if (!value) return null;

  if (display === 'block') {
    return (
      <div
        className={className}
        style={{ fontSize: '0.85rem', color: 'var(--text2)', marginTop: 2 }}
      >
        ≈ {value} {currency}
      </div>
    );
  }

  return (
    <span
      className={className}
      style={{ fontSize: '0.78rem', color: 'var(--text3)', marginLeft: 6 }}
    >
      ≈ {value}
    </span>
  );
}
