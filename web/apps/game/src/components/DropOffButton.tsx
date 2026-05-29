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
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30 flex items-center gap-2">
      {thumb && (
        <img
          src={thumb}
          alt="drop-off"
          className="h-10 w-10 rounded border border-neon-cyan/60 object-cover shadow-neon"
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
        className="rounded-full bg-neon-magenta/20 px-4 py-2 text-sm font-bold text-neon-magenta ring-1 ring-neon-magenta shadow-magenta hover:bg-neon-magenta/30 disabled:opacity-50"
      >
        📷 {t('dropoff.button')}
      </button>
    </div>
  );
}
