import { beforeEach, describe, expect, it } from 'vitest';
import { GLITCH_CEILING, glitchFromEntropy, useGame } from './game';

describe('glitchFromEntropy', () => {
  it('clamps to 0..1', () => {
    expect(glitchFromEntropy(0)).toBe(0);
    expect(glitchFromEntropy(-5)).toBe(0);
    expect(glitchFromEntropy(GLITCH_CEILING)).toBe(1);
    expect(glitchFromEntropy(GLITCH_CEILING * 2)).toBe(1);
    expect(glitchFromEntropy(GLITCH_CEILING / 2)).toBeCloseTo(0.5);
  });
});

describe('game store', () => {
  beforeEach(() => {
    useGame.setState({
      totalEntropy: 0,
      nodeEntropies: {},
      glitch: 0,
      selectedNodeId: null,
      unlockFx: null,
      creditFx: null,
      purityTxn: null,
      feed: [],
    });
  });

  it('setEntropy updates glitch intensity', () => {
    useGame.getState().setEntropy(GLITCH_CEILING / 2, { 'node-01': 5 });
    expect(useGame.getState().glitch).toBeCloseTo(0.5);
    expect(useGame.getState().nodeEntropies['node-01']).toBe(5);
  });

  it('unlock/credit fx set and clear', () => {
    useGame.getState().triggerUnlock({ txnId: 't1', nodeId: 'node-01' });
    expect(useGame.getState().unlockFx?.txnId).toBe('t1');
    useGame.getState().clearUnlock();
    expect(useGame.getState().unlockFx).toBeNull();

    useGame.getState().triggerCredit({ protein: 1, carbs: 2, lipids: 3, xp: 10 });
    expect(useGame.getState().creditFx?.xp).toBe(10);
    useGame.getState().clearCredit();
    expect(useGame.getState().creditFx).toBeNull();
  });

  it('feed keeps newest first and caps at 40', () => {
    for (let i = 0; i < 45; i++) useGame.getState().pushFeed('sys', `e${i}`);
    const feed = useGame.getState().feed;
    expect(feed).toHaveLength(40);
    expect(feed[0].text).toBe('e44');
  });
});
