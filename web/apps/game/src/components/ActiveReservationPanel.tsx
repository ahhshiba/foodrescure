import { useMyReservations, useCancelReservation } from '../api/hooks';
import { useTranslation } from 'react-i18next';
import { useGame } from '../store/game';

export function ActiveReservationPanel() {
  const { i18n } = useTranslation();
  const selectNode = useGame((s) => s.selectNode);
  const { data: reservations, isLoading } = useMyReservations();
  const cancelMutation = useCancelReservation();

  if (isLoading || !reservations || reservations.length === 0) {
    return null; // Don't show if there's no reservation
  }

  const res = reservations[0]; // Assuming one active reservation at a time

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm">
      <div className="panel border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-black/90 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Active Reservation</span>
          </div>
          <span className="text-[10px] text-neon-cyan/70 font-mono">NODE: {res.node_id}</span>
        </div>
        
        <div className="text-sm font-bold text-white">
          {i18n.language === 'zh-TW' && res.display_name_zh ? res.display_name_zh : res.food_class}
        </div>
        <div className="text-[10px] text-neon-cyan opacity-80 mb-1">
          請於 20 分鐘內前往機台刷卡領取，否則預約將自動失效。
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => selectNode(res.node_id)}
            className="flex-1 rounded border border-neon-cyan/50 px-2 py-1.5 text-[10px] font-bold text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            前往地圖節點
          </button>
          <button
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (window.confirm('確定要取消此預約嗎？')) {
                cancelMutation.mutate(res.node_id);
              }
            }}
            className="flex-1 rounded border border-neon-magenta/60 px-2 py-1.5 text-[10px] font-bold text-neon-magenta hover:bg-neon-magenta/10 transition-colors"
          >
            {cancelMutation.isPending ? '取消中...' : '取消預約 ✕'}
          </button>
        </div>
      </div>
    </div>
  );
}
