import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PIPELINE_COLUMNS } from '../utils/applicationStatus';

export interface ApplicationsStatusChartProps {
  counts: Record<string, number>;
  total?: number;
  title?: string;
}

export function ApplicationsStatusChart({
  counts,
  total,
  title = 'Répartition par statut',
}: ApplicationsStatusChartProps) {
  const computedTotal =
    total ?? PIPELINE_COLUMNS.reduce((sum, col) => sum + (counts[col.key] ?? 0), 0);

  const data = PIPELINE_COLUMNS.map(({ key, label, color }) => ({
    key,
    name: label,
    value: counts[key] ?? 0,
    color,
  })).filter((item) => item.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-card p-4 sm:p-5 border border-gray-200 min-w-0 w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {computedTotal} candidature{computedTotal > 1 ? 's' : ''} au total
      </p>

      {computedTotal === 0 || data.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500 text-center py-12">
          Aucune candidature à afficher pour le moment.
        </p>
      ) : (
        <div className="mt-4 w-full min-h-[260px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="78%"
                paddingAngle={data.length > 1 ? 2 : 0}
                stroke="#fff"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} (${computedTotal > 0 ? Math.round((value / computedTotal) * 100) : 0} %)`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.875rem',
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '0.75rem' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
