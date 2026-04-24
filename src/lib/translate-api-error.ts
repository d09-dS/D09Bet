import { ApiError } from "@/lib/api";

/**
 * Translates an API error into a localized message using next-intl.
 *
 * The API returns stable error keys (e.g. "eventEnded", "insufficientBalance")
 * that map to the "apiErrors" namespace in messages/{locale}.json.
 *
 * @param err - The caught error (ApiError or generic Error)
 * @param t   - The `useTranslations("apiErrors")` function from next-intl
 * @returns   - The translated error message string
 */
export function translateApiError(
  err: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (err instanceof ApiError) {
    try {
      return t(err.message, err.errorParams ?? undefined);
    } catch {
      return err.message;
    }
  }
  if (err instanceof Error) {
    try {
      return t(err.message);
    } catch {
      return err.message;
    }
  }
  return t("internalServerError");
}
