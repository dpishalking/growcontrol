export type AIReportType =
  | "site_audit"
  | "offer"
  | "jtbd"
  | "landing_structure"
  | "hypotheses"
  | "metrics"
  | "predictive_model";

export type AIReportStatus = "draft" | "generated" | "saved";

export type AIReportSectionKind =
  | "problems"
  | "quick_fixes"
  | "offer"
  | "structure"
  | "hypotheses"
  | "metrics"
  | "next_step";

export type AIReportSection = {
  id: string;
  title: string;
  kind: AIReportSectionKind;
  summary: string;
  bullets?: string[];
};

export type AIReportContent = {
  headline: string;
  mainInsight: string;
  sections: AIReportSection[];
  nextStep: {
    title: string;
    description: string;
    suggestedTool?: AIReportType;
  };
};

export type AIReport = {
  id: string;
  projectId: string;
  type: AIReportType;
  title: string;
  summary: string;
  contentJson: AIReportContent;
  status: AIReportStatus;
  createdAt: string;
};
