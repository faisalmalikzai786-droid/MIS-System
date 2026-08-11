const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireRoles } = require('../middleware/auth');

const router = express.Router();
const canManage = requireRoles('admin', 'finance', 'reception');
const canView = requireRoles('admin', 'finance', 'reception');

router.use(requireLogin);

function calcStatus(amount, paidAmount) {
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= amount) return 'paid';
  return 'partial';
}

function normalizeDueDate(status, dueDate) {
  if (status !== 'partial') return null;
  return dueDate || null;
}

async function resolveFeeTypeId(feeTypeId, feeTypeName, amount) {
  const rawName = (feeTypeName || '').trim();

  if (feeTypeId) {
    const [rows] = await pool.execute(
      'SELECT id, name, default_amount FROM fee_types WHERE id = ? LIMIT 1',
      [feeTypeId]
    );
    return rows[0] || null;
  }

  if (!rawName) return null;

  const [existing] = await pool.execute(
    'SELECT id, name, default_amount FROM fee_types WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [rawName]
  );
  if (existing[0]) return existing[0];

  const [created] = await pool.execute(
    `INSERT INTO fee_types (name, description, default_amount)
     VALUES (?, NULL, ?)`,
    [rawName, amount]
  );
  return { id: created.insertId, name: rawName, default_amount: amount };
}

