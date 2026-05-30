import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNodes, useSalvage } from '../api/hooks';
import { useGame } from '../store/game';

/**
 * "Drop-off / restock" — any player can snap a photo (rear camera on mobile,
 * file picker on desktop). We don't run real recognition: the capture just
 * triggers the existing virtual-salvage API on the selected/first-online node,
 * which broadcasts the usual WS unlock/credit events (animation reused).
 */
export function DropOffButton() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const { data: nodes = [] } = useNodes();
  const selectedNodeId = useGame((s) => s.selectedNodeId);
  const salvage = useSalvage();

  const pickNode = (): string | null => {
    if (selectedNodeId) return selectedNodeId;
    return nodes.find((n) => n.status === 'online')?.id ?? nodes[0]?.id ?? null;
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumb(URL.createObjectURL(file));
    const nodeId = pickNode();
    if (nodeId) salvage.mutate(nodeId);
    e.target.value = '';
  };

  return (
    <div className="pointer-events-auto fixed bottom-[80px] md:bottom-6 right-4 md:right-6 z-30 flex items-center gap-3">
      {thumb && (
        <img
          src={thumb}
          alt="drop-off"
          className="h-12 w-12 rounded-lg border border-zen-border object-cover shadow-sm bg-white"
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={salvage.isPending}
        className="group relative flex items-center gap-2.5 overflow-hidden rounded-full bg-zen-accent px-6 py-3.5 font-bold text-white shadow-md transition-all hover:bg-zen-accent/90 disabled:opacity-50 ring-1 ring-black/5 hover:shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 lucide lucide-camera">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
        <span className="relative z-10 tracking-wide">{t('dropoff.button')}</span>
      </button>
    </div>
  );
}
