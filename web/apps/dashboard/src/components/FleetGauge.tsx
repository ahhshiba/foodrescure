import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useFleet } from '../api';

export function FleetGauge() {
  const { t } = useTranslation();
  const { data } = useFleet();
  const pct = Math.round((data?.accuracy ?? 0) * 100);
  const chart = [{ name: 'accuracy', value: pct, fill: '#39ff14' }];

  return (
    <div className="panel flex flex-col items-center p-4">
      <span className="panel-title self-start">{t('fleet.title')}</span>
      <div className="relative h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={chart}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(5,217,232,0.1)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-neon-green">{pct}%</span>
          <span className="text-[10px] text-neon-cyan/60">n={data?.sample_size ?? 0}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-neon-cyan/50">{t('fleet.caption')}</p>
    </div>
  );
}