async function fetchPaymentById(id) {
  const [rows] = await pool.execute(
    `SELECT fp.id, fp.student_id, s.student_code, s.full_name,
            fp.fee_type_id, ft.name AS fee_type_name,
            fp.amount, fp.paid_amount, fp.month, fp.year,
            fp.due_date, fp.status, fp.paid_at, fp.note, fp.created_at
     FROM fee_payments fp
     JOIN students s ON s.id = fp.student_id
     JOIN fee_types ft ON ft.id = fp.fee_type_id
     WHERE fp.id = ?`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Unpaid for a month/year =
 * - active students with NO fee_payments row for that period, OR
 * - active students with a fee_payments row whose status is 'unpaid'
 * Paid / partial bills stay on their own filters (FROM fee_payments only).
 */
async function fetchUnpaidStudents(month, year) {
  const [rows] = await pool.execute(
    `SELECT
       fp.id,
       s.id AS student_id,
       s.student_code,
       s.full_name,
       fp.fee_type_id,
       ft.name AS fee_type_name,
       fp.amount,
       fp.paid_amount,
       fp.due_date,
       fp.status,
       fp.paid_at,
       fp.note,
       fp.created_at
     FROM students s
     LEFT JOIN fee_payments fp
       ON fp.student_id = s.id AND fp.month = ? AND fp.year = ?
     LEFT JOIN fee_types ft ON ft.id = fp.fee_type_id
     WHERE s.status = 'active'
       AND (fp.id IS NULL OR fp.status = 'unpaid')
     ORDER BY s.full_name ASC, ft.name ASC`,
    [month, year]
  );

  return rows.map((row) => ({
    id: row.id ? Number(row.id) : null,
    student_id: Number(row.student_id),
    student_code: row.student_code,
    full_name: row.full_name,
    fee_type_id: row.fee_type_id ? Number(row.fee_type_id) : null,
    fee_type_name: row.fee_type_name || null,
    amount: Number(row.amount || 0),
    paid_amount: Number(row.paid_amount || 0),
    month,
    year,
    due_date: row.due_date || null,
    status: 'unpaid',
    paid_at: row.paid_at || null,
    note: row.note || null,
    created_at: row.created_at || null,
    missing_bill: !row.id,
  }));
}

async function countUnpaidStudents(month, year) {
  const [rows] = await pool.execute(
    `SELECT COUNT(DISTINCT s.id) AS total
     FROM students s
     LEFT JOIN fee_payments fp
       ON fp.student_id = s.id AND fp.month = ? AND fp.year = ?
     WHERE s.status = 'active'
       AND (fp.id IS NULL OR fp.status = 'unpaid')`,
    [month, year]
  );
  return Number(rows[0]?.total || 0);
}

router.get('/', canView, async (req, res) => {
  const status = (req.query.status || '').trim();
  const month = req.query.month ? Number(req.query.month) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const studentId = req.query.student_id ? Number(req.query.student_id) : null;

  try {
    if (status === 'unpaid') {
      if (!month || month < 1 || month > 12 || !year) {
        return res.status(400).json({
          error: 'Please select month and year to view unpaid students.',
        });
      }
      const rows = await fetchUnpaidStudents(month, year);
      return res.json(rows);
    }

    const where = [];
    const params = [];

    if (['partial', 'paid'].includes(status)) {
      where.push('fp.status = ?');
      params.push(status);
    }
    if (month && month >= 1 && month <= 12) {
      where.push('fp.month = ?');
      params.push(month);
    }
    if (year) {
      where.push('fp.year = ?');
      params.push(year);
    }
    if (studentId) {
      where.push('fp.student_id = ?');
      params.push(studentId);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT fp.id, fp.student_id, s.student_code, s.full_name,
              fp.fee_type_id, ft.name AS fee_type_name,
              fp.amount, fp.paid_amount, fp.month, fp.year,
              fp.due_date, fp.status, fp.paid_at, fp.note, fp.created_at
       FROM fee_payments fp
       JOIN students s ON s.id = fp.student_id
       JOIN fee_types ft ON ft.id = fp.fee_type_id
       ${whereSql}
       ORDER BY fp.year DESC, fp.month DESC, s.full_name ASC`,
      params
    );

    res.json(rows.map((row) => ({ ...row, missing_bill: false })));
  } catch (err) {
    console.error('List fee payments:', err);
    res.status(500).json({ error: 'Failed to load fee payments.' });
  }
});

router.get('/summary', canView, async (req, res) => {
  const month = req.query.month ? Number(req.query.month) : null;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

  const where = ['fp.year = ?'];
  const params = [year];
  if (month && month >= 1 && month <= 12) {
    where.push('fp.month = ?');
    params.push(month);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_bills,
         SUM(fp.status = 'unpaid') AS unpaid_count,
         SUM(fp.status = 'partial') AS partial_count,
         SUM(fp.status = 'paid') AS paid_count,
         COALESCE(SUM(fp.amount), 0) AS total_amount,
         COALESCE(SUM(fp.paid_amount), 0) AS collected_amount
       FROM fee_payments fp
       WHERE ${where.join(' AND ')}`,
      params
    );
    const unpaidBills = Number(rows[0].unpaid_count || 0);
    let unpaidStudentCount = 0;
    if (month && month >= 1 && month <= 12) {
      unpaidStudentCount = await countUnpaidStudents(month, year);
    }

    res.json({
      year,
      month: month || null,
      total_bills: Number(rows[0].total_bills || 0),
      unpaid_count: unpaidStudentCount,
      unpaid_bills: unpaidBills,
      missing_bill_count: unpaidStudentCount,
      partial_count: Number(rows[0].partial_count || 0),
      paid_count: Number(rows[0].paid_count || 0),
      total_amount: Number(rows[0].total_amount || 0),
      collected_amount: Number(rows[0].collected_amount || 0),
    });
  } catch (err) {
    console.error('Fee summary:', err);
    res.status(500).json({ error: 'Failed to load fee summary.' });
  }
});

router.post('/', canManage, async (req, res) => {
  const studentId = Number(req.body.student_id);
  const feeTypeId = Number(req.body.fee_type_id);
  const feeTypeName = (req.body.fee_type_name || '').trim();
  const amount = Number(req.body.amount ?? 0);
  const paidAmount = Number(req.body.paid_amount ?? 0);
  const month = Number(req.body.month);
  const year = Number(req.body.year);
  const dueDate = req.body.due_date || null;
  const note = (req.body.note || '').trim() || null;

  if (!studentId) {
    return res.status(400).json({ error: 'Please select a student.' });
  }
  if (!feeTypeId && !feeTypeName) {
    return res.status(400).json({ error: 'Please enter a fee type name (e.g. Monthly Fee).' });
  }
  if (!month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Please choose a valid month.' });
  }
  if (!year) {
    return res.status(400).json({ error: 'Please enter a year.' });
  }
  if (!(amount > 0)) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' });
  }
  if (paidAmount < 0 || paidAmount > amount) {
    return res.status(400).json({ error: 'Paid amount must be between 0 and amount.' });
  }

  const status = calcStatus(amount, paidAmount);
  const normalizedDueDate = normalizeDueDate(status, dueDate);
  if (status === 'partial' && !normalizedDueDate) {
    return res.status(400).json({
      error: 'Due date is required when the payment is partial.',
    });
  }
  const paidAt = status === 'paid' ? new Date().toISOString() : null;

  try {
    const feeType = await resolveFeeTypeId(feeTypeId, feeTypeName, amount);
    if (!feeType) {
      return res.status(400).json({ error: 'Selected fee type was not found.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO fee_payments
        (student_id, fee_type_id, amount, paid_amount, month, year, due_date, status, paid_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        feeType.id,
        amount,
        paidAmount,
        month,
        year,
        normalizedDueDate,
        status,
        paidAt,
        note,
      ]
    );
    res.status(201).json(await fetchPaymentById(result.insertId));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || /UNIQUE constraint failed/i.test(String(err.message || ''))) {
      return res.status(409).json({
        error: 'A fee bill already exists for this student, type, and month.',
      });
    }
    console.error('Create fee payment:', err);
    res.status(500).json({ error: 'Failed to create fee payment.' });
  }
});

router.put('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  const amount = Number(req.body.amount ?? 0);
  const paidAmount = Number(req.body.paid_amount ?? 0);
  const dueDate = req.body.due_date || null;
  const note = (req.body.note || '').trim() || null;

  if (!id || amount <= 0 || paidAmount < 0) {
    return res.status(400).json({ error: 'Valid id, amount, and paid amount are required.' });
  }
  if (paidAmount > amount) {
    return res.status(400).json({ error: 'Paid amount cannot be more than total amount.' });
  }

  const status = calcStatus(amount, paidAmount);
  const normalizedDueDate = normalizeDueDate(status, dueDate);
  if (status === 'partial' && !normalizedDueDate) {
    return res.status(400).json({
      error: 'Due date is required when the payment is partial.',
    });
  }
  const paidAt = status === 'paid' ? new Date().toISOString() : null;

  try {
    const [result] = await pool.execute(
      `UPDATE fee_payments
       SET amount = ?, paid_amount = ?, due_date = ?, status = ?, paid_at = ?, note = ?
       WHERE id = ?`,
      [amount, paidAmount, normalizedDueDate, status, paidAt, note, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee payment not found.' });
    }
    res.json(await fetchPaymentById(id));
  } catch (err) {
    console.error('Update fee payment:', err);
    res.status(500).json({ error: 'Failed to update fee payment.' });
  }
});

router.delete('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id.' });

  try {
    const [result] = await pool.execute('DELETE FROM fee_payments WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee payment not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete fee payment:', err);
    res.status(500).json({ error: 'Failed to delete fee payment.' });
  }
});

module.exports = router;
