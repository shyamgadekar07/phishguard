import crypto from 'crypto';

/**
 * Generate a cryptographically secure, URL-safe random tracking ID.
 * Avoids exposing database ObjectIds or sequential identifiers in simulation links.
 * @param {number} [bytes=24] - Number of random bytes
 * @returns {string} Safe hexadecimal tracking token
 */
export const generateTrackingId = (bytes = 24) => {
  return crypto.randomBytes(bytes).toString('hex');
};

export default generateTrackingId;
