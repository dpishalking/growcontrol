export type ProjectIntake = {
  niche: string;
  productType: string;
  priceRange: string;
  targetClient: string;
  mainPain: string;
  mainPromise: string;
  competitors: string;
  currentWebsite: string;
  currentProblem: string;
  desiredResult: string;
};

export type Project = {
  id: string;
  userId: string;
  projectName: string;
  businessDescription: string;
  targetAudience: string;
  productDescription: string;
  websiteUrl: string;
  currentTrafficSources: string;
  currentRevenue: string;
  currentConversion: string;
  mainGoal: string;
  northStarMetric: string;
  projectCompletenessScore: number;
  intake: ProjectIntake | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectFromIntakeInput = ProjectIntake & {
  projectName: string;
};
