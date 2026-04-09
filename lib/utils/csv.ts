/**
 * CSV generation and download utilities
 */

/**
 * Escapes a CSV field value according to CSV spec
 * Values with commas, quotes, or newlines are wrapped in quotes
 * Inner quotes are doubled
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert
 * @returns Complete CSV string with header row and data rows
 */
export function generateCSV(data: Array<Record<string, unknown>>): string {
  if (data.length === 0) {
    return '';
  }

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Create header row
  const headerRow = headers.map(escapeCSVField).join(',');

  // Create data rows
  const dataRows = data.map((row) => {
    return headers.map((header) => escapeCSVField(row[header])).join(',');
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a browser download of a CSV file
 * @param filename - Name of the file to download
 * @param csvContent - CSV content string
 */
export function downloadCSV(filename: string, csvContent: string): void {
  // Create blob from CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create URL object for the blob
  const url = URL.createObjectURL(blob);

  // Create temporary anchor element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);

  // Trigger download
  link.click();

  // Clean up
  URL.revokeObjectURL(url);
}
