// @ts-nocheck
/**
 * Print Engine — Zero-dependency browser print utility
 * Uses hidden iframe + window.print() for A4-optimized output
 */

export interface PrintOptions {
  title?: string;
  /** Delay in ms before triggering print (allows styles to load) */
  delay?: number;
}

/**
 * Opens a print dialog with the given HTML content rendered in an iframe.
 * Handles cleanup after print completes or is cancelled.
 */
export function printHtml(html: string, options: PrintOptions = {}): void {
  const { title = 'Print', delay = 300 } = options;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body>
${html}
</body>
</html>`);
  doc.close();

  // Wait for content to render, then print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback: open in new window
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }

    // Clean up after a delay (print dialog blocks execution)
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, delay);
}

/**
 * Format date for print documents (DD/MM/YYYY)
 */
export function formatPrintDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format currency for print documents (INR)
 */
export function formatPrintCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}
