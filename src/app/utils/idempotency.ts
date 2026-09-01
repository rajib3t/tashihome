/**
 * Generates a standard UUID v4 idempotency key.
 * Uses native Web Crypto API with fallback for older browsers or non-browser environments.
 */
export function generateIdempotencyKey(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback RFC4122 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a deterministic idempotency key for payment verification based on Razorpay payment ID.
 */
export function generatePaymentVerificationKey(paymentId: string): string {
  const cleanId = (paymentId || '').trim();
  if (!cleanId) {
    return generateIdempotencyKey();
  }
  return `verify-${cleanId}`;
}

/**
 * Validates if the given string is a valid UUID v4 format.
 */
export function isValidUuid(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

