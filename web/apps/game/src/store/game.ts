import type { ResourceGains } from '@glitch/contracts';
import { create } from 'zustand';

// UI normalization ceiling: total_entropy mapped to glitch intensity 1.0.
// Tuned for demo scale (dozens of decaying meals); backend keeps its own
// economy_config value for any server-side use.
export const GLITCH_CEILING = 20;

export function glitchFromEntropy(total: number, ceiling: number = GLITCH_CEILING): number {
  if (ceiling <= 0) return 0;
  return Math.min(Math.max(total / ceiling, 0), 1);
}

export interface FeedItem {
  id: number;
  kind: 'sys' | 'unlock' | 'credit' | 'entropy' | 'node' | 'bounty' | 'purity';
  text: string;
  ts: number;
}

export interface UnlockFx {
  txnId: string;
  nodeId: string;
}

export interface CreditFx extends ResourceGains {
  xp: number;
}

interface GameState {
  totalEntropy: number;
  nodeEntropies: Record<string, number>;
  glitch: number;
  selectedNodeId: string | null;
  unlockFx: UnlockFx | null;
  creditFx: CreditFx | null;
  purityTxn: number | null;
  feed: FeedItem[];

  selectNode: (id: string | null) => void;
  setEntropy: (total: number, perNode: Record<string, number>) => void;
  triggerUnlock: (fx: UnlockFx) => void;
  clearUnlock: () => void;
  triggerCredit: (fx: CreditFx) => void;
  clearCredit: () => void;
  setPurity: (txn: number | null) => void;
  pushFeed: (kind: FeedItem['kind'], text: string) => void;
}

let feedId = 0;

export const useGame = create<GameState>((set) => ({
  totalEntropy: 0,
  nodeEntropies: {},
  glitch: 0,
  selectedNodeId: null,
  unlockFx: null,
  creditFx: null,
  purityTxn: null,
  feed: [],

  selectNode: (id) => set({ selectedNodeId: id }),
  setEntropy: (total, perNode) =>
    set({ totalEntropy: total, nodeEntropies: perNode, glitch: glitchFromEntropy(total) }),
  triggerUnlock: (fx) => set({ unlockFx: fx }),
  clearUnlock: () => set({ unlockFx: null }),
  triggerCredit: (fx) => set({ creditFx: fx }),
  clearCredit: () => set({ creditFx: null }),
  setPurity: (txn) => set({ purityTxn: txn }),
  pushFeed: (kind, text) =>
    set((s) => ({
      feed: [{ id: ++feedId, kind, text, ts: Date.now() }, ...s.feed].slice(0, 40),
    })),
}));
