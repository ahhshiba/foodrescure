import type {
  BountyCompleted,
  EntropyUpdate,
  NodeStatusUpdate,
  PurityPrompt,
  ResourceCredited,
  UnlockSuccess,
  WSEnvelope,
} from '@glitch/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import i18n from '../i18n';
import { playUnlock } from '../lib/audio';
import { useAuth } from '../store/auth';
import { useGame } from '../store/game';

const tr = i18n.t.bind(i18n);

/**
 * Opens the authenticated WebSocket and routes server events into the game
 * store + react-query cache. Reconnects with exponential backoff.
 */
export function useGameSocket(): void {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    let closed = false;
    let backoff = 500;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket | undefined;

    const g = useGame.getState;

    const dispatch = (env: WSEnvelope) => {
      switch (env.type) {
        case 'unlock_success': {
          const d = env.data as UnlockSuccess;
          g().triggerUnlock({ txnId: d.txn_id, nodeId: d.node_id });
          g().pushFeed('unlock', tr('feed.unlock', { node: d.node_id }));
          playUnlock();
          break;
        }
        case 'resource_credited': {
          const d = env.data as ResourceCredited;
          g().triggerCredit({ ...d.gains, xp: d.xp });
          g().pushFeed(
            'credit',
            tr('feed.credit', {
              p: d.gains.protein,
              c: d.gains.carbs,
              l: d.gains.lipids,
              xp: d.xp,
            }),
          );
          qc.invalidateQueries({ queryKey: ['me'] });
          qc.invalidateQueries({ queryKey: ['inventory'] });
          qc.invalidateQueries({ queryKey: ['nodes'] });
          qc.invalidateQueries({ queryKey: ['my_reservations'] });
          break;
        }
        case 'entropy_update': {
          const d = env.data as EntropyUpdate;
          g().setEntropy(d.total_entropy, d.node_entropies);
          break;
        }
        case 'node_status_update': {
          const d = env.data as NodeStatusUpdate;
          g().pushFeed(
            'node',
            tr('feed.node', {
              node: d.node_id,
              status: d.status.toUpperCase(),
              hp: d.health_avg,
            }),
          );
          qc.invalidateQueries({ queryKey: ['nodes'] });
          break;
        }
        case 'bounty_new':
          g().pushFeed('bounty', tr('feed.bountyNew'));
          qc.invalidateQueries({ queryKey: ['bounties'] });
          break;
        case 'bounty_completed': {
          const d = env.data as BountyCompleted;
          g().pushFeed('bounty', tr('feed.bountyDone', { id: d.bounty_id }));
          qc.invalidateQueries({ queryKey: ['bounties'] });
          break;
        }
        case 'purity_prompt': {
          const d = env.data as PurityPrompt;
          g().setPurity(d.transaction_id);
          g().pushFeed('purity', tr('feed.purity'));
          break;
        }
      }
    };

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws?token=${token}`);
      ws.onopen = () => {
        backoff = 500;
        ws?.send(JSON.stringify({ type: 'subscribe', channels: ['all'] }));
        g().pushFeed('sys', tr('feed.uplink'));
      };
      ws.onmessage = (e) => {
        try {
          dispatch(JSON.parse(e.data) as WSEnvelope);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        g().pushFeed('sys', tr('feed.uplinkLost', { s: Math.round(backoff / 1000) }));
        timer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 10_000);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [token, qc]);
}
