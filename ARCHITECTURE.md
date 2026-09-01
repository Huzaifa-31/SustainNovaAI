# SustainNova AI — System Architecture Design

## Document Information

| Field | Value |
|-------|-------|
| Project | SustainNova AI |
| Purpose | AI-Powered Audit, Risk & Corrective Action Management Platform |
| Document Type | System Architecture & Development Plan |
| Stack | MERN + TypeScript (Next.js frontend) |
| Version | 2.0 |

---

## Table of Contents

1. [Executive Overview & Core Principles](#1-executive-overview--core-principles)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [MongoDB Schema Design](#5-mongodb-schema-design)
6. [API Design](#6-api-design)
7. [AI/ML Pipeline Architecture](#7-aiml-pipeline-architecture)
8. [Finding Review Workflow & Duplicate Detection](#8-finding-review-workflow--duplicate-detection)
9. [CAP Lifecycle & Approval Workflow](#9-cap-lifecycle--approval-workflow)
10. [Document Quality Check](#10-document-quality-check)
11. [Audit Trail](#11-audit-trail)
12. [Notifications](#12-notifications)
13. [AI Confidence & Review Signals](#13-ai-confidence--review-signals)
14. [Frontend Architecture (Next.js)](#14-frontend-architecture-nextjs)
15. [Backend Architecture](#15-backend-architecture)
16. [Deployment Architecture](#16-deployment-architecture)
17. [Security Considerations](#17-security-considerations)
18. [Error Handling Strategy](#18-error-handling-strategy)
19. [Development Phases & Build Order](#19-development-phases--build-order)

---

## 1. Executive Overview & Core Principles

### Product Positioning

SustainNova AI is **not** an AI PDF summarizer. It is an **AI-assisted compliance workflow platform** that turns audit evidence into managed corrective actions.

**Complete value chain:**
```
Document → Evidence → Finding → Risk → Human Review → Corrective Action
→ Owner → Deadline → Tracking → Resolution
```

### Core User Journey

```
Login → Create Organization/Audit → Upload Report → Document Validation
→ Text & Page Extraction → Structuring & Chunking → Embedding & Indexing
→ AI Analysis → Findings Generated → Risk Classification → Evidence Verification
→ Human Finding Review → CAP Generation → Human CAP Approval
→ CAP Assignment & Tracking → Dashboard & Analytics → AI Q&A → Export
```

### 8 Critical Technical Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Evidence First** | AI does not make important claims without traceable evidence |
| 2 | **Human in the Loop** | AI recommendations remain reviewable and editable |
| 3 | **Least Privilege** | Users only access information they are authorized to access |
| 4 | **Structured AI Output** | AI responses are validated against schemas before storage |
| 5 | **Page-Aware Processing** | Document page/section information is preserved everywhere possible |
| 6 | **Fail Safely** | When evidence is unavailable, AI says so instead of inventing |
| 7 | **Async Processing** | Long-running document analysis runs through background workers |
| 8 | **Auditability** | Important user and AI-generated actions are traceable |

---

## 2. High-Level System Architecture

### Five-Layer Architecture

```
+=====================================================================+
|                     LAYER 1 — PRESENTATION                            |
|  Next.js 15 + TypeScript (App Router) + Tailwind CSS                |
|  Auth | Org/Audit | Upload | Findings | Evidence | Dashboard       |
|  CAPs | AI Assistant | Audit Comparison | Notifications | Export    |
+================================+====================================+
                                 | HTTPS / REST
+================================+====================================+
|                     LAYER 2 — APPLICATION / API                      |
|  Node.js + Express + TypeScript                                      |
|  Auth | Organization Mgmt | Audit Mgmt | Processing Orchestration   |
|  Findings Mgmt | Risk Calculations | CAP Mgmt | Approval Workflows  |
|  RAG Orchestration | Notifications | Export | Audit Logging          |
+================================+====================================+
                                 |
         +-----------+-----------+-----------+-----------+
         |           |           |           |           |
+========+===+ +=====+=====+ +==+========+ +==+========+ +==+========+
| L3: DOC  | | L4: AI    | | L5a: DATA | | L5b: OBJ  | | L5c: VEC  |
| INTELLIG. | | ENGINE    | | (MongoDB) | | STORAGE   | | (Vectors) |
| --------- | | --------- | | --------- | | --------- | | --------- |
| PDF/DOCX  | | Finding   | | Users     | | Original  | | Chunks    |
| Parse     | | Extract   | | Orgs      | | PDFs/DOCX | | Embeddings|
| OCR       | | Classify  | | Audits    | | Generated | | Metadata  |
| Chunk     | | Severity  | | Reports   | | Reports   | |           |
| Metadata  | | CAP Gen   | | Findings  | | Evidence  | |           |
|           | | RAG Q&A   | | CAPs      | |           | |           |
|           | | Duplicates| | Chat      | |           | |           |
|           | | Audit Cmp | | AuditLogs | |           | |           |
+===========+ +========== + +===========+ +========== + +===========+
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo with shared types** | Hackathon pace; shared TS interfaces prevent contract mismatches |
| **Next.js App Router** | File-based routing, layouts, server components, API routes |
| **BullMQ for async processing** | AI pipeline takes 30s–5min; cannot block HTTP cycle |
| **MongoDB Atlas + Vector Search** | Eliminates separate vector DB; operational + vector data co-located |
| **LangChain.js orchestration** | Document loaders, text splitters, embedding wrappers, RAG chains |
| **OpenAI-compatible API** | Swap to Alibaba Cloud via single env var change |
| **Organization → Audit hierarchy** | Real-world compliance is per-organization, per-audit-cycle |

---

## 3. Data Flow Diagrams

### 3.1 Upload → Extract → Analyze Pipeline

```
User              Frontend           Backend API        BullMQ Queue      Workers          External
 |                   |                   |                  |                |                |
 |-- Upload file -->|                   |                  |                |                |
 |                   |-- POST /reports->|                  |                |                |
 |                   |                   |-- Validate file  |                |                |
 |                   |                   |-- Save to storage|                |                |
 |                   |                   |-- Create record  |                |                |
 |                   |                   |-- Enqueue job -->|                |                |
 |                   |<- 202 Accepted --|                  |                |                |
 |<-- "Processing" --|                   |                  |                |                |
 |                   |                   |                  |                |                |
 |                   |                   |                  |-- parse ----->|                |
 |                   |                   |                  |               |-- pdf-parse/mammoth
 |                   |                   |                  |               |<- raw text ----|
 |                   |                   |                  |               |-- OCR if needed|
 |                   |                   |                  |               |-- Normalize    |
 |                   |                   |                  |               |-- Quality check|
 |                   |                   |                  |               |-- Chunk text   |
 |                   |                   |                  |               |-- Save chunks  |
 |                   |                   |                  |                |                |
 |                   |                   |                  |-- embed ----->|                |
 |                   |                   |                  |               |-- Embed API -->|
 |                   |                   |                  |               |<- vectors ----|
 |                   |                   |                  |                |                |
 |                   |                   |                  |-- extract --->|                |
 |                   |                   |                  |               |-- LLM extract->|
 |                   |                   |                  |               |<- findings JSON|
 |                   |                   |                  |               |-- Validate     |
 |                   |                   |                  |               |-- Deduplicate  |
 |                   |                   |                  |               |-- Save findings|
 |                   |                   |                  |               |-- Update audit |
 |                   |                   |                  |                |                |
 |<- Poll: complete -|<------------------|<-----------------|----------------|                |
```

**Document status lifecycle:**
```
Uploaded → Queued → Parsing → OCR (if needed) → Chunking → Embedding
→ Analyzing → Validating → Completed | Failed → Retry
```

### 3.2 RAG Q&A Flow

```
User               Frontend          Backend API        MongoDB         LLM Provider
 |                    |                  |                 |                |
 |-- Ask question -->|                  |                 |                |
 |                    |-- POST /chat -->|                 |                |
 |                    |                  |-- Access check: |                |
 |                    |                  |   User→Org→Audit|                |
 |                    |                  |-- Embed question>|                |
 |                    |                  |<- query vector -|                |
 |                    |                  |                 |                |
 |                    |                  |-- $vectorSearch>|                |
 |                    |                  |  (filter: auditId, orgId)|      |
 |                    |                  |<- top-K chunks -|                |
 |                    |                  |                 |                |
 |                    |                  |-- Build prompt:  |                |
 |                    |                  |  system + context|                |
 |                    |                  |  + question      |                |
 |                    |                  |                 |                |
 |                    |                  |-- Chat completion -------------->|
 |                    |                  |<- grounded answer ---------------|
 |                    |                  |                 |                |
 |                    |                  |-- Save to chat   |                |
 |                    |                  |  history         |                |
 |                    |                  |                 |                |
 |                    |<- answer + refs -|                 |                |
 |<- Render answer --|                  |                 |                |
 |   with source refs|                  |                 |                |
```

**Access control enforcement:** Every retrieval request respects `User → Organization → Audit → Report` permissions. A user can never receive data from another organization's audit.

### 3.3 CAP Generation & Lifecycle Flow

```
User               Frontend          Backend API        LLM              MongoDB
 |                    |                  |                 |                |
 |-- Review finding ->|                  |                 |                |
 |  Approve finding   |                  |                 |                |
 |-- "Generate CAP" ->|                  |                 |                |
 |                    |-- POST /cap --->|                 |                |
 |                    |                  |-- Fetch finding>|                |
 |                    |                  |-- Fetch chunks >|                |
 |                    |                  |-- CAP prompt -->|                |
 |                    |                  |                 |-- Generate -->|
 |                    |                  |                 |<- CAP JSON ---|
 |                    |                  |-- Validate       |                |
 |                    |                  |-- Save CAP ------------------------>|
 |                    |<- CAP data -----|                 |                |
 |<- Editable form --|                  |                 |                |
 |                    |                  |                 |                |
 |-- Edit + Approve ->|                  |                 |                |
 |                    |-- PATCH approve>|                 |                |
 |                    |                  |-- Update status  |                |
 |                    |                  |-- Audit trail ----------------->|
 |                    |                  |                 |                |
 |-- Assign CAP ---->|                  |                 |                |
 |                    |-- POST /assign->|                 |                |
 |                    |                  |-- Set owner      |                |
 |                    |                  |-- Notification --|                |
 |                    |                  |                 |                |
 |-- Update progress>|                  |                 |                |
 |                    |-- PATCH status->|                 |                |
 |                    |                  |-- Upload evidence|                |
 |                    |                  |-- Audit trail --|                |
 |                    |                  |                 |                |
 |-- Mark complete -->|                  |                 |                |
 |                    |-- PATCH close ->|                 |                |
 |                    |                  |-- Review & close |                |
 |                    |                  |-- Audit trail --|                |
```

**CAP Lifecycle:**
```
AI Draft → Human Edit → Review → Approve → Assign → In Progress
→ Evidence Submitted → Review → Closed
```

---

## 4. User Roles & Access Control

### 4.1 Full Role Model (5 roles)

| Capability | Admin | Compliance Mgr | Auditor | Action Owner | Viewer |
|------------|-------|----------------|---------|--------------|--------|
| Manage organization | Yes | No | No | No | No |
| Manage users | Yes | No | No | No | No |
| Create audits | Yes | Yes | Yes | No | No |
| Upload reports | Yes | Yes | Yes | No | No |
| Review findings | Yes | Yes | Yes | No | No |
| Approve findings | Yes | Yes | No | No | No |
| Generate/edit CAPs | Yes | Yes | Yes | No | No |
| Approve CAPs | Yes | Yes | No | No | No |
| View assigned CAPs | Yes | Yes | Yes | Yes | No |
| Update CAP progress | Yes | Yes | Yes | Yes (own) | No |
| Upload completion evidence | Yes | Yes | Yes | Yes (own) | No |
| View findings/CAPs | Yes | Yes | Yes | Assigned only | Yes |
| Ask Q&A questions | Yes | Yes | Yes | No | No |
| Export data | Yes | Yes | Yes | No | No |
| Monitor risk/analytics | Yes | Yes | No | No | No |
| Manage system settings | Yes | No | No | No | No |

### 4.2 MVP Simplification (3 roles)

For the hackathon MVP, simplify to: **Admin**, **Analyst**, **Viewer**.

| Capability | Admin | Analyst | Viewer |
|------------|-------|---------|--------|
| Manage org/users | Yes | No | No |
| Create audits, upload | Yes | Yes | No |
| Review/approve findings | Yes | Yes | No |
| Generate/approve CAPs | Yes | Yes | No |
| Update CAP progress | Yes | Yes | No |
| View all findings/CAPs | Yes | Yes | Yes |
| Ask Q&A | Yes | Yes | Yes |
| Export | Yes | Yes | Yes |
| Delete audits | Yes | Own only | No |

---

## 5. MongoDB Schema Design

### 5.1 Collection: `users`

```
{
  _id:          ObjectId,
  organizationId: ObjectId (ref: organizations),
  email:        String (unique, indexed),
  passwordHash: String,
  name:         String,
  role:         "admin" | "compliance_manager" | "auditor" | "action_owner" | "viewer",
  // MVP roles: "admin" | "analyst" | "viewer"
  createdAt:    Date,
  updatedAt:    Date
}
Indexes: { email: 1 } unique, { organizationId: 1 }
```

### 5.2 Collection: `organizations`

```
{
  _id:          ObjectId,
  name:         String,           // e.g. "Factory ABC"
  description:  String,
  ownerUserId:  ObjectId (ref: users),
  memberIds:    [ObjectId],       // users belonging to this org
  settings:     {
    riskWeights: { critical: 4, high: 3, medium: 2, low: 1 }
  },
  createdAt:    Date,
  updatedAt:    Date
}
Indexes: { ownerUserId: 1 }, { memberIds: 1 }
```

### 5.3 Collection: `audits`

```
{
  _id:            ObjectId,
  organizationId: ObjectId (ref: organizations),
  createdBy:      ObjectId (ref: users),
  name:           String,         // e.g. "Factory ABC – Social Compliance Audit – 2026"
  description:    String,
  status:         "active" | "completed" | "archived",
  auditPeriod:    { start: Date, end: Date },
  riskScore:      Number,         // computed weighted indicator (0.0 - 4.0)
  findingCounts:  { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
  capStatus:      { open: 0, inProgress: 0, closed: 0, overdue: 0 },
  previousAuditId: ObjectId,      // for audit comparison (future)
  createdAt:      Date,
  updatedAt:      Date
}
Indexes: { organizationId: 1 }, { createdBy: 1 }, { organizationId: 1, status: 1 }
```

### 5.4 Collection: `documents`

```
{
  _id:           ObjectId,
  auditId:       ObjectId (ref: audits),
  organizationId: ObjectId (ref: organizations),  // denormalized for access control
  userId:        ObjectId (ref: users),
  originalName:  String,
  mimeType:      String,
  fileSize:      Number,
  storagePath:   String,
  pageCount:     Number,
  pagesProcessed: Number,
  status:        "uploaded" | "queued" | "parsing" | "ocr" | "chunking" |
                 "embedding" | "extracting" | "validating" | "completed" | "failed",
  errorMessage:  String,
  qualityReport: {                    // Document Quality Check
    totalPages:     Number,
    processedPages: Number,
    ocrRequired:    Boolean,
    ocrPages:       [Number],         // pages that needed OCR
    unreadablePages: [Number],
    missingSections: Boolean,
    pageRefsAvailable: Boolean,
    summary:        String            // "42/42 pages processed, OCR required: 17-18"
  },
  processedAt:   Date,
  createdAt:     Date,
  updatedAt:     Date
}
Indexes: { auditId: 1 }, { auditId: 1, status: 1 }, { organizationId: 1 }
```

### 5.5 Collection: `document_chunks` (Vector Search Enabled)

```
{
  _id:           ObjectId,
  documentId:    ObjectId (ref: documents),
  auditId:       ObjectId (ref: audits),        // denormalized
  organizationId: ObjectId (ref: organizations), // denormalized for access control
  chunkIndex:    Number,
  text:          String,
  pageStart:     Number,
  pageEnd:       Number,
  sectionTitle:  String,
  embedding:     [Number],           // 1536 dims
  tokenCount:    Number,
  createdAt:     Date
}
Indexes: { documentId: 1, chunkIndex: 1 }, { auditId: 1 }, { organizationId: 1 }

Vector Search Index:
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
    { "type": "filter", "path": "auditId" },
    { "type": "filter", "path": "organizationId" },
    { "type": "filter", "path": "documentId" }
  ]
}
```

### 5.6 Collection: `findings`

```
{
  _id:               ObjectId,
  auditId:           ObjectId (ref: audits),
  organizationId:    ObjectId (ref: organizations),
  documentId:        ObjectId (ref: documents),
  title:             String,
  description:       String,
  category:          "Labour & HR" | "Safety" | "Environment" |
                     "Governance" | "Worker Wellbeing" |
                     "Grievance & Harassment" | "Wages & Working Hours",
  severity:          "Critical" | "High" | "Medium" | "Low",
  severityWeight:    Number,          // 4 | 3 | 2 | 1
  riskReason:        String,
  evidenceText:      String,
  sourcePage:        Number,
  sourceSection:     String,
  recommendedAction: String,
  suggestedOwner:    String,
  suggestedDeadline: String,

  // --- Review Workflow ---
  reviewStatus:      "ai_generated" | "needs_review" | "approved" | "rejected",
  reviewedBy:        ObjectId (ref: users),
  reviewedAt:        Date,
  reviewerNotes:     String,
  editedFields:      [String],       // which fields were manually edited

  // --- Duplicate Detection ---
  possibleDuplicateIds: [ObjectId],
  duplicateResolved: Boolean,
  duplicateMergedInto: ObjectId,

  // --- Confidence ---
  confidenceSignal:  "strong_evidence" | "limited_evidence" | "needs_review" | "evidence_not_found",

  status:            "Open" | "In Progress" | "Closed",
  createdAt:         Date,
  updatedAt:         Date
}
Indexes:
  { auditId: 1 }
  { auditId: 1, severity: 1 }
  { auditId: 1, category: 1 }
  { auditId: 1, status: 1 }
  { auditId: 1, reviewStatus: 1 }
  { documentId: 1 }
  { organizationId: 1 }
```

### 5.7 Collection: `caps`

```
{
  _id:               ObjectId,
  findingId:         ObjectId (ref: findings, unique),
  auditId:           ObjectId (ref: audits),
  organizationId:    ObjectId (ref: organizations),

  // --- CAP Content ---
  rootCause:         String,
  correctiveAction:  String,
  expectedOutcome:   String,
  priority:          "Critical" | "High" | "Medium" | "Low",
  responsibleRole:   String,
  suggestedTimeline: String,

  // --- Lifecycle ---
  status:            "draft" | "approved" | "assigned" | "in_progress" |
                     "evidence_submitted" | "review" | "closed",
  humanApproved:     Boolean,
  approvedBy:        ObjectId (ref: users),
  approvedAt:        Date,

  // --- Assignment & Tracking ---
  assignedTo:        ObjectId (ref: users),
  assignedAt:        Date,
  dueDate:           Date,
  progress:          String,
  comments:          [{ userId: ObjectId, text: String, createdAt: Date }],
  completionEvidence: String,
  completionEvidencePath: String,
  closedAt:          Date,
  closedBy:          ObjectId (ref: users),
  isOverdue:         Boolean,

  createdAt:         Date,
  updatedAt:         Date
}
Indexes:
  { findingId: 1 } unique
  { auditId: 1 }
  { auditId: 1, status: 1 }
  { organizationId: 1 }
  { assignedTo: 1 }
  { dueDate: 1 }
  { isOverdue: 1 }
```

### 5.8 Collection: `chat_sessions`

```
{
  _id:           ObjectId,
  auditId:       ObjectId (ref: audits),
  organizationId: ObjectId (ref: organizations),
  userId:        ObjectId (ref: users),
  messages: [{
    role:      "user" | "assistant",
    content:   String,
    sources:   [{
      chunkId:    ObjectId,
      pageStart:  Number,
      pageEnd:    Number,
      section:    String,
      textSnippet: String
    }],
    createdAt: Date
  }],
  createdAt:     Date,
  updatedAt:     Date
}
Indexes: { auditId: 1, userId: 1 }, { createdAt: -1 }
TTL: { createdAt: 1 } expireAfterSeconds: 604800 (7 days)
```

### 5.9 Collection: `audit_logs`

```
{
  _id:           ObjectId,
  organizationId: ObjectId,
  auditId:       ObjectId,
  userId:        ObjectId,
  action:        String,           // e.g. "finding.approved", "cap.assigned"
  entity:        String,           // e.g. "finding", "cap", "document"
  entityId:      ObjectId,
  details:       Object,           // what changed (before/after)
  timestamp:     Date
}
Indexes: { auditId: 1, timestamp: -1 }, { organizationId: 1 }, { userId: 1 }
```

### 5.10 Collection: `notifications`

```
{
  _id:           ObjectId,
  userId:        ObjectId (ref: users),
  organizationId: ObjectId,
  type:          "critical_finding" | "cap_assigned" | "cap_due_soon" |
                 "cap_overdue" | "cap_approval_needed" | "cap_completed" |
                 "processing_completed" | "processing_failed",
  title:         String,
  message:       String,
  entityId:      ObjectId,
  entityType:    "finding" | "cap" | "document" | "audit",
  read:          Boolean,
  createdAt:     Date
}
Indexes: { userId: 1, read: 1 }, { createdAt: -1 }
```

### 5.11 Risk Score Computation

```
riskScore = SUM(finding.severityWeight for each APPROVED finding) / COUNT(APPROVED findings)

Only approved findings contribute to the risk score.
Critical=4, High=3, Medium=2, Low=1. Range: 0.0–4.0.

Display:
  0.0 - 1.0  → "Low Risk"      (green)
  1.1 - 2.0  → "Moderate Risk" (yellow)
  2.1 - 3.0  → "High Risk"     (orange)
  3.1 - 4.0  → "Critical Risk" (red)

Label: "SustainNova Risk Indicator" — not an official ESG/regulatory score.
```

---

## 6. API Design

Base path: `/api/v1`

### 6.1 Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/logout` | Logout |

### 6.2 Organizations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations` | List user's organizations |
| POST | `/organizations` | Create organization |
| GET | `/organizations/:id` | Get org detail |
| PATCH | `/organizations/:id` | Update org |

### 6.3 Audits

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audits` | List audits (org-scoped) |
| POST | `/audits` | Create audit |
| GET | `/audits/:id` | Audit detail + summary stats |
| PATCH | `/audits/:id` | Update audit |
| DELETE | `/audits/:id` | Archive audit |

### 6.4 Reports (Documents)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/audits/:id/reports` | Upload report (multipart) |
| GET | `/reports/:id` | Report detail + processing status |
| GET | `/reports/:id/status` | Lightweight status poll |
| POST | `/reports/:id/retry` | Retry failed processing |

### 6.5 Findings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audits/:id/findings` | List findings (filters: severity, category, status, reviewStatus) |
| GET | `/findings/:id` | Finding detail |
| PATCH | `/findings/:id` | Edit finding |
| POST | `/findings/:id/review` | Accept/reject finding (human review) |

### 6.6 CAP

| Method | Path | Description |
|--------|------|-------------|
| POST | `/findings/:id/cap` | Generate CAP for approved finding |
| GET | `/caps/:id` | CAP detail |
| PATCH | `/caps/:id` | Edit CAP |
| POST | `/caps/:id/approve` | Approve CAP |
| POST | `/caps/:id/assign` | Assign CAP to action owner |
| PATCH | `/caps/:id/status` | Update CAP status |

### 6.7 AI Assistant

| Method | Path | Description |
|--------|------|-------------|
| POST | `/audits/:id/chat` | Ask question (grounded in audit data) |
| GET | `/audits/:id/chat/history` | Chat session history |

### 6.8 Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audits/:id/dashboard` | KPIs, charts, summaries |

### 6.9 Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audits/:id/export/findings` | Export findings CSV/PDF |
| GET | `/audits/:id/export/caps` | Export CAPs CSV/PDF |
| GET | `/audits/:id/export/report` | Executive summary PDF |

### 6.10 Audit Logs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audits/:id/logs` | Audit trail for the audit |

### 6.11 Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | Current user's notifications |
| PATCH | `/notifications/:id/read` | Mark as read |

### 6.12 Response Format

```json
// Success
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 142 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

### 6.13 Filtering Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `page` | `?page=2` | Page number (1-based) |
| `limit` | `?limit=25` | Items per page (default 20, max 100) |
| `sort` | `?sort=-createdAt` | Sort field (prefix `-` for desc) |
| `severity` | `?severity=Critical,High` | Comma-separated |
| `category` | `?category=Safety` | Filter by category |
| `status` | `?status=Open` | Filter by status |
| `reviewStatus` | `?reviewStatus=needs_review` | Filter by review state |
| `search` | `?search=overtime` | Full-text search |

---

## 7. AI/ML Pipeline Architecture

### 7.1 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Orchestration | LangChain.js | Chain composition, loaders, splitters |
| PDF Parsing | pdf-parse | Extract text with page boundaries |
| DOCX Parsing | mammoth | Convert DOCX to HTML/text |
| OCR Fallback | tesseract.js (or cloud OCR) | Scanned document processing |
| Embeddings | OpenAI text-embedding-3-small | 1536-dim embeddings |
| LLM (Extraction) | GPT-4o-mini / GPT-4o | Structured finding extraction |
| LLM (Q&A) | GPT-4o-mini | Grounded question answering |
| LLM (CAP) | GPT-4o-mini | Corrective action plan generation |
| Vector Store | MongoDB Atlas Vector Search | Semantic similarity retrieval |
| Queue | BullMQ + Redis | Async job processing |

### 7.2 Document Processing Pipeline (8 Steps)

```
Step 1: File Validation
  → Check format, readability, size, corruption

Step 2: Text Extraction
  → pdf-parse / mammoth with page boundary preservation

Step 3: OCR (if needed)
  → Trigger tesseract.js if text extraction fails or pages are scanned

Step 4: Normalization
  → Clean broken characters, repeated headers, whitespace, formatting noise

Step 5: Page Mapping
  → Every section retains: Page Number + Section + Text

Step 6: Chunking
  → Page-aware recursive splitting (512 tokens, 64-token overlap)
  → Metadata: auditId, organizationId, documentId, page, section, chunkIndex

Step 7: Embedding
  → Batch generation (100/batch), text-embedding-3-small
  → Store in document_chunks with metadata

Step 8: AI Analysis
  → Structured finding extraction in 3000-token windows
  → JSON validation against Zod schema
  → Duplicate detection (cosine similarity > 0.9 on title+description)
  → Save validated findings with reviewStatus: "ai_generated"
```

### 7.3 Finding Extraction Prompt

```
You are an expert sustainability, social-compliance, and HRDD auditor.
Analyze the following text and extract all risk findings.

For each finding:
- title: concise finding title
- description: detailed description
- category: one of [Labour & HR, Safety, Environment, Governance,
  Worker Wellbeing, Grievance & Harassment, Wages & Working Hours]
- severity: Critical | High | Medium | Low
- risk_reason: why this severity was assigned
- evidence_text: direct quote from the text
- source_page: page number
- source_section: section heading
- recommended_action: what should be done
- suggested_owner: role/department responsible
- suggested_deadline: suggested timeline
- confidence_signal: strong_evidence | limited_evidence | needs_review | evidence_not_found

Return JSON array. Return [] if no findings.

Text:
--- Page {page} | Section: {section} ---
{text}
```

### 7.4 RAG Q&A Pipeline

```
1. Access Check: Verify User → Organization → Audit access
2. Embed question → 1536-dim query vector
3. $vectorSearch filtered by auditId + organizationId
   - top-6 chunks, threshold >= 0.7
4. Build prompt: system instructions + context + question
   - Temperature: 0.1, Max tokens: 1024
5. If no relevant chunks: "Available report does not provide enough information"
6. Return answer + source references with page numbers
7. Save to chat_sessions
```

---

## 8. Finding Review Workflow & Duplicate Detection

### 8.1 Finding Lifecycle

```
AI Generated
    ↓
Needs Review  (human reviewer is notified)
    ↓
┌─── Accept ──→ Approved Finding ──→ CAP can be generated
├─── Edit ────→ Modified + Approved
└─── Reject ──→ Rejected (archived, not counted in risk score)
```

- Only **approved** findings contribute to risk score and dashboard KPIs
- Rejected findings remain in the database for audit trail
- Edited fields are tracked in `editedFields[]`

### 8.2 Duplicate Detection

The AI may identify the same issue differently:
- "Excessive Overtime"
- "Excessive Working Hours"
- "Long Working Hours"

**Detection strategy:**
1. After all findings are extracted, compute cosine similarity on `title + description` embeddings
2. If similarity > 0.9, flag as `possibleDuplicateIds`
3. Show reviewer: "Possible Duplicate Finding" with option to merge or keep separate
4. Merged findings combine evidence from both; the duplicate is archived

### 8.3 Evidence Viewer

Every finding provides a "View Evidence" action:
- Opens the relevant report page
- Highlights supporting text where technically possible
- Shows source page number and section
- Displays the `confidenceSignal` (strong/limited/needs_review/evidence_not_found)

---

## 9. CAP Lifecycle & Approval Workflow

### 9.1 Full Lifecycle

```
AI Draft → Human Edit → Review → Approve → Assign
→ In Progress → Evidence Submitted → Review → Closed
```

### 9.2 CAP Tracking Fields

Every CAP supports:

| Field | Description |
|-------|-------------|
| `rootCause` | AI-suggested root cause |
| `correctiveAction` | Specific, measurable steps |
| `expectedOutcome` | What success looks like |
| `priority` | Critical / High / Medium / Low |
| `responsibleRole` | Department/role responsible |
| `suggestedTimeline` | AI-suggested timeframe |
| `assignedTo` | Specific user assigned |
| `dueDate` | Deadline for completion |
| `progress` | Free-text progress update |
| `comments` | Thread of comments with timestamps |
| `completionEvidence` | Description of evidence submitted |
| `completionEvidencePath` | File path to evidence document |
| `isOverdue` | Auto-flagged when past dueDate |

### 9.3 Overdue Detection

A background job runs daily to check:
```
if (cap.dueDate < now() && cap.status not in ["closed"]) → cap.isOverdue = true
```

Overdue CAPs appear prominently on the dashboard and trigger notifications.

---

## 10. Document Quality Check

Before AI analysis begins, the system checks document quality:

| Check | Description |
|-------|-------------|
| Was the document successfully read? | File opened and parsed without error |
| Were all pages processed? | `pagesProcessed === pageCount` |
| Is OCR required? | Scanned pages or text extraction failure |
| Are there unreadable pages? | Pages that could not be extracted |
| Are important sections missing? | Large gaps in page sequence |
| Are page references available? | Page numbers preserved in chunks |

**Output stored in `documents.qualityReport`:**
```
"42/42 pages processed. OCR required: Pages 17–18. Evidence references available."
```

This improves system transparency and helps users understand data quality limitations.

---

## 11. Audit Trail

The system records important actions for accountability:

| Action | Entity |
|--------|--------|
| Report uploaded | document |
| Finding generated | finding |
| Finding edited | finding |
| Finding accepted | finding |
| Finding rejected | finding |
| CAP generated | cap |
| CAP edited | cap |
| CAP approved | cap |
| CAP assigned | cap |
| Status changed | cap |
| Evidence uploaded | cap |
| Export generated | audit |

Each log entry contains: `userId`, `action`, `entity`, `entityId`, `details` (before/after), `timestamp`.

---

## 12. Notifications

| Event | Type | Trigger |
|-------|------|---------|
| Critical finding created | `critical_finding` | New finding with severity=Critical |
| CAP assigned | `cap_assigned` | CAP assigned to user |
| CAP approaching deadline | `cap_due_soon` | 7 days before dueDate |
| CAP overdue | `cap_overdue` | Past dueDate, not closed |
| CAP approval required | `cap_approval_needed` | CAP in "review" status |
| CAP completed | `cap_completed` | CAP moved to "closed" |
| Processing completed | `processing_completed` | Document status = "completed" |
| Processing failed | `processing_failed` | Document status = "failed" |

In-app notifications for MVP. Email notifications post-MVP.

---

## 13. AI Confidence & Review Signals

Instead of presenting AI results as unquestionable facts, the interface communicates confidence:

| Signal | Meaning | UI Treatment |
|--------|---------|-------------|
| `strong_evidence` | Clear supporting text with specific data | Green badge |
| `limited_evidence` | Supporting text exists but may be indirect | Yellow badge |
| `needs_review` | AI uncertain, human verification strongly recommended | Orange badge |
| `evidence_not_found` | Could not locate supporting evidence | Red badge + warning |

No numerical confidence percentage unless the methodology is validated.

---

## 14. Frontend Architecture (Next.js)

### 14.1 Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | Full-stack React framework |
| TypeScript 5+ | Type safety |
| React 19+ | UI component model |
| TanStack Query 5+ | Server state management |
| React Hook Form 7+ | Form handling |
| Zod 3+ | Runtime validation |
| Recharts 2+ | Dashboard charts |
| next-auth (Auth.js v5) | Session/JWT/protected routes |
| TailwindCSS 3+ | Utility-first styling |
| lucide-react | Icons |

### 14.2 App Router File Structure

```
app/
  layout.tsx                          # Root layout
  page.tsx                            # → redirect to /audits
  (auth)/
    layout.tsx                        # Auth layout
    login/page.tsx
    register/page.tsx
  (dashboard)/
    layout.tsx                        # App shell (Navbar + Sidebar)
    organizations/
      page.tsx                        # Organization list
      new/page.tsx                    # Create organization
      [orgId]/
        settings/page.tsx             # Org settings & members
    audits/
      page.tsx                        # Audit list (Server Component)
      new/page.tsx                    # Create audit
      [id]/
        layout.tsx                    # Audit detail layout (tabs)
        page.tsx                      # → redirect to dashboard
        dashboard/page.tsx            # Dashboard (Server Component)
        documents/page.tsx            # Documents (Client Component)
        findings/
          page.tsx                    # Findings list (Client Component)
          [findingId]/page.tsx        # Finding detail + review
        caps/
          page.tsx                    # CAPs list (Client Component)
          [capId]/page.tsx            # CAP detail + tracking
        qa/page.tsx                   # AI Q&A (Client Component)
        logs/page.tsx                 # Audit trail (Server Component)
        export/page.tsx               # Export center
    notifications/page.tsx            # Notification center
```

### 14.3 Rendering Strategy

| Route | Rendering | Rationale |
|-------|-----------|----------|
| `/login`, `/register` | Server Component + Client form | Static shell |
| `/audits` | Server Component | Fast list load |
| `/audits/[id]/dashboard` | Server Component + Client charts | KPIs server-side |
| `/audits/[id]/findings` | Client Component | Heavy filtering/review |
| `/audits/[id]/caps` | Client Component | Lifecycle interaction |
| `/audits/[id]/qa` | Client Component | Chat interaction |
| `/audits/[id]/documents` | Client Component | Status polling |
| `/audits/[id]/logs` | Server Component | Read-only log view |

### 14.4 State Management

| State Type | Tool |
|------------|------|
| Server state (client) | TanStack Query |
| Server data (server components) | `fetch` / Mongoose direct |
| Auth / session | next-auth (Auth.js) `useSession()` + `getServerSession()` |
| UI state | Local state + URL search params |
| Form state | React Hook Form |
| Processing status | Polling (TanStack Query `refetchInterval`) every 3s |

### 14.5 Route Protection

```ts
// middleware.ts
export { auth as middleware } from "@/lib/auth";
export const config = {
  matcher: ["/audits/:path*", "/organizations/:path*", "/notifications/:path*"],
};
```

---

## 15. Backend Architecture

### 15.1 Project Structure

```
server/src/
  config/
    env.ts, database.ts, redis.ts, openai.ts
  middleware/
    authenticate.ts, authorize.ts, validate.ts,
    errorHandler.ts, rateLimiter.ts, upload.ts
  modules/
    auth/               # Registration, login, sessions
    organizations/      # Org CRUD, membership
    audits/             # Audit CRUD, stats
    documents/          # Upload, status, retry
    findings/           # List, detail, review workflow
    caps/               # Generate, approve, assign, track
    qa/                 # RAG Q&A, chat history
    dashboard/          # KPI aggregation
    export/             # CSV/PDF generation
    notifications/      # In-app notifications
    auditLogs/          # Trail logging
  ai/
    pipeline/
      documentParser.ts     # PDF/DOCX extraction
      ocrProcessor.ts       # OCR fallback
      textCleaner.ts        # Normalization
      textChunker.ts        # Page-aware chunking
      embeddingGenerator.ts # Batch embeddings
      findingExtractor.ts   # LLM structured extraction
      capGenerator.ts       # LLM CAP generation
      qaEngine.ts           # RAG Q&A pipeline
      duplicateDetector.ts  # Finding deduplication
      qualityChecker.ts     # Document quality report
    prompts/                # All prompt templates
    schemas/                # Zod schemas for LLM output
  workers/
    queueSetup.ts
    documentProcessingWorker.ts
    embeddingWorker.ts
    findingExtractionWorker.ts
    capGenerationWorker.ts
    overdueCheckWorker.ts       # Daily overdue scan
  models/                     # Mongoose models
  repositories/               # Data access layer
  services/
    auditTrailService.ts      # Log audit events
    notificationService.ts    # Create notifications
    riskCalculator.ts         # Compute risk scores
  utils/                      # logger, AppError, pagination
  app.ts, server.ts
```

### 15.2 Worker Architecture (BullMQ)

```
Queues:
  document-parse    → Worker: DocumentProc.  (concurrency: 3)
  doc-embedding     → Worker: EmbeddingWorker (concurrency: 2)
  finding-extract   → Worker: FindingExtract. (concurrency: 2)
  cap-generate      → Worker: CAPGeneration  (concurrency: 2)
  overdue-check     → Worker: OverdueCheck   (cron: daily)

Job Flow:
  document-parse → doc-embedding → finding-extract → (duplicate detection)
  → (risk score update) → (notify: processing_completed)
```

---

## 16. Deployment Architecture

```
+=====================================================================+
|  Frontend: Vercel           Backend: Railway/Render/Fly.io          |
|  (Next.js auto-deploy)      (Node.js + Express)                     |
|                                    |                                 |
|                    +---------------+---------------+                |
|                    |               |               |                |
|          MongoDB Atlas M10    Upstash Redis    File Storage        |
|          + Vector Search      (BullMQ)         (local/S3)         |
|                                                                      |
|          External: OpenAI API (or Alibaba Cloud Model Studio)       |
+=====================================================================+
```

### Environment Variables

```env
# Backend
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/sustainnova
REDIS_URL=redis://<upstash>
JWT_SECRET=<64-char>
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGIN=https://sustainnova.vercel.app

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://backend.railway.app/api/v1
NEXTAUTH_URL=https://sustainnova.vercel.app
NEXTAUTH_SECRET=<64-char>
```

---

## 17. Security Considerations

| Area | Measures |
|------|----------|
| **Authentication** | bcrypt (cost 12), JWT HS256 (64-char secret), 15min access / 7d refresh, brute-force rate limit |
| **API Security** | CORS whitelist, Helmet headers, rate limits (100/min general, 20/min AI, 5/min login), Zod validation |
| **File Upload** | MIME whitelist (PDF/DOCX only), 50MB max, stored outside webroot |
| **Data Security** | Atlas encryption at rest (AES-256), TLS 1.3 in transit, API keys server-side only |
| **Document Isolation** | All queries + vector search filtered by organizationId + auditId |
| **RAG Security** | Access check before retrieval; User→Org→Audit permissions enforced; no cross-org data |
| **AI Security** | Sanitize prompts, strict grounding instructions, low temperature (0.1), max_tokens on all calls |

---

## 18. Error Handling Strategy

### Error Classification

| Error | HTTP | Codes |
|-------|------|-------|
| Validation | 400 | `VALIDATION_ERROR`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE` |
| Auth | 401 | `AUTH_TOKEN_MISSING`, `AUTH_TOKEN_EXPIRED`, `AUTH_INVALID_CREDENTIALS` |
| Forbidden | 403 | `FORBIDDEN` |
| Not Found | 404 | `NOT_FOUND` |
| Conflict | 409 | `DUPLICATE_EMAIL`, `CAP_ALREADY_EXISTS` |
| Processing | 422 | `PROCESSING_FAILED` |
| Rate Limit | 429 | `RATE_LIMIT_EXCEEDED` |
| Server | 500 | Internal errors |
| LLM Down | 503 | `LLM_SERVICE_UNAVAILABLE` |

### AI Pipeline Error Handling

| Step | On Failure |
|------|-----------|
| File Validation | Immediate failure, notify user |
| Parsing | Retry 2x, set status=`failed` if still fails |
| OCR | Non-fatal: proceed without OCR pages, note in quality report |
| Cleaning | Non-fatal: continue with raw text |
| Chunking | Non-fatal: skip failed chunks |
| Embedding | Retry 5x with exponential backoff |
| Extraction | Retry 2x with corrective prompt |
| CAP Generation | Retry 2x, return partial results |
| Q&A | No relevant chunks: "Insufficient information in available report" |

### Logging

```
Logger: Pino (structured JSON)
ERROR  → Unhandled exceptions, pipeline failures
WARN   → Validation errors, auth failures, retries
INFO   → Request/job lifecycle
DEBUG  → AI pipeline steps, prompts (dev only)
Never log: passwords, JWT, API keys, full document text
```

---

## 19. Development Phases & Build Order

### MVP Priority Classification

| Priority | Features |
|----------|----------|
| **P0 — Must Work** | Auth, Audit creation, PDF/DOCX upload, Document extraction, Findings, Categories, Severity, Evidence, Source page, CAP generation, Human review, Dashboard, RAG Q&A |
| **P1 — Important** | Export, Finding approval/rejection, CAP assignment, Notifications, Evidence highlighting, Document quality checks |
| **P2 — Advanced** | Audit comparison, Recurring risk detection, Org-level analytics, Advanced risk scoring, Executive reporting, Advanced role management |

### 15 Development Phases

| Phase | Focus | Output |
|-------|-------|--------|
| **1. Foundation** | Repo, frontend, backend, DB, env, error handling, logging | Running dev environment |
| **2. Auth** | Registration, login, JWT, protected routes, roles | Secure login working |
| **3. Org & Audit Mgmt** | Organization setup, audit CRUD, ownership | Audits manageable |
| **4. Report Upload** | PDF/DOCX upload, validation, storage, status, retry | Reports uploadable |
| **5. Document Intelligence** | Extraction, OCR, page mapping, normalization, chunking | Page-aware text |
| **6. Vector Index** | Embeddings, vector storage, metadata filters, retrieval | Semantic retrieval |
| **7. AI Finding Engine** | Prompts, structured output, validation, extraction, dedup | Structured findings |
| **8. Risk & Review** | Categories, severity, scoring, review workflow, evidence viewer | Verified findings |
| **9. CAP Management** | Generation, root cause, editing, approval, assignment, tracking | Trackable CAPs |
| **10. Dashboard** | KPIs, charts, finding tables, CAP tracking, drill-down | Risk overview |
| **11. AI Assistant** | Q&A, retrieval, permission filtering, grounding, citations | Grounded answers |
| **12. Audit Comparison** | Compare audits, resolved/new/recurring findings (P2) | Longitudinal view |
| **13. Notifications & Export** | Alerts, reminders, CSV/PDF export, executive report | Communication |
| **14. Testing & Security** | Functional, AI evaluation, security testing | Quality assurance |
| **15. Deployment** | Production deploy, demo data, UI polish, E2E testing | Hackathon-ready MVP |

### Recommended Build Sequence

```
Foundation → Auth → Organization/Audit → Report Upload → Document Processing
→ Vector Index → AI Findings → Risk & Evidence → Human Review → CAP
→ CAP Tracking → Dashboard → RAG Q&A → Export → Comparison → Notifications
→ Testing → Deployment
```

### Final Success Criteria

1. AI identifies relevant findings
2. Every important finding traces to evidence
3. Severity is understandable and explainable
4. Humans can review and correct AI output
5. Corrective actions are actionable
6. Actions can be assigned and tracked
7. AI Q&A remains grounded in authorized documents
8. Management can clearly see what requires attention
9. The system maintains an audit trail
10. Complete workflow works reliably from upload to resolution

---

## Appendix: Technology Dependencies

### Backend

| Package | Purpose |
|---------|---------|
| `express` | HTTP framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT auth |
| `bcryptjs` | Password hashing |
| `zod` | Schema validation |
| `bullmq` + `ioredis` | Job queue |
| `multer` | File uploads |
| `pdf-parse` | PDF extraction |
| `mammoth` | DOCX extraction |
| `tesseract.js` | OCR fallback |
| `langchain` + `@langchain/openai` | AI orchestration |
| `openai` | LLM API |
| `cors` + `helmet` + `express-rate-limit` | Security middleware |
| `pino` | Structured logging |
| `csv-stringify` | CSV export |
| `pdfkit` | PDF export |

### Frontend

| Package | Purpose |
|---------|---------|
| `next` | App framework (App Router, SSR) |
| `react` + `react-dom` | UI components |
| `next-auth` (Auth.js v5) | Session, JWT, route protection |
| `@tanstack/react-query` | Server state management |
| `react-hook-form` + `@hookform/resolvers` | Forms |
| `zod` | Validation |
| `axios` | HTTP client |
| `recharts` | Dashboard charts |
| `lucide-react` | Icons |
| `react-dropzone` | File drag-and-drop |
| `tailwindcss` + `clsx` + `tailwind-merge` | Styling |
