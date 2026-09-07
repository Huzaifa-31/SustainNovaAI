import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface DashboardSummary {
  totalAnalyses: number;
  criticalFindings: number;
  highRiskFindings: number;
  pendingActions: number;
  resolvedActions: number;
}

export interface SeverityBreakdown {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export interface FactoryDashboard {
  _id: string;
  name: string;
  description?: string;
  location?: string;
  totalAudits: number;
  totalFindings: number;
  openCaps: number;
}

export interface RecentAnalysis {
  _id: string;
  name: string;
  type: string;
  date: string;
  status: string;
}

export interface TopFinding {
  _id: string;
  title: string;
  severity: string;
  category: string;
  auditName: string;
  sourcePage?: number;
}

export interface AdminDashboardData {
  role: "admin";
  summary: {
    totalOrganizations: number;
    totalFactories: number;
    totalAnalyses: number;
    totalFindings: number;
  };
  organizations: Array<{
    _id: string;
    name: string;
    tier: string;
    services: string[];
    factoryCount: number;
    auditCount: number;
    findingCount: number;
  }>;
}

export interface OrgDashboardData {
  role: "organization";
  organization: {
    _id: string;
    name: string;
    description?: string;
    tier: string;
    services: string[];
  };
  summary: DashboardSummary;
  riskSummary: {
    totalFindings: number;
    bySeverity: SeverityBreakdown;
  };
  findingsByCategory: Array<{ category: string; count: number }>;
  recentAnalyses: RecentAnalysis[];
  comparisonOverview: {
    improved: number;
    worsened: number;
    newFindings: number;
    unchanged: number;
    featured?: {
      currentAuditName: string;
      previousAuditName: string;
    };
  };
  topFindings: TopFinding[];
  correctiveActionsOverview: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    overdue: number;
    closed: number;
  };
  factories: FactoryDashboard[];
}

export type DashboardData = AdminDashboardData | OrgDashboardData;

export function useDashboard(organizationId?: string) {
  return useQuery({
    queryKey: ["dashboard", organizationId],
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard", {
        params: organizationId ? { organizationId } : undefined,
      });
      return data.data as DashboardData;
    },
  });
}
