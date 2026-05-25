import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createInitialStore } from "@/data/mock/seed";
import {
  canCreateProject,
  createBlankProject,
  createProjectFromIntake,
  getProjectById,
  getProjects,
  updateProject,
} from "@/services/projectService";
import {
  generateMockReport,
  getRecentReports,
  getReportById,
  getReportsByProject,
  saveReport,
} from "@/services/reportService";
import {
  changePlan,
  getCurrentPlan,
  getMaxProjectsForPlan,
  purchaseCredits,
} from "@/services/billingService";
import { getMetricTree } from "@/services/metricsService";
import {
  createFunnel,
  getFunnelById,
  getFunnelsByProject,
  patchAudienceDetails,
  patchConstraints,
  patchFunnelDetails,
  patchProductDetails,
  setWizardStep,
  updateFunnel,
} from "@/services/funnelService";
import {
  createMaterial,
  getMaterialsByFunnel,
  removeMaterial,
  updateMaterial,
} from "@/services/materialService";
import {
  createFinding,
  getFindingsByFunnel,
  removeFinding,
  runMockAudit,
  type CreateFindingInput,
} from "@/services/auditService";
import {
  createFunnelMetric,
  getMetricsByFunnel,
  recomputeAllFunnelMetrics,
  removeFunnelMetric,
  updateFunnelMetric,
} from "@/services/funnelMetricService";
import {
  createHypothesis,
  generateHypothesesForFunnel,
  generateHypothesesForMetric,
  generateAiHypothesesForMetric,
  getHypothesesByFunnel,
  getHypothesisById,
  getTestingHypotheses,
  importHypothesesFromAudit,
  importHypothesesFromAuditForMetric,
  finalizeHypothesisSelection,
  topHypothesesForMetric,
  moveHypothesisStatus,
  removeHypothesis,
  updateHypothesis,
} from "@/services/hypothesisService";
import {
  buildFunnelAuditPayload,
  getFunnelAuditSnapshot,
  saveFunnelAuditSnapshot,
} from "@/services/funnelAuditService";
import { runFunnelAuditApi } from "@/services/funnelAuditApi";
import { normalizeFunnelAudit } from "@/lib/normalizeFunnelAudit";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { buildAuditSyncSnapshot } from "@/utils/auditSync";
import {
  finishExperiment,
  getExperimentByHypothesis,
  getExperimentsByFunnel,
  startExperiment,
  updateExperiment,
} from "@/services/experimentService";
import { applyFunnelType, seedRequiredMetrics } from "@/services/funnelTypeService";

import type { CreateProjectFromIntakeInput, Project } from "@/types/project";
import type { AIReport, AIReportType } from "@/types/ai-report";
import type { PlanId } from "@/types/user";
import type {
  AudienceDetails,
  CreateFunnelFocusInput,
  Funnel,
  FunnelConstraints,
  FunnelDetails,
  ProductDetails,
} from "@/types/funnel";
import type { CreateMaterialInput, Material } from "@/types/material";
import type { AuditFinding } from "@/types/audit";
import type { FunnelAuditHypothesisDraft, FunnelAuditSnapshot } from "@/types/funnelAudit";
import type { FunnelMetric, FunnelMetricInput } from "@/types/funnelMetric";
import type {
  Hypothesis,
  HypothesisInput,
  HypothesisStatus,
} from "@/types/hypothesis";
import type { FunnelStageDefinition, FunnelTypeId } from "@/types/funnelType";
import { loadStore, saveStore, setStorageScope, type MockStore } from "@/services/storage";
import { useAuth } from "@/hooks/useAuth";
import { logProjectActivity, resolveProjectIdForFunnel, syncAllProjectsToRemote, syncProjectToRemote } from "@/services/projectSyncService";
import { BILLING_ENABLED } from "@/lib/productFlags";

