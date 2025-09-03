export class ErrorResponse extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    // This line is needed to properly capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}