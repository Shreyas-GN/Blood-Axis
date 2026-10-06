/** Normalizes a user-entered phone number to E.164, assuming India (+91) for bare 10-digit numbers. */
export function toE164(input: string, defaultCountry = "+91"): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}
