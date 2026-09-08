import type { GroupData } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

type IndexedGroup = {
  id: string;
  chainAddress: string;
  name: string;
  description: string;
  targetLamports: string;
  currentLamports: string;
  currency: 'SOL';
  visibility: 'public' | 'private';
  votingThresholdBps: number;
  memberCount: number;
  createdAt: string;
};

function indexedToGroup(group: IndexedGroup): GroupData {
  return {
    id: group.chainAddress,
    name: group.name,
    description: group.description,
    createdBy: 'Community creator',
    createdAvatarColor: '#00d4e6',
    requiredAmount: Number(group.targetLamports) / 1_000_000_000,
    currentBalance: Number(group.currentLamports) / 1_000_000_000,
    currency: group.currency,
    visibility: group.visibility,
    members: [],
    memberCount: group.memberCount,
    activeProposals: 0,
    contributions: [],
    governance: 'democratic',
    votingThreshold: group.votingThresholdBps / 100,
    createdAt: new Date(group.createdAt).toLocaleDateString(),
  };
}

export async function fetchIndexedGroups(signal?: AbortSignal): Promise<GroupData[]> {
  const response = await fetch(`${API_BASE}/api/v1/groups`, { signal });
  if (!response.ok) throw new Error(`Indexer returned ${response.status}`);
  const groups = await response.json() as IndexedGroup[];
  return groups.map(indexedToGroup);
}

export async function publishChainEvent(event: {
  type: string;
  groupId: string;
  groupAddress: string;
  signature: string;
  name: string;
  description: string;
  amountLamports: string;
  currency: string;
  visibility: string;
  thresholdBps: number;
  proposalId?: string;
  proposalAddress?: string;
  title?: string;
  recipient?: string;
  votingDeadline?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE}/internal/v1/chain-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error(`Indexer rejected chain event (${response.status}).`);
}

export function subscribeToIndexer(onActivity: (event: { groupId: string; type: string; message: string }) => void): () => void {
  if (typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource(`${API_BASE}/api/v1/realtime`);
  source.addEventListener('activity', event => {
    try { onActivity(JSON.parse((event as MessageEvent).data)); } catch { /* ignore malformed indexer events */ }
  });
  return () => source.close();
}

export { API_BASE };
