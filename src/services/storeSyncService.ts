import { supabase } from "@/integrations/supabase/client";
import type { MetricPeriodNode } from "@/types/metric";
import type { MockStore } from "./storage";

type Timestamped = { id: string; updatedAt?: string; createdAt?: string };

function entityTimestamp(item: Timestamped): number {
  const raw = item.updatedAt ?? item.createdAt;
  if (!raw) return 0;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function mergeByTimestamp<T extends Timestamped>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of remote) {
    map.set(item.id, item);
  }

  for (const item of local) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    map.set(item.id, entityTimestamp(item) >= entityTimestamp(existing) ? item : existing);
  }

  return [...map.values()];
}

function mergeMetricTrees(
  local: Record<string, MetricPeriodNode[]>,
  remote: Record<string, MetricPeriodNode[]>,
  localProjects: MockStore["projects"],
  remoteProjects: MockStore["projects"],
): Record<string, MetricPeriodNode[]> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, MetricPeriodNode[]> = {};

  for (const key of keys) {
    const localTree = local[key];
    const remoteTree = remote[key];

    if (!localTree && remoteTree) {
      out[key] = remoteTree;
      continue;
    }
    if (localTree && !remoteTree) {
      out[key] = localTree;
      continue;
    }
    if (!localTree || !remoteTree) continue;

    const localProj = localProjects.find((p) => p.id === key);
    const remoteProj = remoteProjects.find((p) => p.id === key);
    const localTs = localProj ? entityTimestamp(localProj) : 0;
    const remoteTs = remoteProj ? entityTimestamp(remoteProj) : 0;
    out[key] = localTs >= remoteTs ? localTree : remoteTree;
  }

  return out;
}

function filterByProjectIds<T extends { projectId: string }>(items: T[], projectIds: Set<string>): T[] {
  return items.filter((item) => projectIds.has(item.projectId));
}

function filterByFunnelIds<T extends { funnelId: string }>(items: T[], funnelIds: Set<string>): T[] {
  return items.filter((item) => funnelIds.has(item.funnelId));
}

function normalizeRemoteStore(raw: unknown): MockStore | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<MockStore>;
  if (!parsed.user || !Array.isArray(parsed.projects)) return null;

  return {
    user: parsed.user,
    projects: parsed.projects ?? [],
    reports: parsed.reports ?? [],
    metricTrees: parsed.metricTrees ?? {},
    funnels: parsed.funnels ?? [],
    materials: parsed.materials ?? [],
    funnelMetrics: parsed.funnelMetrics ?? [],
    auditFindings: parsed.auditFindings ?? [],
    hypotheses: parsed.hypotheses ?? [],
    experiments: parsed.experiments ?? [],
  };
}

export function mergeStores(
  local: MockStore,
  remote: MockStore,
  scope: { userId: string; email?: string | null; name?: string | null },
): MockStore {
  const projects = mergeByTimestamp(local.projects, remote.projects);
  const projectIds = new Set(projects.map((p) => p.id));

  const funnels = filterByProjectIds(mergeByTimestamp(local.funnels, remote.funnels), projectIds);
  const funnelIds = new Set(funnels.map((f) => f.id));

  const merged: MockStore = {
    user: {
      ...remote.user,
      ...local.user,
      id: scope.userId,
      email: scope.email ?? local.user.email ?? remote.user.email,
      name: scope.name ?? local.user.name ?? remote.user.name,
    },
    projects: projects.map((p) => ({ ...p, userId: scope.userId })),
    reports: filterByProjectIds(mergeByTimestamp(local.reports, remote.reports), projectIds),
    metricTrees: mergeMetricTrees(
      local.metricTrees,
      remote.metricTrees,
      local.projects,
      remote.projects,
    ),
    funnels,
    materials: filterByFunnelIds(mergeByTimestamp(local.materials, remote.materials), funnelIds),
    funnelMetrics: filterByFunnelIds(
      mergeByTimestamp(local.funnelMetrics, remote.funnelMetrics),
      funnelIds,
    ),
    auditFindings: filterByFunnelIds(
      mergeByTimestamp(local.auditFindings, remote.auditFindings),
      funnelIds,
    ),
    hypotheses: filterByFunnelIds(mergeByTimestamp(local.hypotheses, remote.hypotheses), funnelIds),
    experiments: filterByFunnelIds(
      mergeByTimestamp(local.experiments, remote.experiments),
      funnelIds,
    ),
  };

  return merged;
}

export function storesEqual(a: MockStore, b: MockStore): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function pullRemoteStore(): Promise<MockStore | null> {
  const { data, error } = await supabase.rpc("get_user_data_store");

  if (error) {
    console.warn("get_user_data_store failed", error);
    return null;
  }

  if (!data || (typeof data === "object" && Object.keys(data as object).length === 0)) {
    return null;
  }

  return normalizeRemoteStore(data);
}

export async function pushRemoteStore(store: MockStore): Promise<boolean> {
  const { error } = await supabase.rpc("upsert_user_data_store", {
    p_store: store,
  });

  if (error) {
    console.warn("upsert_user_data_store failed", error);
    return false;
  }

  return true;
}
