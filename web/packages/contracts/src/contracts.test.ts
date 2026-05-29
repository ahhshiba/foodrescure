import { describe, expect, it } from 'vitest';
import type {
  AuthRequest,
  LockCommand,
  ResourceCredited,
  StatusReport,
  WSEnvelope,
  WSEventMap,
} from './index.js';

// These are compile-time-checked shape assertions; the runtime asserts just
// confirm the objects are constructible and serialize as the backend expects.

describe('MQTT contract shapes', () => {
  it('AuthRequest matches frozen §5.1 fields', () => {
    const msg: AuthRequest = { rfid: '04A1B2C3', node_id: 'node-01', ts: '2026-05-29T10:00:00Z' };
    expect(Object.keys(msg).sort()).toEqual(['node_id', 'rfid', 'ts']);
  });

  it('StatusReport uses the reserved `class` key', () => {
    const report: StatusReport = {
      txn_id: 'txn-1',
      node_id: 'node-01',
      items: [{ class: 'porkchop_bento', count: 2, confidence: 0.93 }],
      image_ref: null,
      ts: '2026-05-29T10:00:05Z',
    };
    expect(report.items[0].class).toBe('porkchop_bento');
  });

  it('LockCommand action is literal "unlock"', () => {
    const cmd: LockCommand = { action: 'unlock', duration_s: 5, txn_id: 'txn-1' };
    expect(cmd.action).toBe('unlock');
  });
});

describe('WS contract shapes', () => {
  it('typed envelope narrows by event type', () => {
    const evt: WSEnvelope<WSEventMap['resource_credited']> = {
      type: 'resource_credited',
      data: { txn_id: 'txn-1', gains: { protein: 30, carbs: 45, lipids: 20 }, xp: 120 },
    };
    const credited: ResourceCredited = evt.data;
    expect(credited.gains.carbs).toBe(45);
  });
});
