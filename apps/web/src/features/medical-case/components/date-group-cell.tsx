import { Plus } from 'lucide-react';

/**
 * Renders the date cell for grouped table rows.
 * Shows the full date (day/month/year) for the first row in a group,
 * and a subtle connector line for subsequent rows.
 *
 * Extracted into its own file to satisfy Vite Fast Refresh requirements
 * (components must not share a file with hooks).
 */
export function DateGroupCell({ dateVal, isFirst, isExpanded, itemsCount, onToggle }: {
  dateVal: any;
  isFirst: boolean;
  isExpanded: boolean;
  itemsCount: number;
  onToggle: () => void;
}) {
  if (isFirst) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>
          {new Date(dateVal).getDate()}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>
          {new Date(dateVal).toLocaleString('default', { month: 'short' })} {new Date(dateVal).getFullYear()}
        </span>
        {itemsCount > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              background: 'var(--pp-blue-faded)', color: 'var(--pp-blue)', border: '1px solid var(--pp-blue-border)',
              borderRadius: '12px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
              marginTop: '6px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '2px', transition: 'all 0.2s'
            }}
          >
            <Plus size={10} style={{ transform: isExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
            {isExpanded ? 'less' : `${itemsCount - 1} more`}
          </button>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
      <div style={{ width: 2, height: 20, background: 'var(--pp-blue)', borderRadius: 2 }} />
    </div>
  );
}
