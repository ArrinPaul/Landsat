
import type { MetricData, GroundTruthDataPoint } from "@/lib/types";

export function parseCsv(csvText: string, t: (key: string) => string): GroundTruthDataPoint[] | { error: string } {
  try {
    const rows = csvText.trim().split(/\r?\n/);
    const header = rows.shift()?.toLowerCase().split(',') || [];
    const dateIndex = header.indexOf('date');
    const valueIndex = header.indexOf('value');

    if (dateIndex === -1 || valueIndex === -1) {
      return { error: t('dashboard.csv.error.columns') };
    }

    return rows.map(row => {
      const columns = row.split(',');
      return {
        date: columns[dateIndex],
        value: parseFloat(columns[valueIndex]),
      };
    }).filter(p => !isNaN(p.value) && p.date);
  } catch (e) {
    return { error: t('dashboard.csv.error.parse') };
  }
}

export function generateCsv(data: MetricData[], t: (key: string) => string): string {
  if (!data.length) return "";

  const headers = [
    t('dashboard.metrics.table.metric'),
    t('dashboard.metrics.table.start'),
    t('dashboard.metrics.table.end'),
    t('dashboard.metrics.table.change'),
    t('dashboard.metrics.table.points')
  ].join(',');

  const rows = data.map(metric => 
    [
      metric.name,
      metric.firstValue?.toFixed(4) ?? 'N/A',
      metric.lastValue?.toFixed(4) ?? 'N/A',
      metric.percentageChange?.toFixed(2) ?? 'N/A',
      metric.n
    ].join(',')
  );

  return [headers, ...rows].join('\n');
}

export function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
