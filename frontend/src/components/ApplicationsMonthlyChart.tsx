export interface MonthlyApplicationCount {
  month: string;
  count: number;
}

interface ApplicationsMonthlyChartProps {
  monthlyData: MonthlyApplicationCount[];
  maxBars?: number;
}

export function ApplicationsMonthlyChart({ monthlyData, maxBars = 12 }: ApplicationsMonthlyChartProps) {
  if (monthlyData.length === 0) {
    return null;
  }

  const bars = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month)).slice(-maxBars);
  const maxCount = Math.max(...bars.map((m) => m.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-card p-4 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidatures par mois</h2>
      <div className="flex items-end gap-1 h-32">
        {bars.map(({ month, count }) => {
          const pct = (count / maxCount) * 100;
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-1" title={`${month}: ${count}`}>
              <div
                className="w-full bg-gray-200 rounded-t flex flex-col justify-end"
                style={{ height: '100%' }}
              >
                <div
                  className="bg-primary-500 rounded-t transition-all min-h-[4px]"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 truncate w-full text-center">{month.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
