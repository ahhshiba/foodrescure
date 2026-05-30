import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubmitFeedback } from '../api/hooks';
import { useGame } from '../store/game';

export function PurityPrompt() {
  const { t } = useTranslation();
  const purityTxn = useGame((s) => s.purityTxn);
  const setPurity = useGame((s) => s.setPurity);
  const submit = useSubmitFeedback();
  const [hover, setHover] = useState(0);

  if (purityTxn == null) return null;

  const send = (stars: number) => {
    submit.mutate(
      { transaction_id: purityTxn, purity_stars: stars },
      { onSuccess: () => setPurity(null), onSettled: () => setHover(0) },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="panel w-[340px] rounded-2xl p-8 text-center bg-white border-zen-border shadow-md">
        <h2 className="mb-2 text-xl font-bold text-zen-text">{t('purity.title')}</h2>
        <p className="mb-6 text-sm text-zen-light">{t('purity.desc')}</p>
        <div className="mb-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => send(s)}
              disabled={submit.isPending}
              className={`text-4xl transition-colors ${
                s <= hover ? 'text-amber-400' : 'text-[#eae5de]'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <button
          onClick={() => setPurity(null)}
          className="text-xs text-zen-light hover:text-zen-text hover:underline transition-colors mt-2"
        >
          {t('purity.dismiss')}
        </button>
      </div>
    </div>
  );
}
