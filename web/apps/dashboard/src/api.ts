import type {
  EntropyStats,
  EsgStats,
  FleetAccuracy,
  LeaderboardEntry,
  NodeOut,
  Page,
  TransactionOut,
} from '@glitch/contracts';
import { useQuery } from '@tanstack/react-query';

const API = '/api/v1';
const REFRESH = 8_000;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

export const useEsg = () =>
  useQuery({ queryKey: ['esg'], queryFn: () => get<EsgStats>('/stats/esg'), refetchInterval: REFRESH });

export const useEntropy = () =>
  useQuery({
    queryKey: ['entropy'],
    queryFn: () => get<EntropyStats>('/stats/entropy'),
    refetchInterval: REFRESH,
  });

export const useFleet = () =>
  useQuery({
    queryKey: ['fleet'],
    queryFn: () => get<FleetAccuracy>('/stats/fleet-accuracy'),
    refetchInterval: REFRESH,
  });

export const useLeaderboard = () =>
  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => get<LeaderboardEntry[]>('/leaderboard'),
    refetchInterval: REFRESH,
  });

export const useNodes = () =>
  useQuery({ queryKey: ['nodes'], queryFn: () => get<NodeOut[]>('/nodes'), refetchInterval: REFRESH });

export const useTransactions = () =>
  useQuery({
    queryKey: ['transactions'],
    queryFn: () => get<Page>('/transactions?page=1&page_size=12'),
    refetchInterval: REFRESH,
    select: (p) => p.items as unknown as TransactionOut[],
  });
