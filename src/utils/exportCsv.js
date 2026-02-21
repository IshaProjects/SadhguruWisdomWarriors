/**
 * Converts an array of objects to a CSV string and triggers a browser download.
 * @param {string}   filename - Filename without extension
 * @param {string[]} headers  - Column header labels (in order)
 * @param {Array}    rows     - Array of value arrays matching header order
 */
export function exportToCsv(filename, headers, rows) {
  const escape = (v) => {
    if (v == null) return '';
    const str = String(v);
    // Wrap in quotes if the value contains commas, quotes, or newlines
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
