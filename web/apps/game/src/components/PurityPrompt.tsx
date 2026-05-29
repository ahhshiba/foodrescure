import { useState } from 'react';
import { useSubmitFeedback } from '../api/hooks';
import { useGame } from '../store/game';

export function PurityPrompt() {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="panel w-[340px] rounded-lg p-6 text-center shadow-magenta">
        <h2 className="glitch-text mb-1 text-lg font-bold text-neon-magenta">PURITY SCAN</h2>
        <p className="mb-4 text-xs text-neon-cyan">
          Rate the freshness of your last salvage. Your scan trains the fleet model.
        </p>
        <div className="mb-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => send(s)}
              disabled={submit.isPending}
              className={`text-3xl transition ${
                s <= hover ? 'text-neon-green' : 'text-neon-green/30'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <button
          onClick={() => setPurity(null)}
          className="text-[10px] text-neon-cyan/60 hover:underline"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}
