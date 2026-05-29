import type {
  BountyOut,
  InventoryResponse,
  MeResponse,
  NodeOut,
  SalvageResponse,
  UpgradeResponse,
} from '@glitch/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useAuth } from '../store/auth';

export function useMe() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/me', { token }),
    enabled: !!token,
  });
}

export function useMyReservations() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: ['my_reservations'],
    queryFn: () => api<any[]>('/me/reservations', { token }),
    enabled: !!token,
    refetchInterval: 5000,
  });
}

export function useCancelReservation() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) =>
      api<{ status: string; message: string }>(`/nodes/${nodeId}/cancel_reservation`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_reservations'] });
      qc.invalidateQueries({ queryKey: ['node'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useBindCard() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rfid: string) =>
      api<MeResponse>('/cards/bind', { method: 'POST', token, body: { rfid } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useInventory() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => api<InventoryResponse>('/inventory', { token }),
    enabled: !!token,
  });
}

export function useNodes() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: ['nodes'],
    queryFn: () => api<NodeOut[]>('/nodes', { token }),
    enabled: !!token,
    refetchInterval: 15_000,
  });
}

export function useBounties() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: ['bounties'],
    queryFn: () => api<BountyOut[]>('/bounties', { token }),
    enabled: !!token,
  });
}

export function useUpgradeNanos() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nanosType: string) =>
      api<UpgradeResponse>(`/nanos/${nanosType}/upgrade`, { method: 'POST', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useClaimBounty() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bountyId: number) =>
      api<BountyOut>(`/bounties/${bountyId}/claim`, { method: 'POST', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bounties'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useSalvage() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) =>
      api<SalvageResponse>(`/nodes/${nodeId}/salvage`, {
        method: 'POST',
        token,
        body: { count: 1 },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nodes'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useSubmitFeedback() {
  const token = useAuth((s) => s.token);
  return useMutation({
    mutationFn: (vars: { transaction_id: number; purity_stars: number }) =>
      api<{ status: string }>('/feedback', { method: 'POST', token, body: vars }),
  });
}
