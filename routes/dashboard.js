const express = require('express');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { hasPermission } = require('../lib/permissions');
const { isTeacher, getTeacherClassIds } = require('../lib/teacherScope');

const router = express.Router();

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function lastNDates(n) {
  const dates = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dd}`);
  }
  return dates;
}

function formatShortDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

router.get('/analytics', requireLogin, async (req, res) => {
  const role = req.session.role;
  const userId = req.session.userId;
  const year = new Date().getFullYear();
  const payload = {};

  try {
    if (hasPermission(role, 'fees.view')) {
      const [monthlyRows] = await pool.execute(
        `SELECT
           fp.month,
           COALESCE(SUM(fp.amount), 0) AS billed,
           COALESCE(SUM(fp.paid_amount), 0) AS collected
         FROM fee_payments fp
         WHERE fp.year = ?
         GROUP BY fp.month
         ORDER BY fp.month ASC`,
        [year]
      );

      const monthMap = Object.fromEntries(
        monthlyRows.map((row) => [Number(row.month), row])
      );

      payload.fee_collection = MONTH_LABELS.map((label, index) => {
        const month = index + 1;
        const row = monthMap[month];
        return {
          month: label,
          billed: Number(row?.billed || 0),
          collected: Number(row?.collected || 0),
        };
      });

      const [statusRows] = await pool.execute(
        `SELECT
           SUM(fp.status = 'paid') AS paid,
           SUM(fp.status = 'partial') AS partial,
           SUM(fp.status = 'unpaid') AS unpaid
         FROM fee_payments fp
         WHERE fp.year = ?`,
        [year]
      );

      const paid = Number(statusRows[0]?.paid || 0);
      const partial = Number(statusRows[0]?.partial || 0);
      const unpaid = Number(statusRows[0]?.unpaid || 0);

      payload.fee_status = [
        { name: 'Paid', value: paid, color: '#059669' },
        { name: 'Partial', value: partial, color: '#d97706' },
        { name: 'Unpaid', value: unpaid, color: '#64748b' },
      ].filter((item) => item.value > 0);
    }

    if (hasPermission(role, 'attendance.manage')) {
      const dates = lastNDates(7);
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      let extraWhere = '';
      const params = [startDate, endDate];

      if (isTeacher(req)) {
        const classIds = await getTeacherClassIds(userId);
        if (classIds.length === 0) {
          payload.attendance_trend = dates.map((date) => ({
            date,
            label: formatShortDate(date),
            present: 0,
            absent: 0,
          }));
        } else {
          const placeholders = classIds.map(() => '?').join(', ');
          extraWhere = ` AND s.class_id IN (${placeholders})`;
          params.push(...classIds);

          const [attRows] = await pool.execute(
            `SELECT
               a.date,
               SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present,
               SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent
             FROM student_attendance a
             INNER JOIN students s ON s.id = a.student_id
             WHERE a.date >= ? AND a.date <= ?${extraWhere}
             GROUP BY a.date
             ORDER BY a.date ASC`,
            params
          );

          const attMap = Object.fromEntries(
            attRows.map((row) => [String(row.date).slice(0, 10), row])
          );

          payload.attendance_trend = dates.map((date) => ({
            date,
            label: formatShortDate(date),
            present: Number(attMap[date]?.present || 0),
            absent: Number(attMap[date]?.absent || 0),
          }));
        }
      } else {
        const [attRows] = await pool.execute(
          `SELECT
             a.date,
             SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present,
             SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent
           FROM student_attendance a
           WHERE a.date >= ? AND a.date <= ?
           GROUP BY a.date
           ORDER BY a.date ASC`,
          params
        );

        const attMap = Object.fromEntries(
          attRows.map((row) => [String(row.date).slice(0, 10), row])
        );

        payload.attendance_trend = dates.map((date) => ({
          date,
          label: formatShortDate(date),
          present: Number(attMap[date]?.present || 0),
          absent: Number(attMap[date]?.absent || 0),
        }));
      }
    }

    if (hasPermission(role, 'students.view')) {
      if (isTeacher(req)) {
        const classIds = await getTeacherClassIds(userId);
        if (classIds.length === 0) {
          payload.students_by_class = [];
        } else {
          const placeholders = classIds.map(() => '?').join(', ');
          const [classRows] = await pool.execute(
            `SELECT
               c.name AS class_name,
               COUNT(s.id) AS student_count
             FROM classes c
             LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
             WHERE c.id IN (${placeholders})
             GROUP BY c.id, c.name
             ORDER BY student_count DESC, c.name ASC`,
            classIds
          );
          payload.students_by_class = classRows.map((row) => ({
            class: row.class_name,
            students: Number(row.student_count || 0),
          }));
        }
      } else {
        const [classRows] = await pool.execute(
          `SELECT
             COALESCE(c.name, 'Unassigned') AS class_name,
             COUNT(s.id) AS student_count
           FROM students s
           LEFT JOIN classes c ON c.id = s.class_id
           WHERE s.status = 'active'
           GROUP BY c.id, c.name
           ORDER BY student_count DESC, class_name ASC`
        );
        payload.students_by_class = classRows.map((row) => ({
          class: row.class_name,
          students: Number(row.student_count || 0),
        }));
      }
    }

    res.json(payload);
  } catch (err) {
    console.error('Dashboard analytics:', err);
    res.status(500).json({ error: 'Failed to load dashboard analytics.' });
  }
});

module.exports = router;
