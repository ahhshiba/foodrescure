import { useTranslation } from 'react-i18next';
import type { FeedItem } from '../store/game';
import { useGame } from '../store/game';

const KIND_COLOR: Record<FeedItem['kind'], string> = {
  sys: 'text-zen-light',
  unlock: 'text-zen-primary',
  credit: 'text-zen-accent',
  entropy: 'text-amber-500',
  node: 'text-zen-text',
  bounty: 'text-zen-primary',
  purity: 'text-zen-alert',
};

export function EventFeed() {
  const { t } = useTranslation();
  const feed = useGame((s) => s.feed);
  return (
    <div className="panel flex flex-col max-h-96 rounded-xl p-4 bg-white border border-zen-border shadow-sm">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zen-text">
        {t('feed.title')}
      </h2>
      <div className="space-y-1.5 overflow-y-auto pr-2 custom-scrollbar text-[11px] font-medium">
        {feed.length === 0 && <div className="text-zen-light italic">{t('feed.awaiting')}</div>}
        {feed.map((item) => (
          <div key={item.id} className={KIND_COLOR[item.kind]}>
            <span className="text-zen-light mr-1">
              {new Date(item.ts).toLocaleTimeString([], { hour12: false })}{' '}
            </span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
