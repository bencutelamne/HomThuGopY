export interface ApiError extends Error {
  status?: number;
  fieldErrors?: Record<string, string>;
}

export function createApiError(
  message: string,
  status?: number,
  fieldErrors?: Record<string, string>,
): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.fieldErrors = fieldErrors;
  return err;
}
