import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware: validates the Bearer token in the Authorization header,
 * verifies the JWT signature, and attaches the active user to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server security configuration error (missing secret)',
      });
    }

    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: User account no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact an administrator.',
      });
    }

    // Attach active user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token',
    });
  }
};

/**
 * Role authorization middleware: ensures req.user has one of the allowed roles.
 * @param  {...string} roles Allowed roles (e.g., 'ADMIN', 'SECURITY_OFFICER')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${roles.join(', ')}]`,
      });
    }
    next();
  };
};

export default {
  protect,
  authorizeRoles,
};
