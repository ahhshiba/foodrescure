// MQTT contract — TS mirror of server/app/schemas/mqtt.py (§5.1, FROZEN).
// The backend owns the canonical Pydantic version; keep these in lockstep.

export interface AuthRequest {
  rfid: string;
  node_id: string;
  ts: string; // ISO-8601
}

export interface LockCommand {
  action: 'unlock';
  duration_s: number;
  txn_id: string;
}

export interface StatusItem {
  class: string;
  count: number;
  confidence: number;
}

export interface StatusReport {
  txn_id: string;
  node_id: string;
  items: StatusItem[];
  image_ref: string | null;
  ts: string;
}

export interface Heartbeat {
  node_id: string;
  ts: string;
  fw: string;
}

export interface LastWill {
  node_id: string;
  status: 'offline';
}
