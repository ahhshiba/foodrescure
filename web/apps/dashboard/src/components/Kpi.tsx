import { useTranslation } from 'react-i18next';
import { useEsg } from '../api';

function Card({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
}) {
  return (
    <div className="panel flex flex-col justify-between p-5">
      <div className="panel-title">{label}</div>
      <div className="mt-3">
        <span className={`text-4xl font-bold ${accent}`}>{value}</span>
        <span className="ml-1 text-sm text-neon-cyan/60">{unit}</span>
      </div>
    </div>
  );
}

export function Kpi() {
  const { t } = useTranslation();
  const { data } = useEsg();
  const co2 = (data?.co2_saved_g ?? 0) / 1000; // kg
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card
        label={t('kpi.co2')}
        value={co2.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        unit={t('kpi.kg')}
        accent="text-neon-green"
      />
      <Card
        label={t('kpi.cost')}
        value={`$${(data?.money_saved ?? 0).toLocaleString()}`}
        unit=""
        accent="text-neon-amber"
      />
      <Card
        label={t('kpi.meals')}
        value={(data?.meals_rescued ?? 0).toLocaleString()}
        unit={t('kpi.mealsUnit')}
        accent="text-neon-cyan"
      />
    </div>
  );
}
