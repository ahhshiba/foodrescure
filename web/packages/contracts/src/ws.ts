// WebSocket contract — TS mirror of server/app/schemas/ws.py (§5.3).

export type WSEventType =
  | 'unlock_success'
  | 'resource_credited'
  | 'entropy_update'
  | 'node_status_update'
  | 'bounty_new'
  | 'bounty_completed'
  | 'purity_prompt';

export interface UnlockSuccess {
  txn_id: string;
  node_id: string;
}

export interface ResourceGains {
  protein: number;
  carbs: number;
  lipids: number;
}

export interface ResourceCredited {
  txn_id: string;
  gains: ResourceGains;
  xp: number;
}

export interface EntropyUpdate {
  total_entropy: number;
  node_entropies: Record<string, number>;
}

export interface NodeStatusUpdate {
  node_id: string;
  status: string;
  health_avg: number;
}

export interface BountyNew {
  bounty: Record<string, unknown>;
}

export interface BountyCompleted {
  bounty_id: number;
}

export interface PurityPrompt {
  transaction_id: number;
}

// Tagged envelope every server->client message uses.
export interface WSEnvelope<T = unknown> {
  type: WSEventType;
  data: T;
}

// Discriminated map for type-narrowing on the client.
export interface WSEventMap {
  unlock_success: UnlockSuccess;
  resource_credited: ResourceCredited;
  entropy_update: EntropyUpdate;
  node_status_update: NodeStatusUpdate;
  bounty_new: BountyNew;
  bounty_completed: BountyCompleted;
  purity_prompt: PurityPrompt;
}

// Client -> server.
export type WSClientMessage =
  | { type: 'subscribe'; channels: string[] }
  | { type: 'ping' };
