/**
 * Student code helpers: STU-0001, STU-0002, ...
 * Codes auto-fill the lowest free number, and renumber after deletes.
 */

function formatStudentCode(n) {
  return `STU-${String(n).padStart(4, '0')}`;
}

function parseStudentCodeNum(code) {
  const match = String(code || '').trim().match(/^STU-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

async function nextStudentCode(pool) {
  const [rows] = await pool.execute('SELECT student_code FROM students');
  const used = new Set();
  for (const row of rows) {
    const n = parseStudentCodeNum(row.student_code);
    if (n && n > 0) used.add(n);
  }

  let next = 1;
  while (used.has(next)) next += 1;
  return formatStudentCode(next);
}

/**
 * Reassign STU-0001..STU-NNNN by student id order so codes stay sequential
 * after deletes (no gaps).
 */
async function renumberStudentCodes(pool) {
  const [rows] = await pool.execute(
    'SELECT id FROM students ORDER BY id ASC'
  );

  const stamp = Date.now().toString(36);
  for (const row of rows) {
    await pool.execute('UPDATE students SET student_code = ? WHERE id = ?', [
      `TMP-${row.id}-${stamp}`,
      row.id,
    ]);
  }

  for (let i = 0; i < rows.length; i += 1) {
    await pool.execute('UPDATE students SET student_code = ? WHERE id = ?', [
      formatStudentCode(i + 1),
      rows[i].id,
    ]);
  }

  return rows.length;
}

function isStudentCodeTakenError(err) {
  if (err.code === 'ER_DUP_ENTRY') return true;
  const msg = String(err.message || '');
  return /UNIQUE constraint failed:\s*students\.student_code/i.test(msg);
}

module.exports = {
  formatStudentCode,
  parseStudentCodeNum,
  nextStudentCode,
  renumberStudentCodes,
  isStudentCodeTakenError,
};
