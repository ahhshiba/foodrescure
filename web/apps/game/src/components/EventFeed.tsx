import { useTranslation } from 'react-i18next';
import type { FeedItem } from '../store/game';
import { useGame } from '../store/game';

const KIND_COLOR: Record<FeedItem['kind'], string> = {
  sys: 'text-neon-cyan/70',
  unlock: 'text-neon-blue',
  credit: 'text-neon-green',
  entropy: 'text-amber-400',
  node: 'text-neon-cyan',
  bounty: 'text-neon-magenta',
  purity: 'text-neon-magenta',
};

export function EventFeed() {
  const { t } = useTranslation();
  const feed = useGame((s) => s.feed);
  return (
    <div className="panel flex h-full flex-col rounded-lg p-3">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-neon-green">
        {t('feed.title')}
      </h2>
      <div className="flex-1 space-y-1 overflow-y-auto pr-1 text-[11px]">
        {feed.length === 0 && <div className="text-neon-cyan/40">{t('feed.awaiting')}</div>}
        {feed.map((item) => (
          <div key={item.id} className={KIND_COLOR[item.kind]}>
            <span className="text-neon-cyan/40">
              {new Date(item.ts).toLocaleTimeString([], { hour12: false })}{' '}
            </span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
