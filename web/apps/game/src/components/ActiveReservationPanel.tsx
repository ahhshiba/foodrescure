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
      <div className="panel border-zen-border shadow-md bg-white rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-bold text-zen-text uppercase tracking-wide">Active Reservation</span>
          </div>
          <span className="text-[10px] text-zen-light">NODE: {res.node_id}</span>
        </div>
        
        <div className="text-sm font-bold text-zen-text">
          {i18n.language === 'zh-TW' && res.display_name_zh ? res.display_name_zh : res.food_class}
        </div>
        <div className="text-[11px] text-zen-light mb-2">
          請於 20 分鐘內前往機台刷卡領取，否則預約將自動失效。
        </div>

        <div className="flex gap-3 mt-1">
          <button
            onClick={() => selectNode(res.node_id)}
            className="flex-1 rounded-lg border border-zen-border bg-[#f8f6f2] px-3 py-2 text-xs font-bold text-zen-text hover:bg-[#f2ece4] transition-colors shadow-sm"
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
            className="flex-1 rounded-lg border border-[#f2dedd] bg-[#fcf1f0] px-3 py-2 text-xs font-bold text-zen-alert hover:bg-[#fae6e5] transition-colors shadow-sm"
          >
            {cancelMutation.isPending ? '取消中...' : '取消預約 ✕'}
          </button>
        </div>
      </div>
    </div>
  );
}
