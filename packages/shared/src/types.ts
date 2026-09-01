// ============================================================
// SustainNova AI — Shared Type Definitions
// ============================================================

// ----- Enums / Constants -----

export const UserRole = {
  ADMIN: "admin",
  ANALYST: "analyst",
  VIEWER: "viewer",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DocumentStatus = {
  UPLOADED: "uploaded",
  QUEUED: "queued",
  PARSING: "parsing",
  OCR: "ocr",
  CHUNKING: "chunking",
  EMBEDDING: "embedding",
  EXTRACTING: "extracting",
  VALIDATING: "validating",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const FindingSeverity = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export const FindingCategory = {
  LABOUR_HR: "Labour & HR",
  SAFETY: "Safety",
  ENVIRONMENT: "Environment",
  GOVERNANCE: "Governance",
  WORKER_WELLBEING: "Worker Wellbeing",
  GRIEVANCE_HARASSMENT: "Grievance & Harassment",
  WAGES_WORKING_HOURS: "Wages & Working Hours",
} as const;
export type FindingCategory = (typeof FindingCategory)[keyof typeof FindingCategory];

export const ReviewStatus = {
  AI_GENERATED: "ai_generated",
  NEEDS_REVIEW: "needs_review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const ConfidenceSignal = {
  STRONG_EVIDENCE: "strong_evidence",
  LIMITED_EVIDENCE: "limited_evidence",
  NEEDS_REVIEW: "needs_review",
  EVIDENCE_NOT_FOUND: "evidence_not_found",
} as const;
export type ConfidenceSignal = (typeof ConfidenceSignal)[keyof typeof ConfidenceSignal];

export const CAPStatus = {
  DRAFT: "draft",
  APPROVED: "approved",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  EVIDENCE_SUBMITTED: "evidence_submitted",
  REVIEW: "review",
  CLOSED: "closed",
} as const;
export type CAPStatus = (typeof CAPStatus)[keyof typeof CAPStatus];

export const AuditStatus = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;
export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

// ----- API Response Types -----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

// ----- Entity Types -----

export interface User {
  _id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  description?: string;
  ownerUserId: string;
  memberIds: string[];
  settings?: {
    riskWeights?: { critical: number; high: number; medium: number; low: number };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Audit {
  _id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  status: AuditStatus;
  auditPeriod?: { start: string; end: string };
  riskScore: number;
  findingCounts: { critical: number; high: number; medium: number; low: number; total: number };
  capStatus: { open: number; inProgress: number; closed: number; overdue: number };
  previousAuditId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  auditId: string;
  organizationId: string;
  userId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  pageCount: number;
  pagesProcessed: number;
  status: DocumentStatus;
  errorMessage?: string;
  qualityReport?: QualityReport;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualityReport {
  totalPages: number;
  processedPages: number;
  ocrRequired: boolean;
  ocrPages: number[];
  unreadablePages: number[];
  missingSections: boolean;
  pageRefsAvailable: boolean;
  summary: string;
}

export interface DocumentChunk {
  _id: string;
  documentId: string;
  auditId: string;
  organizationId: string;
  chunkIndex: number;
  text: string;
  pageStart: number;
  pageEnd: number;
  sectionTitle?: string;
  embedding?: number[];
  tokenCount: number;
  createdAt: string;
}

export interface Finding {
  _id: string;
  auditId: string;
  organizationId: string;
  documentId: string;
  title: string;
  description: string;
  category: FindingCategory;
  severity: FindingSeverity;
  severityWeight: number;
  riskReason: string;
  evidenceText: string;
  sourcePage: number;
  sourceSection: string;
  recommendedAction: string;
  suggestedOwner: string;
  suggestedDeadline: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  editedFields?: string[];
  possibleDuplicateIds?: string[];
  duplicateResolved?: boolean;
  duplicateMergedInto?: string;
  confidenceSignal: ConfidenceSignal;
  status: "Open" | "In Progress" | "Closed";
  createdAt: string;
  updatedAt: string;
}

export interface CAP {
  _id: string;
  findingId: string;
  auditId: string;
  organizationId: string;
  rootCause: string;
  correctiveAction: string;
  expectedOutcome: string;
  priority: FindingSeverity;
  responsibleRole: string;
  suggestedTimeline: string;
  status: CAPStatus;
  humanApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  assignedTo?: string;
  assignedAt?: string;
  dueDate?: string;
  progress?: string;
  comments: CAPComment[];
  completionEvidence?: string;
  completionEvidencePath?: string;
  closedAt?: string;
  closedBy?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CAPComment {
  userId: string;
  text: string;
  createdAt: string;
}

export interface ChatSession {
  _id: string;
  auditId: string;
  organizationId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  createdAt: string;
}

export interface ChatSource {
  chunkId: string;
  pageStart: number;
  pageEnd: number;
  section?: string;
  textSnippet: string;
}

export interface AuditLog {
  _id: string;
  organizationId: string;
  auditId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface Notification {
  _id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  read: boolean;
  createdAt: string;
}

// ----- Request Types -----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateAuditRequest {
  organizationId: string;
  name: string;
  description?: string;
  auditPeriod?: { start: string; end: string };
}

export interface ChatRequest {
  question: string;
  sessionId?: string;
}

export interface FindingFilterQuery extends PaginationQuery {
  severity?: string;
  category?: string;
  status?: string;
  reviewStatus?: string;
}
