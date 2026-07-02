import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

  const bars = [...monthlyData]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-maxBars)
    .map(({ month, count }) => ({
      month,
      count,
      label: month.slice(5),
    }));

  return (
    <div className="bg-white rounded-xl shadow-card p-4 sm:p-5 border border-gray-200 min-w-0 w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900">Candidatures par mois</h2>
      <p className="mt-1 text-sm text-gray-500">Évolution sur les derniers mois</p>
      <div className="mt-4 w-full min-h-[220px] sm:min-h-[240px]">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bars} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              formatter={(value: number) => [`${value} candidature${value > 1 ? 's' : ''}`, '']}
              labelFormatter={(_, payload) => {
                const month = payload?.[0]?.payload?.month;
                return month ? `Mois ${month}` : '';
              }}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem',
              }}
            />
            <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
