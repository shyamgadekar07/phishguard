import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token containing userId and role.
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} role
 * @returns {string} Signed JWT
 */
export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign(
    {
      userId,
      role,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    }
  );
};

export default generateToken;
