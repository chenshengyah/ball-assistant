export function maskPhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.trim();

  if (normalized.length < 7) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export function hasPhoneNumber(phoneNumber: string | null | undefined): boolean {
  return Boolean(phoneNumber && phoneNumber.trim().length > 0);
}
