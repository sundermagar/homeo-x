import { useState } from 'react';
import React from 'react';

/**
 * Groups flat data by a date field, keeping track of which date groups
 * are expanded. Extracted into its own file to keep Fast Refresh happy
 * (a file must export either only hooks or only components, not both).
 */
export function useTableGrouping(data: any[], dateField: string = 'createdAt') {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const groupedData = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    data.forEach(record => {
      const dateVal = record[dateField] || record.createdAt || record.created_at || record.dateval || record.recordedAt || record.visitDate || record.reminderDate || 0;
      const dateStr = new Date(dateVal).toDateString();
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr]!.push(record);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }, [data, dateField]);

  return { expandedDates, toggleDate, groupedData };
}
