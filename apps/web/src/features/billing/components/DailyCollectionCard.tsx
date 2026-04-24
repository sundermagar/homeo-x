interface DailyCollectionCardProps {
  label: string;
  amount: number;
  count?: number;
  type?: 'default' | 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
}

export function DailyCollectionCard({ label, amount, count, type = 'default', icon }: DailyCollectionCardProps) {
  const styles = {
    default: { color: 'var(--pp-blue)',       bg: 'var(--pp-blue-tint)' },
    success: { color: 'var(--pp-success-fg)',  bg: 'var(--pp-success-bg)' },
    danger:  { color: 'var(--pp-danger-fg)',   bg: 'var(--pp-danger-bg)' },
    warning: { color: 'var(--pp-warning-fg)',  bg: 'var(--pp-warning-bg)' },
  }[type];

  /* Format: ₹1,000 → split ₹ from number for better typography */
  const formatted = amount.toLocaleString('en-IN');

  return (
    <div className="bill-stat-card fade-in" data-type={type}>
      <div className="bill-stat-icon" style={{ background: styles.bg, color: styles.color }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="bill-stat-label" style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{label}</span>
          {count !== undefined && (
            <span style={{
              background: styles.bg,
              color: styles.color,
              borderRadius: 999,
              padding: '1px 8px',
              fontSize: '0.65rem',
              fontWeight: 800,
              fontFamily: 'var(--pp-font-mono)',
              letterSpacing: '0.02em',
            }}>
              {count}
            </span>
          )}
        </p>
        <p style={{ margin: 0, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: styles.color,
            fontFamily: 'var(--pp-font-sans)',
            opacity: 0.75,
            marginRight: 1,
          }}>₹</span>
          <span style={{
            fontSize: '1.55rem',
            fontWeight: 800,
            fontFamily: 'var(--pp-font-mono)',
            color: styles.color,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>{formatted}</span>
        </p>
      </div>
    </div>
  );
}
