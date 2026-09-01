import {
  generateIdempotencyKey,
  generatePaymentVerificationKey,
  isValidUuid,
} from './idempotency';

describe('Idempotency Utility', () => {
  it('should generate valid UUID v4 format', () => {
    const key = generateIdempotencyKey();
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    expect(isValidUuid(key)).toBeTrue();
  });

  it('should generate unique keys on subsequent calls', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    expect(key1).not.toEqual(key2);
  });

  it('should generate payment verification key with payment id prefix', () => {
    const paymentId = 'pay_29QQoUBi66xm2f';
    const verifyKey = generatePaymentVerificationKey(paymentId);
    expect(verifyKey).toBe('verify-pay_29QQoUBi66xm2f');
  });

  it('should generate fallback UUID if payment id is empty', () => {
    const verifyKey = generatePaymentVerificationKey('');
    expect(isValidUuid(verifyKey)).toBeTrue();
  });
});

