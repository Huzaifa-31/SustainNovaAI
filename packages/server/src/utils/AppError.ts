export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = "VALIDATION_ERROR") {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Unauthorized", code = "AUTH_TOKEN_MISSING") {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(message = "Resource not found") {
    return new AppError(message, 404, "NOT_FOUND");
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(message, 409, code);
  }

  static internal(message = "Internal server error") {
    return new AppError(message, 500, "INTERNAL_ERROR", false);
  }
}
