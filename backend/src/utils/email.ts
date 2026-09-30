export const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function parseEmailRecipients(input: string[] | string): string[] {
  const text = Array.isArray(input) ? input.join(' ') : input ?? '';
  const matches = text.match(EMAIL_REGEX) ?? [];
  const unique = [...new Set(matches.map((value) => value.trim().toLowerCase()))];
  return unique.filter(Boolean);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
