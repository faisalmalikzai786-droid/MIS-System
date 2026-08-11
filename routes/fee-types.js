const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireRoles } = require('../middleware/auth');

const router = express.Router();
const canManage = requireRoles('admin', 'finance');
const canView = requireRoles('admin', 'finance', 'reception');

router.use(requireLogin);

router.get('/', canView, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, description, default_amount, created_at
       FROM fee_types
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('List fee types:', err);
    res.status(500).json({ error: 'Failed to load fee types.' });
  }
});

router.post('/', canManage, async (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim() || null;
  const defaultAmount = Number(req.body.default_amount ?? 0);

  if (!name) {
    return res.status(400).json({ error: 'Fee type name is required.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO fee_types (name, description, default_amount)
       VALUES (?, ?, ?)`,
      [name, description, defaultAmount]
    );
    const [rows] = await pool.execute(
      `SELECT id, name, description, default_amount, created_at
       FROM fee_types WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A fee type with this name already exists.' });
    }
    console.error('Create fee type:', err);
    res.status(500).json({ error: 'Failed to create fee type.' });
  }
});

router.put('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim() || null;
  const defaultAmount = Number(req.body.default_amount ?? 0);

  if (!id || !name) {
    return res.status(400).json({ error: 'Valid id and name are required.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE fee_types SET name = ?, description = ?, default_amount = ? WHERE id = ?`,
      [name, description, defaultAmount, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee type not found.' });
    }
    const [rows] = await pool.execute(
      `SELECT id, name, description, default_amount, created_at
       FROM fee_types WHERE id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A fee type with this name already exists.' });
    }
    console.error('Update fee type:', err);
    res.status(500).json({ error: 'Failed to update fee type.' });
  }
});

router.delete('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id.' });

  try {
    const [result] = await pool.execute('DELETE FROM fee_types WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee type not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        error: 'Cannot delete this fee type because payments already use it.',
      });
    }
    console.error('Delete fee type:', err);
    res.status(500).json({ error: 'Failed to delete fee type.' });
  }
});

module.exports = router;
