export interface Classification {
  rank: number;
  departmentName: string;
  industryCategory: string;
  reasoning: string;
  confidenceScore: number;
  skillGaps: string[];
}

export interface CertificationDetail {
  name: string;
  provider: string;
  estimatedCost: string;
  estimatedDuration: string;
}

export interface SalaryRange {
  range: string;
  basis: string;
}

export interface RoadmapStep {
  timeframe: string;
  milestoneName: string;
  strategicReasoning: string;
  salaryRange: SalaryRange;
  recommendedCertifications: CertificationDetail[];
}

export interface AssessmentInput {
  psychological: string;
  mental: string;
  social: string;
  environmental: string;
  certificates: string[];
}

export interface RoadmapInput {
  currentRole: string;
  currentIndustry: string;
  currentExperience: string;
  futureRole: string;
  timeHorizon: number;
}

export interface SavedClassification {
  id: string;
  savedAt: number;
  label: string;
  input: AssessmentInput;
  results: Classification[];
}

export interface SavedRoadmap {
  id: string;
  savedAt: number;
  label: string;
  input: RoadmapInput;
  results: RoadmapStep[];
  completedMilestones: number[];
}
