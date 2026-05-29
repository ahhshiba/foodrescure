import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useEntropy } from '../api';

export function EntropyChart() {
  const { t } = useTranslation();
  const { data } = useEntropy();
  const points = (data?.series ?? []).map((p) => ({
    ts: new Date(p.ts).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit' }),
    entropy: p.total_entropy,
  }));

  return (
    <div className="panel flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="panel-title">{t('entropy.title')}</span>
        <span className="text-sm font-bold text-neon-magenta">{data?.total_entropy.toFixed(2)}</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="rgba(5,217,232,0.1)" />
            <XAxis dataKey="ts" tick={{ fill: '#5ad', fontSize: 9 }} minTickGap={48} />
            <YAxis tick={{ fill: '#5ad', fontSize: 9 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="entropy"
              stroke="#ff2a6d"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
