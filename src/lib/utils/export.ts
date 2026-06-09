'use client';

/**
 * Escapes a CSV cell value: wraps in double quotes if contains comma, newline, or double quote.
 * Double quotes inside the value are escaped by doubling them.
 */
function escapeCSVValue(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Exports data to a CSV file and triggers a browser download.
 * Client-side only.
 *
 * @param headers - Array of column header strings
 * @param rows    - Array of rows; each row is an array of cell values
 * @param filename - Desired filename (without extension)
 */
export function exportToCSV(
  headers: string[],
  rows: (string | number | null)[][],
  filename: string
): void {
  const headerLine = headers.map(escapeCSVValue).join(',');
  const dataLines = rows.map((row) => row.map(escapeCSVValue).join(','));
  const csvContent = [headerLine, ...dataLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Exports data as a CSV file with a BOM prefix so Excel opens it
 * with correct encoding (UTF-8 with BOM).
 * Client-side only.
 *
 * @param headers - Array of column header strings
 * @param rows    - Array of rows; each row is an array of cell values
 * @param filename - Desired filename (without extension)
 */
export function exportToXLSX(
  headers: string[],
  rows: (string | number | null)[][],
  filename: string
): void {
  const headerLine = headers.map(escapeCSVValue).join(',');
  const dataLines = rows.map((row) => row.map(escapeCSVValue).join(','));
  // BOM (\uFEFF) ensures Excel auto-detects UTF-8
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  // Use .csv extension — Excel opens it directly with correct encoding
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
