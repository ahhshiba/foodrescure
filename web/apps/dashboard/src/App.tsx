import { useTranslation } from 'react-i18next';
import { EntropyChart } from './components/EntropyChart';
import { FleetGauge } from './components/FleetGauge';
import { Kpi } from './components/Kpi';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Leaderboard } from './components/Leaderboard';
import { NodeTopology } from './components/NodeTopology';
import { TxnFeed } from './components/TxnFeed';

export default function App() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neon-green">{t('header.title')}</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-cyan/60">
            {t('header.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neon-cyan/70">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-neon-green" />
            {t('header.live')}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <Kpi />

      <main className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <section className="col-span-5 flex flex-col gap-4">
          <EntropyChart />
          <NodeTopology />
        </section>
        <section className="col-span-4 flex flex-col gap-4">
          <FleetGauge />
          <TxnFeed />
        </section>
        <section className="col-span-3">
          <Leaderboard />
        </section>
      </main>
    </div>
  );
}
