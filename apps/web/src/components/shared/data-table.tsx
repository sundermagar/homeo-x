import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: string;
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  page = 1,
  totalPages = 1,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  emptyTitle = 'No data found',
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>
                {col.sortable && onSort ? (
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => onSort(col.key)}
                  >
                    {col.header}
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 ${sortBy === col.key ? 'text-primary-600' : 'text-gray-400'}`}
                    />
                    {sortBy === col.key && (
                      <span className="sr-only">{sortOrder === 'asc' ? 'ascending' : 'descending'}</span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={onRowClick ? 'cursor-pointer' : undefined}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(item) : ((item as Record<string, unknown>)[col.key] as ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
