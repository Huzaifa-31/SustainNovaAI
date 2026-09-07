import mongoose from "mongoose";
import { Audit } from "../../models";
import { Finding } from "../../models/Finding";
import { CAP } from "../../models/CAP";
import { Factory } from "../../models/Factory";
import { Organization } from "../../models/Organization";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { auditComparisonService } from "../audits/auditComparisonService";

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
  recentAnalyses: Array<{
    _id: string;
    name: string;
    type: string;
    date: string;
    status: string;
  }>;
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
  topFindings: Array<{
    _id: string;
    title: string;
    severity: string;
    category: string;
    auditName: string;
    sourcePage?: number;
  }>;
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

class DashboardService {
  /**
   * Build a dashboard scoped to the user's role.
   * Admin sees all organizations; organization sees only their org + factories.
   */
  async getDashboard(userId: string, role: string, organizationId?: string): Promise<DashboardData> {
    if (role === "admin") {
      return this.getAdminDashboard();
    }

    if (role !== "organization") {
      throw AppError.forbidden("Invalid role");
    }

    const targetOrgId = organizationId ?? await this.resolveUserOrganizationId(userId);
    return this.getOrgDashboard(targetOrgId, userId, role);
  }

  private async getAdminDashboard(): Promise<AdminDashboardData> {
    const [organizations, factories, audits, findings] = await Promise.all([
      Organization.find().lean(),
      Factory.find().lean(),
      Audit.find().lean(),
      Finding.find().lean(),
    ]);

    const factoryCounts = new Map<string, number>();
    const auditCounts = new Map<string, number>();
    const findingCounts = new Map<string, number>();

    for (const factory of factories) {
      const orgId = factory.organizationId.toString();
      factoryCounts.set(orgId, (factoryCounts.get(orgId) ?? 0) + 1);
    }

    for (const audit of audits) {
      const orgId = audit.organizationId.toString();
      auditCounts.set(orgId, (auditCounts.get(orgId) ?? 0) + 1);
    }

    for (const finding of findings) {
      const audit = audits.find((a) => a._id.toString() === finding.auditId.toString());
      if (audit) {
        const orgId = audit.organizationId.toString();
        findingCounts.set(orgId, (findingCounts.get(orgId) ?? 0) + 1);
      }
    }

    return {
      role: "admin",
      summary: {
        totalOrganizations: organizations.length,
        totalFactories: factories.length,
        totalAnalyses: audits.length,
        totalFindings: findings.length,
      },
      organizations: organizations.map((org) => ({
        _id: org._id.toString(),
        name: org.name,
        tier: org.tier ?? "basic",
        services: org.services ?? [],
        factoryCount: factoryCounts.get(org._id.toString()) ?? 0,
        auditCount: auditCounts.get(org._id.toString()) ?? 0,
        findingCount: findingCounts.get(org._id.toString()) ?? 0,
      })),
    };
  }

