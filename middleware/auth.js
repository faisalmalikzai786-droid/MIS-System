const {
  hasPermission,
  hasAnyPermission,
  getPermissionsForRole,
} = require('../lib/permissions');

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Please log in.' });
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Please log in.' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    return next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Please log in.' });
    }
    if (!hasAnyPermission(req.session.role, permissions)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    return next();
  };
}

module.exports = {
  requireLogin,
  requireRoles,
  requirePermission,
  hasPermission,
  getPermissionsForRole,
};
