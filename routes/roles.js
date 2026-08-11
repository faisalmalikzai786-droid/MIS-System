const express = require('express');
const pool = require('../config/db');
const { requireLogin, requirePermission } = require('../middleware/auth');
const {
  getAllRoles,
  getRoleDetail,
  getPermissionMatrix,
  isValidRole,
  PERMISSIONS,
} = require('../lib/permissions');

const router = express.Router();

router.use(requireLogin, requirePermission('roles.view'));

router.get('/', async (_req, res) => {
  try {
    const [counts] = await pool.execute(
      `SELECT role, COUNT(*) AS user_count FROM users GROUP BY role`
    );
    const countMap = Object.fromEntries(counts.map((r) => [r.role, Number(r.user_count)]));

    const roles = getAllRoles().map((role) => ({
      ...role,
      user_count: countMap[role.id] || 0,
    }));

    res.json(roles);
  } catch (err) {
    console.error('List roles:', err);
    res.status(500).json({ error: 'Failed to load roles.' });
  }
});

router.get('/matrix', (_req, res) => {
  res.json({
    permissions: PERMISSIONS,
    matrix: getPermissionMatrix(),
  });
});

router.get('/:role', async (req, res) => {
  const role = req.params.role;
  if (!isValidRole(role)) {
    return res.status(404).json({ error: 'Role not found.' });
  }

  try {
    const detail = getRoleDetail(role);
    const [counts] = await pool.execute(
      'SELECT COUNT(*) AS user_count FROM users WHERE role = ?',
      [role]
    );
    res.json({
      ...detail,
      user_count: Number(counts[0]?.user_count || 0),
    });
  } catch (err) {
    console.error('Role detail:', err);
    res.status(500).json({ error: 'Failed to load role.' });
  }
});

router.get('/:role/users', async (req, res) => {
  const role = req.params.role;
  if (!isValidRole(role)) {
    return res.status(404).json({ error: 'Role not found.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role = ?
       ORDER BY name ASC`,
      [role]
    );
    res.json(rows);
  } catch (err) {
    console.error('Role users:', err);
    res.status(500).json({ error: 'Failed to load users for role.' });
  }
});

module.exports = router;
