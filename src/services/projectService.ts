import type { CreateProjectFromIntakeInput, Project } from "@/types/project";
import { calculateCompleteness, intakeToProjectFields } from "@/utils/completeness";
import { createId, nowIso } from "@/utils/id";
import type { MockStore } from "./storage";

export function getProjects(store: MockStore): Project[] {
  return [...store.projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getProjectById(store: MockStore, projectId: string): Project | null {
  return store.projects.find((p) => p.id === projectId) ?? null;
}

export function createProjectFromIntake(
  store: MockStore,
  input: CreateProjectFromIntakeInput,
): Project {
  const ts = nowIso();
  const partial = intakeToProjectFields(input, input.projectName);

  const project: Project = {
    id: createId("proj"),
    userId: store.user.id,
    projectName: input.projectName,
    businessDescription: partial.businessDescription ?? "",
    targetAudience: partial.targetAudience ?? "",
    productDescription: partial.productDescription ?? "",
    websiteUrl: partial.websiteUrl ?? "",
    currentTrafficSources: "",
    currentRevenue: "",
    currentConversion: "",
    mainGoal: partial.mainGoal ?? "",
    northStarMetric: "",
    projectCompletenessScore: 0,
    intake: { ...input },
    createdAt: ts,
    updatedAt: ts,
  };

  project.projectCompletenessScore = calculateCompleteness(project);
  store.projects.unshift(project);
  return project;
}

export function createBlankProject(store: MockStore, name: string): Project {
  const ts = nowIso();
  const project: Project = {
    id: createId("proj"),
    userId: store.user.id,
    projectName: name.trim() || "Новый проект",
    businessDescription: "",
    targetAudience: "",
    productDescription: "",
    websiteUrl: "",
    currentTrafficSources: "",
    currentRevenue: "",
    currentConversion: "",
    mainGoal: "",
    northStarMetric: "",
    projectCompletenessScore: 0,
    intake: null,
    createdAt: ts,
    updatedAt: ts,
  };
  store.projects.unshift(project);
  return project;
}

export function updateProject(store: MockStore, projectId: string, patch: Partial<Project>): Project | null {
  const idx = store.projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return null;

  const updated: Project = {
    ...store.projects[idx],
    ...patch,
    updatedAt: nowIso(),
  };
  updated.projectCompletenessScore = calculateCompleteness(updated);
  store.projects[idx] = updated;
  return updated;
}

export function canCreateProject(store: MockStore, maxProjects: number): boolean {
  return store.projects.length < maxProjects;
}