  private async getOrgDashboard(orgId: string, userId: string, role: string): Promise<OrgDashboardData> {
    const org = await Organization.findById(orgId).lean();
    if (!org) throw AppError.notFound("Organization not found");

    await organizationService.verifyMembership(orgId, userId, role);

    const audits = await Audit.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .lean();

    const auditIds = audits.map((a) => a._id as mongoose.Types.ObjectId);
    const auditIdStrings = auditIds.map((id) => id.toString());
    const auditNameMap = new Map(audits.map((a) => [a._id.toString(), a.name]));

    const [severityAgg, categoryAgg, totalFindings, caps, topFindingsRaw, factories] = await Promise.all([
      Finding.aggregate([
        { $match: { auditId: { $in: auditIds } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      Finding.aggregate([
        { $match: { auditId: { $in: auditIds } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Finding.countDocuments({ auditId: { $in: auditIds } }),
      CAP.find({ auditId: { $in: auditIds } }).lean(),
      Finding.find({
        auditId: { $in: auditIds },
        severity: { $in: ["Critical", "High"] },
      })
        .sort({ severityWeight: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      Factory.find({ organizationId: orgId }).sort({ name: 1 }).lean(),
    ]);

    const bySeverity = this.toSeverityRecord(severityAgg);
    const findingsByCategory = (categoryAgg as Array<{ _id: string; count: number }>).map(
      (item) => ({ category: item._id, count: item.count }),
    );

    const capOverview = this.aggregateCaps(caps);

    const recentAnalyses = audits.slice(0, 5).map((a) => ({
      _id: a._id.toString(),
      name: a.name,
      type: "Audit Report",
      date: (a.updatedAt ?? a.createdAt).toISOString(),
      status: a.status,
    }));

    const topFindings = topFindingsRaw.map((f) => ({
      _id: f._id.toString(),
      title: f.title,
      severity: f.severity,
      category: f.category,
      auditName: auditNameMap.get(f.auditId.toString()) || "Unknown",
      sourcePage: f.sourcePage,
    }));

    const comparisonOverview = await this.aggregateComparisonOverview(audits, userId, role);

    const factoryStats: FactoryDashboard[] = factories.map((factory) => {
      const factoryAudits = audits.filter((a) => a.factoryId.toString() === factory._id.toString());
      return {
        _id: factory._id.toString(),
        name: factory.name,
        description: factory.description,
        location: factory.location,
        totalAudits: factoryAudits.length,
        totalFindings: factoryAudits.reduce((sum, a) => sum + (a.findingCounts?.total ?? 0), 0),
        openCaps: factoryAudits.reduce((sum, a) => sum + (a.capStatus?.open ?? 0), 0),
      };
    });

    return {
      role: "organization",
      organization: {
        _id: org._id.toString(),
        name: org.name,
        description: org.description,
        tier: org.tier,
        services: org.services,
      },
      summary: {
        totalAnalyses: audits.length,
        criticalFindings: bySeverity.Critical,
        highRiskFindings: bySeverity.High,
        pendingActions: capOverview.open + capOverview.inProgress + capOverview.overdue,
        resolvedActions: capOverview.resolved + capOverview.closed,
      },
      riskSummary: {
        totalFindings,
        bySeverity,
      },
      findingsByCategory,
      recentAnalyses,
      comparisonOverview,
      topFindings,
      correctiveActionsOverview: {
        total: caps.length,
        ...capOverview,
      },
      factories: factoryStats,
    };
  }

  private toSeverityRecord(
    agg: Array<{ _id: string; count: number }>,
  ): SeverityBreakdown {
    const record: Record<string, number> = {};
    for (const item of agg) {
      record[item._id] = item.count;
    }
    return {
      Critical: record.Critical || 0,
      High: record.High || 0,
      Medium: record.Medium || 0,
      Low: record.Low || 0,
    };
  }

  private aggregateCaps(caps: Record<string, unknown>[]) {
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let overdue = 0;
    let closed = 0;

    for (const cap of caps) {
      const status = cap.status as string;
      const isOverdue = cap.isOverdue as boolean;

      if (["draft", "approved", "assigned"].includes(status)) {
        open++;
      } else if (["in_progress", "evidence_submitted", "review"].includes(status)) {
        inProgress++;
      } else if (status === "closed") {
        closed++;
      }

      if (isOverdue) overdue++;
    }

    resolved = Math.max(0, closed - overdue);

    return { open, inProgress, resolved, overdue, closed };
  }

  private async aggregateComparisonOverview(
    audits: Record<string, unknown>[],
    userId: string,
    role: string,
  ) {
    const auditsWithPrevious = audits.filter((a) => a.previousAuditId);

    let improved = 0;
    let worsened = 0;
    let newFindings = 0;
    let unchanged = 0;
    let featured: { currentAuditName: string; previousAuditName: string } | undefined;

    for (const audit of auditsWithPrevious) {
      try {
        const comparison = await auditComparisonService.compare(
          (audit._id as mongoose.Types.ObjectId).toString(),
          userId,
          role,
        );

        improved += comparison.summary.improvedCount;
        worsened += comparison.summary.worsenedCount;
        unchanged += comparison.summary.unchangedCount;
        newFindings += comparison.summary.newCount;

        if (!featured) {
          featured = {
            currentAuditName: comparison.currentAuditName,
            previousAuditName: comparison.previousAuditName,
          };
        }
      } catch {
        // Skip comparisons that fail
      }
    }

    return { improved, worsened, newFindings, unchanged, featured };
  }

  private async resolveUserOrganizationId(userId: string): Promise<string> {
    const orgs = await Organization.find({
      $or: [{ ownerUserId: userId }, { memberIds: userId }],
    }).lean();
    if (orgs.length === 0) {
      throw AppError.forbidden("You are not a member of any organization");
    }
    return orgs[0]._id.toString();
  }
}

export const dashboardService = new DashboardService();
