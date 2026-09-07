import type { OpenAPIV3 } from "openapi-types";

/**
 * OpenAPI 3.0 specification for the SustainNova AI API.
 *
 * Kept as a typed TS module (rather than a static JSON/YAML file) so the spec
 * is validated at compile time and lives next to the code it documents.
 * Served by swagger-ui-express at /api/docs, raw spec at /api/docs.json.
 */

const bearer: OpenAPIV3.SecuritySchemeObject = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "JWT access token returned by /auth/register or /auth/login.",
};

const errorResponse = (description: string): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
  },
});

const jsonResponse = (description: string, schema: OpenAPIV3.SchemaObject): OpenAPIV3.ResponseObject => ({
  description,
  content: { "application/json": { schema } },
});

const ref = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` });

const objectId: OpenAPIV3.SchemaObject = {
  type: "string",
  pattern: "^[a-f\\d]{24}$",
  example: "507f1f77bcf86cd799439011",
};

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "SustainNova AI API",
    description:
      "REST API for SustainNova AI — an AI-powered audit, risk & corrective action management platform. " +
      "All responses use the envelope `{ success, data }` on success and `{ success: false, error: { code, message } }` on failure.",
    version: "1.0.0",
    contact: { name: "SustainNova AI" },
    license: { name: "Private" },
  },
  servers: [
    { url: "http://localhost:4000", description: "Local development" },
  ],
  tags: [
    { name: "System", description: "Health and diagnostics" },
    { name: "Auth", description: "Registration, login and current user" },
    { name: "Organizations", description: "Organization and member management" },
    { name: "Audits", description: "Audit lifecycle management" },
    { name: "Documents", description: "Document upload and AI processing pipeline" },
  ],
  components: {
    securitySchemes: { bearerAuth: bearer },
    schemas: {
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string", description: "Machine-readable error code", example: "NOT_FOUND" },
          message: { type: "string", description: "Human-readable error message", example: "Resource not found" },
        },
      },
      ErrorEnvelope: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          error: ref("Error"),
        },
      },
      User: {
        type: "object",
        properties: {
          _id: objectId,
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["admin", "organization"] },
          organizationId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthData: {
        type: "object",
        required: ["user", "token"],
        properties: {
          user: ref("User"),
          token: { type: "string", description: "JWT bearer token" },
        },
      },
      Organization: {
        type: "object",
        properties: {
          _id: objectId,
          name: { type: "string" },
          description: { type: "string", nullable: true },
          ownerUserId: objectId,
          memberIds: { type: "array", items: objectId },
          settings: {
            type: "object",
            properties: {
              riskWeights: {
                type: "object",
                properties: {
                  critical: { type: "number", example: 4 },
                  high: { type: "number", example: 3 },
                  medium: { type: "number", example: 2 },
                  low: { type: "number", example: 1 },
                },
              },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Audit: {
        type: "object",
        properties: {
          _id: objectId,
          organizationId: objectId,
          createdBy: objectId,
          name: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["active", "completed", "archived"] },
          auditPeriod: {
            type: "object",
            nullable: true,
            properties: {
              start: { type: "string", format: "date-time" },
              end: { type: "string", format: "date-time" },
            },
          },
          riskScore: { type: "number", minimum: 0, maximum: 4, example: 1.5 },
          findingCounts: {
            type: "object",
            properties: {
              critical: { type: "number" },
              high: { type: "number" },
              medium: { type: "number" },
              low: { type: "number" },
              total: { type: "number" },
            },
          },
          capStatus: {
            type: "object",
            properties: {
              open: { type: "number" },
              inProgress: { type: "number" },
              closed: { type: "number" },
              overdue: { type: "number" },
            },
          },
          previousAuditId: { ...objectId, nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Document: {
        type: "object",
        properties: {
          _id: objectId,
          auditId: objectId,
          organizationId: objectId,
          uploadedBy: objectId,
          fileName: { type: "string", description: "Stored file name on disk" },
          originalName: { type: "string", description: "Original file name at upload" },
          mimeType: { type: "string", example: "application/pdf" },
          fileSize: { type: "number", description: "Size in bytes" },
          status: {
            type: "string",
            enum: ["uploaded", "queued", "parsing", "chunking", "embedding", "extracting", "completed", "failed"],
          },
          errorMessage: { type: "string", nullable: true },
          pageCount: { type: "number" },
          pagesProcessed: { type: "number" },
          processing: {
            type: "object",
            properties: {
              chunksGenerated: { type: "number" },
              embeddingsGenerated: { type: "number" },
              startedAt: { type: "string", format: "date-time", nullable: true },
              completedAt: { type: "string", format: "date-time", nullable: true },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DocumentStatusData: {
        type: "object",
        properties: {
          status: { $ref: "#/components/schemas/Document/properties/status" },
          processing: { $ref: "#/components/schemas/Document/properties/processing" },
          errorMessage: { type: "string", nullable: true },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 20 },
          total: { type: "number", example: 42 },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Liveness probe. Does not require authentication.",
        responses: {
          200: {
            description: "Server is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Creates a user (and optionally an organization) and returns a JWT. Rate limited: 20 requests / 15 min.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8, format: "password" },
                  name: { type: "string", maxLength: 100 },
                  organizationName: { type: "string", maxLength: 200, description: "Optional — creates an org owned by the new user" },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse("User registered", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("AuthData") },
          }),
          400: errorResponse("Validation failed or email already in use"),
          429: errorResponse("Rate limit exceeded"),
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        description: "Authenticates credentials and returns a JWT. Rate limited: 20 requests / 15 min.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse("Login successful", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("AuthData") },
          }),
          401: errorResponse("Invalid credentials"),
          429: errorResponse("Rate limit exceeded"),
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Current user", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: { type: "object", properties: { user: ref("User") } } },
          }),
          401: errorResponse("Missing or invalid token"),
        },
      },
    },
    "/api/v1/organizations": {
      post: {
        tags: ["Organizations"],
        summary: "Create an organization",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", maxLength: 200 },
                  description: { type: "string", maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse("Organization created", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Organization") },
          }),
          400: errorResponse("Validation failed"),
          401: errorResponse("Missing or invalid token"),
        },
      },
      get: {
        tags: ["Organizations"],
        summary: "List organizations for the current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Organizations the user owns or belongs to", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "array", items: ref("Organization") },
            },
          }),
          401: errorResponse("Missing or invalid token"),
        },
      },
    },
    "/api/v1/organizations/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: objectId, description: "Organization ID" },
      ],
      get: {
        tags: ["Organizations"],
        summary: "Get an organization by ID",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Organization", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Organization") },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Organization not found"),
        },
      },
      patch: {
        tags: ["Organizations"],
        summary: "Update an organization",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 200 },
                  description: { type: "string", maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse("Updated organization", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Organization") },
          }),
          401: errorResponse("Missing or invalid token"),
          403: errorResponse("Not the organization owner"),
          404: errorResponse("Organization not found"),
        },
      },
    },
    "/api/v1/organizations/{id}/members": {
      post: {
        tags: ["Organizations"],
        summary: "Add a member by email",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: objectId, description: "Organization ID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  role: { type: "string", enum: ["admin", "organization"] },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse("Updated organization with new member", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Organization") },
          }),
          400: errorResponse("Validation failed or user already a member"),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Organization or user not found"),
        },
      },
    },
    "/api/v1/organizations/{id}/members/{memberId}": {
      delete: {
        tags: ["Organizations"],
        summary: "Remove a member",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: objectId, description: "Organization ID" },
          { name: "memberId", in: "path", required: true, schema: objectId, description: "User ID of the member to remove" },
        ],
        responses: {
          200: jsonResponse("Updated organization", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Organization") },
          }),
          401: errorResponse("Missing or invalid token"),
          403: errorResponse("Not the organization owner"),
          404: errorResponse("Organization or member not found"),
        },
      },
    },
    "/api/v1/audits": {
      get: {
        tags: ["Audits"],
        summary: "List audits for the current user",
        description: "All audits across organizations the user can access.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Audits", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "array", items: ref("Audit") },
            },
          }),
          401: errorResponse("Missing or invalid token"),
        },
      },
      post: {
        tags: ["Audits"],
        summary: "Create an audit",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["organizationId", "name"],
                properties: {
                  organizationId: objectId,
                  name: { type: "string", maxLength: 300 },
                  description: { type: "string", maxLength: 2000 },
                  auditPeriod: {
                    type: "object",
                    properties: {
                      start: { type: "string", format: "date-time" },
                      end: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse("Audit created", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Audit") },
          }),
          400: errorResponse("Validation failed or not an organization member"),
          401: errorResponse("Missing or invalid token"),
        },
      },
    },
    "/api/v1/audits/org/{orgId}": {
      get: {
        tags: ["Audits"],
        summary: "List audits for an organization",
        description: "Paginated list with a `meta` envelope.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "orgId", in: "path", required: true, schema: objectId, description: "Organization ID" },
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "completed", "archived"] } },
          { name: "page", in: "query", schema: { type: "number", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "number", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: jsonResponse("Paginated audits", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "array", items: ref("Audit") },
              meta: ref("PaginationMeta"),
            },
          }),
          401: errorResponse("Missing or invalid token"),
          403: errorResponse("Not an organization member"),
        },
      },
    },
    "/api/v1/audits/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: objectId, description: "Audit ID" },
      ],
      get: {
        tags: ["Audits"],
        summary: "Get an audit by ID",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Audit", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Audit") },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Audit not found"),
        },
      },
      patch: {
        tags: ["Audits"],
        summary: "Update an audit",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 300 },
                  description: { type: "string", maxLength: 2000 },
                  status: { type: "string", enum: ["active", "completed", "archived"] },
                  auditPeriod: {
                    type: "object",
                    properties: {
                      start: { type: "string", format: "date-time" },
                      end: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse("Updated audit", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Audit") },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Audit not found"),
        },
      },
      delete: {
        tags: ["Audits"],
        summary: "Delete an audit",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Deleted audit", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Audit") },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Audit not found"),
        },
      },
    },
    "/api/v1/documents/upload": {
      post: {
        tags: ["Documents"],
        summary: "Upload documents",
        description:
          "Multipart form upload of up to 10 files. Each file is checked for duplicates (MD5) within the audit. " +
          `Max file size is configured by MAX_FILE_SIZE_MB (default 50MB). Files are queued for AI processing.`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["auditId", "files"],
                properties: {
                  auditId: objectId,
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    maxItems: 10,
                    description: "PDF, DOCX, images and text files",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse("Documents created (status: uploaded)", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "array", items: ref("Document") },
            },
          }),
          400: errorResponse("Validation failed, file too large, too many files, or duplicate content"),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Audit not found"),
        },
      },
    },
    "/api/v1/documents": {
      get: {
        tags: ["Documents"],
        summary: "List documents for an audit",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "auditId", in: "query", schema: objectId, description: "Filter by audit" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["uploaded", "queued", "parsing", "chunking", "embedding", "extracting", "completed", "failed"],
            },
          },
          { name: "page", in: "query", schema: { type: "number", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "number", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: jsonResponse("Paginated documents", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "array", items: ref("Document") },
              meta: ref("PaginationMeta"),
            },
          }),
          401: errorResponse("Missing or invalid token"),
        },
      },
    },
    "/api/v1/documents/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: objectId, description: "Document ID" },
      ],
      get: {
        tags: ["Documents"],
        summary: "Get a document",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Document", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Document") },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Document not found"),
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete a document",
        description: "Removes the file from disk and the database record.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Deletion confirmed", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "object", nullable: true },
            },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Document not found"),
        },
      },
    },
    "/api/v1/documents/{id}/status": {
      get: {
        tags: ["Documents"],
        summary: "Get document processing status",
        description: "Lightweight polling endpoint for the AI processing pipeline.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: objectId, description: "Document ID" },
        ],
        responses: {
          200: jsonResponse("Processing status", {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: ref("DocumentStatusData"),
            },
          }),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Document not found"),
        },
      },
    },
    "/api/v1/documents/{id}/retry": {
      post: {
        tags: ["Documents"],
        summary: "Retry a failed document",
        description: "Resets a document in 'error' status back to 'uploaded' for reprocessing.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: objectId, description: "Document ID" },
        ],
        responses: {
          200: jsonResponse("Document reset for reprocessing", {
            type: "object",
            properties: { success: { type: "boolean", enum: [true] }, data: ref("Document") },
          }),
          400: errorResponse("Document is not in error status, or original file is missing"),
          401: errorResponse("Missing or invalid token"),
          404: errorResponse("Document not found"),
        },
      },
    },
  },
};