type AppDataContextValue = {
  store: MockStore;
  user: MockStore["user"];
  refresh: () => void;

  // Projects
  projects: Project[];
  getProject: (projectId: string) => Project | null;
  createProject: (input: CreateProjectFromIntakeInput) => Project | null;
  createEmptyProject: (name: string) => Project | null;
  patchProject: (projectId: string, patch: Partial<Project>) => Project | null;

  // Billing
  currentPlan: ReturnType<typeof getCurrentPlan>;
  maxProjects: number;
  canAddProject: boolean;
  setPlan: (planId: PlanId) => void;
  buyCredits: (packId: string) => boolean;

  // Legacy reports
  recentReports: AIReport[];
  projectReports: (projectId: string) => AIReport[];
  getReport: (reportId: string) => AIReport | null;
  runReport: (projectId: string, type: AIReportType, creditCost: number) => ReturnType<typeof generateMockReport>;
  markReportSaved: (reportId: string) => void;
  metricTree: (projectId: string) => ReturnType<typeof getMetricTree>;

  // Funnels
  projectFunnels: (projectId: string) => Funnel[];
  getFunnel: (funnelId: string) => Funnel | null;
  createFunnelFocus: (input: CreateFunnelFocusInput) => Funnel;
  updateFunnelPatch: (funnelId: string, patch: Partial<Funnel>) => Funnel | null;
  setFunnelStep: (funnelId: string, step: number) => Funnel | null;
  applyFunnelTypeAction: (
    funnelId: string,
    typeId: FunnelTypeId,
    customStages?: FunnelStageDefinition[],
  ) => Funnel | null;
  seedFunnelMetrics: (funnelId: string) => number;
  updateProductDetails: (funnelId: string, patch: Partial<ProductDetails>) => Funnel | null;
  updateAudienceDetails: (funnelId: string, patch: Partial<AudienceDetails>) => Funnel | null;
  updateFunnelDetails: (funnelId: string, patch: Partial<FunnelDetails>) => Funnel | null;
  updateConstraints: (funnelId: string, patch: Partial<FunnelConstraints>) => Funnel | null;

  // Materials
  funnelMaterials: (funnelId: string) => Material[];
  addMaterial: (input: CreateMaterialInput) => Material;
  patchMaterial: (materialId: string, patch: Partial<Material>) => Material | null;
  deleteMaterial: (materialId: string) => boolean;

  // Audit
  funnelFindings: (funnelId: string) => AuditFinding[];
  addFinding: (input: CreateFindingInput) => AuditFinding;
  deleteFinding: (id: string) => boolean;
  runAudit: (funnelId: string) => AuditFinding[];
  runFunnelAiAudit: (funnelId: string) => Promise<FunnelAuditSnapshot | null>;
  funnelAuditSnapshot: (funnelId: string) => FunnelAuditSnapshot | null;
  importAuditHypotheses: (funnelId: string) => Hypothesis[];
  importAuditHypothesesDrafts: (funnelId: string, drafts: FunnelAuditHypothesisDraft[]) => Hypothesis[];

  // Funnel metrics
  funnelMetricsList: (funnelId: string) => FunnelMetric[];
  addFunnelMetric: (input: FunnelMetricInput) => FunnelMetric;
  patchFunnelMetric: (id: string, patch: Partial<FunnelMetric>) => FunnelMetric | null;
  deleteFunnelMetric: (id: string) => boolean;

  // Hypotheses
  funnelHypotheses: (funnelId: string) => Hypothesis[];
  testingHypotheses: Hypothesis[];
  getHypothesis: (id: string) => Hypothesis | null;
  addHypothesis: (input: HypothesisInput) => Hypothesis;
  patchHypothesis: (id: string, patch: Partial<Hypothesis>) => Hypothesis | null;
  moveHypothesis: (id: string, status: HypothesisStatus, result?: string | null) => Hypothesis | null;
  deleteHypothesis: (id: string) => boolean;
  generateHypothesesForFunnelAction: (funnelId: string) => Hypothesis[];
  generateHypothesesForMetricAction: (metric: FunnelMetric) => Hypothesis[];
  generateAiHypothesesForMetricAction: (
    funnelId: string,
    metric: FunnelMetric,
  ) => Promise<Hypothesis[]>;
  importAuditHypothesesForMetric: (funnelId: string, metric: FunnelMetric) => Hypothesis[];
  finalizeHypothesisSelectionAction: (
    funnelId: string,
    metricId: string,
    selectedIds: string[],
    patches: Record<string, Partial<Hypothesis>>,
  ) => void;

  // Experiments
  funnelExperiments: (funnelId: string) => Experiment[];
  experimentByHypothesis: (hypothesisId: string) => Experiment | null;
  startExperimentAction: (input: ExperimentInput) => Experiment;
  patchExperiment: (id: string, patch: Partial<Experiment>) => Experiment | null;
  finishExperimentAction: (
    id: string,
    afterValue: string,
    result: string,
    decision: ExperimentDecision,
  ) => Experiment | null;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function initStore(scope: { userId?: string | null; email?: string | null; name?: string | null }): MockStore {
  setStorageScope({ userId: scope.userId });
  const loaded = loadStore();
  if (loaded) {
    if (scope.userId && (loaded.user.id !== scope.userId || (scope.email && loaded.user.email !== scope.email))) {
      loaded.user = {
        ...loaded.user,
        id: scope.userId,
        email: scope.email ?? loaded.user.email,
        name: scope.name ?? loaded.user.name,
      };
    }
    return loaded;
  }
  const fresh = createInitialStore();
  if (scope.userId) {
    fresh.user = {
      ...fresh.user,
      id: scope.userId,
      email: scope.email ?? fresh.user.email,
      name: scope.name ?? fresh.user.name,
    };
  }
  return fresh;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user: authUser, guest } = useAuth();
  const scopeUserId = authUser?.id ?? null;
  const scopeEmail = authUser?.email ?? null;
  const scopeName =
    (authUser?.user_metadata as { name?: string; full_name?: string } | undefined)?.name ||
    (authUser?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    authUser?.email?.split("@")[0] ||
    null;

  const [store, setStore] = useState<MockStore>(() =>
    initStore({ userId: scopeUserId, email: scopeEmail, name: scopeName }),
  );

  useEffect(() => {
    setStorageScope({ userId: scopeUserId });
    const next = initStore({ userId: scopeUserId, email: scopeEmail, name: scopeName });
    setStore(next);
    if (scopeUserId && !guest && next.projects.length > 0) {
      void syncAllProjectsToRemote(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeUserId, guest]);

  const persist = useCallback((next: MockStore) => {
    saveStore(next);
    setStore({ ...next });
  }, []);

  const syncProject = useCallback(
    (project: Project, currentStore: MockStore, event?: { type: string; title: string; description?: string }) => {
      if (!scopeUserId || guest) return;
      void syncProjectToRemote(project, currentStore).then(() => {
        if (event) {
          void logProjectActivity(project.id, event.type, event.title, event.description, {
            completenessScore: project.projectCompletenessScore,
          });
        }
      });
    },
    [scopeUserId, guest],
  );

  const syncProjectForFunnel = useCallback(
    (funnelId: string, currentStore: MockStore) => {
      if (!scopeUserId || guest) return;
      const projectId = resolveProjectIdForFunnel(currentStore, funnelId);
      if (!projectId) return;
      const project = getProjectById(currentStore, projectId);
      if (project) syncProject(project, currentStore);
    },
    [scopeUserId, guest, syncProject],
  );

  const refresh = useCallback(() => {
    setStore((s) => ({ ...s }));
  }, []);

  const value = useMemo<AppDataContextValue>(() => {
    const maxProjects = getMaxProjectsForPlan(store.user.plan);

    return {
      store,
      user: store.user,
      refresh,

      // Projects
      projects: getProjects(store),
      getProject: (id) => getProjectById(store, id),
      createProject: (input) => {
        if (BILLING_ENABLED && !canCreateProject(store, maxProjects)) return null;
        const p = createProjectFromIntake(store, input);
        persist(store);
        syncProject(p, store, { type: "project_created", title: "Проект создан", description: p.projectName });
        return p;
      },
      createEmptyProject: (name) => {
        if (BILLING_ENABLED && !canCreateProject(store, maxProjects)) return null;
        const p = createBlankProject(store, name);
        persist(store);
        syncProject(p, store, { type: "project_created", title: "Проект создан", description: p.projectName });
        return p;
      },
      patchProject: (id, patch) => {
        const p = updateProject(store, id, patch);
        if (p) {
          persist(store);
          syncProject(p, store, { type: "project_updated", title: "Проект обновлён", description: p.projectName });
        }
        return p;
      },

      // Billing
      currentPlan: getCurrentPlan(store),
      maxProjects,
      canAddProject: !BILLING_ENABLED || canCreateProject(store, maxProjects),
      setPlan: (planId) => {
        changePlan(store, planId);
        persist(store);
      },
      buyCredits: (packId) => {
        const ok = purchaseCredits(store, packId);
        if (ok) persist(store);
        return ok;
      },

      // Reports
      recentReports: getRecentReports(store),
      projectReports: (id) => getReportsByProject(store, id),
      getReport: (id) => getReportById(store, id),
      runReport: (projectId, type, cost) => {
        const r = generateMockReport(store, projectId, type, cost);
        if (r.ok) persist(store);
        return r;
      },
      markReportSaved: (id) => {
        saveReport(store, id);
        persist(store);
      },
      metricTree: (projectId) => getMetricTree(store, projectId),

      // Funnels
      projectFunnels: (id) => getFunnelsByProject(store, id),
      getFunnel: (id) => getFunnelById(store, id),
      createFunnelFocus: (input) => {
        const f = createFunnel(store, input);
        persist(store);
        return f;
      },
      updateFunnelPatch: (id, patch) => {
        const f = updateFunnel(store, id, patch);
        if (f) persist(store);
        return f;
      },
      setFunnelStep: (id, step) => {
        const f = setWizardStep(store, id, step);
        if (f) persist(store);
        return f;
      },
      applyFunnelTypeAction: (id, typeId, customStages) => {
        const f = applyFunnelType(store, id, typeId, customStages);
        if (f) persist(store);
        return f;
      },
      seedFunnelMetrics: (id) => {
        const funnel = getFunnelById(store, id);
        if (!funnel?.funnelTypeId) return 0;
        const added = seedRequiredMetrics(store, id, funnel.funnelTypeId);
        persist(store);
        return added;
      },
      updateProductDetails: (id, patch) => {
        const f = patchProductDetails(store, id, patch);
        if (f) persist(store);
        return f;
      },
      updateAudienceDetails: (id, patch) => {
        const f = patchAudienceDetails(store, id, patch);
        if (f) persist(store);
        return f;
      },
      updateFunnelDetails: (id, patch) => {
        const f = patchFunnelDetails(store, id, patch);
        if (f) persist(store);
        return f;
      },
      updateConstraints: (id, patch) => {
        const f = patchConstraints(store, id, patch);
        if (f) persist(store);
        return f;
      },

      // Materials
      funnelMaterials: (id) => getMaterialsByFunnel(store, id),
      addMaterial: (input) => {
        const m = createMaterial(store, input);
        persist(store);
        return m;
      },
      patchMaterial: (id, patch) => {
        const m = updateMaterial(store, id, patch);
        if (m) persist(store);
        return m;
      },
      deleteMaterial: (id) => {
        const ok = removeMaterial(store, id);
        if (ok) persist(store);
        return ok;
      },

      // Audit
      funnelFindings: (id) => getFindingsByFunnel(store, id),
      addFinding: (input) => {
        const f = createFinding(store, input);
        persist(store);
        return f;
      },
      deleteFinding: (id) => {
        const ok = removeFinding(store, id);
        if (ok) persist(store);
        return ok;
      },
      runAudit: (funnelId) => {
        const findings = runMockAudit(store, funnelId);
        persist(store);
        return findings;
      },
      runFunnelAiAudit: async (funnelId) => {
        recomputeAllFunnelMetrics(store, funnelId);
        const payload = buildFunnelAuditPayload(store, funnelId);
        if (!payload) return null;
        const funnel = getFunnelById(store, funnelId);
        if (!funnel) return null;

        const { audit } = await runFunnelAuditApi(payload);
        const report = normalizeFunnelAudit(audit);
        const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? "service_lead");
        const materials = getMaterialsByFunnel(store, funnelId);
        const metrics = getMetricsByFunnel(store, funnelId, funnel.stages?.map((s) => s.id) ?? []);
        const snapshot: FunnelAuditSnapshot = {
          report,
          generatedAt: new Date().toISOString(),
          landingUrl: funnel.landingUrl || undefined,
          materialsCount: payload.materials.length,
          funnelTypeName: typeTemplate.name,
          syncContext: buildAuditSyncSnapshot(funnel, metrics, materials),
        };
        saveFunnelAuditSnapshot(store, funnelId, snapshot);
        runMockAudit(store, funnelId);
        persist(store);
        return snapshot;
      },
      funnelAuditSnapshot: (funnelId) => {
        const f = getFunnelById(store, funnelId);
        return f ? getFunnelAuditSnapshot(f) : null;
      },
      importAuditHypotheses: (funnelId) => {
        const f = getFunnelById(store, funnelId);
        const drafts = f?.auditSnapshot?.report.hypotheses ?? [];
        if (!drafts.length) return [];
        const created = importHypothesesFromAudit(store, funnelId, drafts);
        if (created.length) {
          persist(store);
          syncProjectForFunnel(funnelId, store);
        }
        return created;
      },
      importAuditHypothesesDrafts: (funnelId, drafts) => {
        if (!drafts.length) return [];
        const created = importHypothesesFromAudit(store, funnelId, drafts);
        if (created.length) {
          persist(store);
          syncProjectForFunnel(funnelId, store);
        }
        return created;
      },

      // Funnel metrics
      funnelMetricsList: (id) => {
        const f = getFunnelById(store, id);
        return getMetricsByFunnel(store, id, f?.stages?.map((s) => s.id) ?? []);
      },
      addFunnelMetric: (input) => {
        const m = createFunnelMetric(store, input);
        persist(store);
        return m;
      },
      patchFunnelMetric: (id, patch) => {
        const m = updateFunnelMetric(store, id, patch);
        if (m) persist(store);
        return m;
      },
      deleteFunnelMetric: (id) => {
        const ok = removeFunnelMetric(store, id);
        if (ok) persist(store);
        return ok;
      },

      // Hypotheses
      funnelHypotheses: (id) => getHypothesesByFunnel(store, id),
      testingHypotheses: getTestingHypotheses(store),
      getHypothesis: (id) => getHypothesisById(store, id),
      addHypothesis: (input) => {
        const h = createHypothesis(store, input);
        persist(store);
        syncProjectForFunnel(input.funnelId, store);
        return h;
      },
      patchHypothesis: (id, patch) => {
        const before = getHypothesisById(store, id);
        const h = updateHypothesis(store, id, patch);
        if (h) {
          persist(store);
          syncProjectForFunnel(h.funnelId ?? before?.funnelId ?? "", store);
        }
        return h;
      },
      moveHypothesis: (id, status, result) => {
        const before = getHypothesisById(store, id);
        const h = moveHypothesisStatus(store, id, status, result);
        if (h) {
          persist(store);
          syncProjectForFunnel(h.funnelId ?? before?.funnelId ?? "", store);
        }
        return h;
      },
      deleteHypothesis: (id) => {
        const before = getHypothesisById(store, id);
        const ok = removeHypothesis(store, id);
        if (ok) {
          persist(store);
          if (before) syncProjectForFunnel(before.funnelId, store);
        }
        return ok;
      },
      generateHypothesesForFunnelAction: (funnelId) => {
        const created = generateHypothesesForFunnel(store, funnelId);
        if (created.length) {
          persist(store);
          syncProjectForFunnel(funnelId, store);
        }
        return created;
      },
      generateHypothesesForMetricAction: (metric) => {
        const created = generateHypothesesForMetric(store, metric);
        if (created.length) {
          persist(store);
          syncProjectForFunnel(metric.funnelId, store);
        }
        return created;
      },
      generateAiHypothesesForMetricAction: async (funnelId, metric) => {
        const created = await generateAiHypothesesForMetric(store, funnelId, metric);
        if (created.length) {
          persist(store);
          syncProjectForFunnel(funnelId, store);
        }
        return created;
      },
      importAuditHypothesesForMetric: (funnelId, metric) => {
        const created = importHypothesesFromAuditForMetric(store, funnelId, metric);
        if (created.length) {
          persist(store);
          syncProjectForFunnel(funnelId, store);
        }
        return created;
      },
      finalizeHypothesisSelectionAction: (funnelId, metricId, selectedIds, patches) => {
        finalizeHypothesisSelection(store, funnelId, metricId, selectedIds, patches);
        persist(store);
        syncProjectForFunnel(funnelId, store);
      },

      // Experiments
      funnelExperiments: (id) => getExperimentsByFunnel(store, id),
      experimentByHypothesis: (hypId) => getExperimentByHypothesis(store, hypId),
      startExperimentAction: (input) => {
        const e = startExperiment(store, input);
        persist(store);
        return e;
      },
      patchExperiment: (id, patch) => {
        const e = updateExperiment(store, id, patch);
        if (e) persist(store);
        return e;
      },
      finishExperimentAction: (id, afterValue, result, decision) => {
        const e = finishExperiment(store, id, afterValue, result, decision);
        if (e) persist(store);
        return e;
      },
    };
  }, [store, persist, refresh, syncProject, syncProjectForFunnel]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
