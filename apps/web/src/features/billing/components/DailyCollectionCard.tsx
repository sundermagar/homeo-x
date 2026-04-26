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

  return (
    <div className="bill-stat-card fade-in" data-type={type}>
      <div className="bill-stat-icon" style={{ background: styles.bg, color: styles.color }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
          <p className="bill-stat-label" style={{ margin: 0 }}>{label}</p>
          {count !== undefined && (
            <span className="bill-stat-count" style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 800 }}>{count}</div>
            </span>
          )}
        </div>
        <p className="bill-stat-value">₹{amount.toLocaleString()}</p>
      </div>
    </div>
  );
}
