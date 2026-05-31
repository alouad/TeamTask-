import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT token and authenticate user
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // The format is "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const secret = process.env.JWT_SECRET || 'teamtask-secret-key';

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
      }

      req.user = decoded; // Contains id, email, role, etc.
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: Authorization header is required' });
  }
}

/**
 * Middleware to authorize specific roles (e.g. 'manager', 'member')
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
}
