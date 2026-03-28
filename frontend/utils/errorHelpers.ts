/**
 * Shared error handling utilities for type-safe error management.
 * Replaces `catch (e: any)` patterns with proper type narrowing.
 */

/**
 * Extract a user-friendly error message from an unknown error.
 * Use in catch blocks instead of `(e: any) => e.message`.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}
