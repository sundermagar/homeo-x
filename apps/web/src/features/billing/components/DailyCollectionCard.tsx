interface DailyCollectionCardProps {
  label: string;
  amount: number;
  count?: number;
  type?: 'default' | 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
}

export function DailyCollectionCard({ label, amount, count, type = 'default', icon }: DailyCollectionCardProps) {
  const iconClass = {
    default: 'bill-stat-icon-default',
    success: 'bill-stat-icon-success',
    danger:  'bill-stat-icon-danger',
    warning: 'bill-stat-icon-warning',
  }[type];

  return (
    <div className="bill-stat-card fade-in">
      <div className="bill-stat-card-top">
        <span className={`bill-stat-icon ${iconClass}`}>{icon}</span>
        {count !== undefined && (
          <span className="bill-stat-count">{count} bills</span>
        )}
      </div>
      <div>
        <p className="bill-stat-label">{label}</p>
        <p className="bill-stat-value">₹{amount.toLocaleString()}</p>
      </div>
    </div>
  );
}
