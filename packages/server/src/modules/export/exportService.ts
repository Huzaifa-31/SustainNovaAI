import mongoose from "mongoose";
import { stringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import { Finding } from "../../models/Finding";
import { CAP } from "../../models/CAP";
import { Audit } from "../../models/Audit";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";

export type ExportFormat = "csv" | "pdf";

class ExportService {
  /**
   * Verify the user has access to the audit.
   */
  private async verifyAuditAccess(
    auditId: string,
    userId: string,
  ): Promise<{ name: string; organizationId: mongoose.Types.ObjectId }> {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return { name: audit.name, organizationId: audit.organizationId };
  }

  // ===================== Findings Export =====================

  async exportFindings(
    auditId: string,
    userId: string,
    format: ExportFormat,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string; organizationId: string }> {
    const audit = await this.verifyAuditAccess(auditId, userId);

    const findings = await Finding.find({ auditId })
      .sort({ severityWeight: -1, createdAt: -1 })
      .lean();

    const exportResult = format === "csv"
      ? this.buildFindingsCsv(findings, audit.name, auditId)
      : this.buildFindingsPdf(findings, audit.name, auditId);

    return { ...exportResult, organizationId: audit.organizationId.toString() };
  }

  private buildFindingsCsv(
    findings: Record<string, unknown>[],
    auditName: string,
    auditId: string,
  ) {
    const rows = findings.map((f) => ({
      Title: f.title,
      Category: f.category,
      Severity: f.severity,
      Status: f.status,
      "Review Status": f.reviewStatus,
      "Evidence Text": f.evidenceText,
      "Source Page": f.sourcePage ?? "",
      "Recommended Action": f.recommendedAction,
      "Suggested Owner": f.suggestedOwner ?? "",
      "Suggested Deadline": f.suggestedDeadline ?? "",
      "Confidence Signal": f.confidenceSignal,
      Created: f.createdAt
        ? new Date(f.createdAt as string).toISOString()
        : "",
    }));

    const csv = stringify(rows, { header: true });
    return {
      buffer: Buffer.from(csv, "utf-8"),
      filename: `findings-${this.slugify(auditName)}-${auditId.slice(-6)}.csv`,
      contentType: "text/csv",
    };
  }

  private buildFindingsPdf(
    findings: Record<string, unknown>[],
    auditName: string,
    auditId: string,
  ) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.fontSize(20).text(`Findings Report`, 50, 50);
    doc.fontSize(12).text(`Audit: ${auditName}`, 50, 80);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    findings.forEach((f, index) => {
      doc.fontSize(14).text(`${index + 1}. ${f.title}`, { underline: true });
      doc.fontSize(10);
      doc.text(`Severity: ${f.severity} | Category: ${f.category} | Status: ${f.status}`);
      doc.moveDown(0.5);
      doc.text(`Description: ${f.description}`);
      doc.moveDown(0.5);
      doc.text(`Evidence: ${f.evidenceText}`);
      doc.moveDown(0.5);
      doc.text(`Recommended Action: ${f.recommendedAction}`);
      doc.moveDown(2);
    });

    doc.end();

    return {
      buffer: Buffer.concat(chunks),
      filename: `findings-${this.slugify(auditName)}-${auditId.slice(-6)}.pdf`,
      contentType: "application/pdf",
    };
  }

  // ===================== CAPs Export =====================

  async exportCaps(
    auditId: string,
    userId: string,
    format: ExportFormat,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string; organizationId: string }> {
    const audit = await this.verifyAuditAccess(auditId, userId);

    const caps = await CAP.find({ auditId })
      .populate("findingId", "title severity")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    const exportResult = format === "csv"
      ? this.buildCapsCsv(caps, audit.name, auditId)
      : this.buildCapsPdf(caps, audit.name, auditId);

    return { ...exportResult, organizationId: audit.organizationId.toString() };
  }

  private buildCapsCsv(
    caps: Record<string, unknown>[],
    auditName: string,
    auditId: string,
  ) {
    const rows = caps.map((c) => ({
      Priority: c.priority,
      Status: c.status,
      "Root Cause": c.rootCause,
      "Corrective Action": c.correctiveAction,
      "Expected Outcome": c.expectedOutcome,
      "Responsible Role": c.responsibleRole,
      "Suggested Timeline": c.suggestedTimeline,
      "Due Date": c.dueDate ?? "",
      Progress: c.progress ?? "",
      Overdue: c.isOverdue ? "Yes" : "No",
      "Human Approved": c.humanApproved ? "Yes" : "No",
      Created: c.createdAt
        ? new Date(c.createdAt as string).toISOString()
        : "",
    }));

    const csv = stringify(rows, { header: true });
    return {
      buffer: Buffer.from(csv, "utf-8"),
      filename: `caps-${this.slugify(auditName)}-${auditId.slice(-6)}.csv`,
      contentType: "text/csv",
    };
  }

  private buildCapsPdf(
    caps: Record<string, unknown>[],
    auditName: string,
    auditId: string,
  ) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.fontSize(20).text(`Corrective Action Plans`, 50, 50);
    doc.fontSize(12).text(`Audit: ${auditName}`, 50, 80);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    caps.forEach((c, index) => {
      doc.fontSize(14).text(`${index + 1}. CAP #${index + 1}`, { underline: true });
      doc.fontSize(10);
      doc.text(`Priority: ${c.priority} | Status: ${c.status} | Overdue: ${c.isOverdue ? "Yes" : "No"}`);
      doc.moveDown(0.5);
      doc.text(`Root Cause: ${c.rootCause}`);
      doc.moveDown(0.5);
      doc.text(`Corrective Action: ${c.correctiveAction}`);
      doc.moveDown(0.5);
      doc.text(`Expected Outcome: ${c.expectedOutcome}`);
      doc.moveDown(0.5);
      doc.text(`Responsible Role: ${c.responsibleRole}`);
      doc.moveDown(0.5);
      doc.text(`Timeline: ${c.suggestedTimeline}`);
      doc.moveDown(2);
    });

    doc.end();

    return {
      buffer: Buffer.concat(chunks),
      filename: `caps-${this.slugify(auditName)}-${auditId.slice(-6)}.pdf`,
      contentType: "application/pdf",
    };
  }

  // ===================== Executive Summary =====================

  async exportExecutiveReport(
    auditId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string; organizationId: string }> {
    const audit = await this.verifyAuditAccess(auditId, userId);

    const findings = await Finding.find({ auditId }).lean();
    const caps = await CAP.find({ auditId }).lean();

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    doc.fontSize(22).text("Executive Summary", 50, 50);
    doc.fontSize(12).text(`Audit: ${audit.name}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    doc.fontSize(14).text("Risk Overview");
    doc.fontSize(10);
    doc.text(`Risk Score: ${findings.length > 0 ? this.calculateRiskScore(findings) : 0}/4.0`);
    doc.text(`Total Findings: ${findings.length}`);
    doc.text(`Critical: ${findings.filter((f) => f.severity === "Critical").length}`);
    doc.text(`High: ${findings.filter((f) => f.severity === "High").length}`);
    doc.text(`Medium: ${findings.filter((f) => f.severity === "Medium").length}`);
    doc.text(`Low: ${findings.filter((f) => f.severity === "Low").length}`);
    doc.moveDown(2);

    doc.fontSize(14).text("CAP Overview");
    doc.fontSize(10);
    doc.text(`Total CAPs: ${caps.length}`);
    doc.text(`Open: ${caps.filter((c) => ["draft", "approved", "assigned"].includes(c.status as string)).length}`);
    doc.text(`In Progress: ${caps.filter((c) => ["in_progress", "evidence_submitted", "review"].includes(c.status as string)).length}`);
    doc.text(`Closed: ${caps.filter((c) => c.status === "closed").length}`);
    doc.moveDown(2);

    doc.fontSize(14).text("Critical Findings");
    doc.fontSize(10);
    const critical = findings.filter((f) => f.severity === "Critical");
    if (critical.length === 0) {
      doc.text("No critical findings.");
    } else {
      critical.forEach((f, i) => {
        doc.text(`${i + 1}. ${f.title}`);
      });
    }

    doc.end();

    return {
      buffer: Buffer.concat(chunks),
      filename: `executive-summary-${this.slugify(audit.name)}-${auditId.slice(-6)}.pdf`,
      contentType: "application/pdf",
      organizationId: audit.organizationId.toString(),
    };
  }

  private calculateRiskScore(findings: Record<string, unknown>[]): number {
    const totalWeight = findings.reduce(
      (sum, f) => sum + ((f.severityWeight as number) || 0),
      0,
    );
    return findings.length > 0
      ? Math.min(4, Number((totalWeight / findings.length).toFixed(1)))
      : 0;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 40);
  }
}

export const exportService = new ExportService();
