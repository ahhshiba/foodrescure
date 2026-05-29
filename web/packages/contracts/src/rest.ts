// REST contract — TS mirror of server/app/schemas/rest.py (§5.2).

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ClaimCardRequest {
  rfid: string;
  claim_code: string;
}

export interface NanosOut {
  nanos_type: string;
  level: number;
}

export interface MeResponse {
  id: number;
  username: string;
  level: number;
  xp: number;
  protein: number;
  carbs: number;
  lipids: number;
}

export interface InventoryResponse {
  protein: number;
  carbs: number;
  lipids: number;
  nanos: NanosOut[];
}

export interface UpgradeResponse {
  nanos_type: string;
  new_level: number;
  spent: Record<string, number>;
}

export interface FoodOut {
  id: number;
  food_class: string;
  display_name_zh: string | null;
  health: number;
  spoiled: boolean;
  claimed: boolean;
  reserved: boolean;
  reserved_by: number | null;
}

export interface NodeOut {
  id: string;
  name: string;
  location: string;
  status: string;
  last_heartbeat: string | null;
  lat: number | null;
  lng: number | null;
  tailscale_ip: string | null;
  entropy: number;
  health_avg: number;
}

export interface NodeDetail extends NodeOut {
  foods: FoodOut[];
}

export interface SalvageRequest {
  count: number;
}

export interface SalvageResponse {
  txn_id: string;
  gains: Record<string, number>;
  xp: number;
  claimed: number;
}

export interface BountyOut {
  id: number;
  spec_json: Record<string, unknown>;
  reward_json: Record<string, unknown>;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface FeedbackRequest {
  transaction_id: number;
  purity_stars: number;
}

export interface EsgStats {
  co2_saved_g: number;
  money_saved: number;
  meals_rescued: number;
}

export interface EntropyPoint {
  ts: string;
  total_entropy: number;
}

export interface EntropyStats {
  total_entropy: number;
  series: EntropyPoint[];
}

export interface FleetAccuracy {
  accuracy: number;
  sample_size: number;
}

export interface LeaderboardEntry {
  username: string;
  xp: number;
  level: number;
}

export interface TransactionOut {
  txn_id: string;
  node_id: string;
  items_json: Array<Record<string, unknown>>;
  gains_json: Record<string, unknown>;
  xp_awarded: number;
  created_at: string;
}

export interface Page<T = unknown> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ErrorResponse {
  detail: string;
}
