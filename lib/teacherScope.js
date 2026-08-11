const pool = require('../config/db');

function isTeacher(req) {
  return req.session?.role === 'teachers';
}

async function getTeacherClassIds(userId) {
  const [rows] = await pool.execute(
    'SELECT id FROM classes WHERE teacher_id = ?',
    [userId]
  );
  return rows.map((row) => Number(row.id));
}

async function teacherOwnsClass(userId, classId) {
  if (!classId) return false;
  const [rows] = await pool.execute(
    'SELECT id FROM classes WHERE id = ? AND teacher_id = ? LIMIT 1',
    [Number(classId), userId]
  );
  return Boolean(rows[0]);
}

async function teacherOwnsStudent(userId, studentId) {
  if (!studentId) return false;
  const [rows] = await pool.execute(
    `SELECT s.id
     FROM students s
     INNER JOIN classes c ON c.id = s.class_id
     WHERE s.id = ? AND c.teacher_id = ?
     LIMIT 1`,
    [Number(studentId), userId]
  );
  return Boolean(rows[0]);
}

async function teacherOwnsAttendance(userId, attendanceId) {
  if (!attendanceId) return false;
  const [rows] = await pool.execute(
    `SELECT a.id
     FROM student_attendance a
     INNER JOIN students s ON s.id = a.student_id
     INNER JOIN classes c ON c.id = s.class_id
     WHERE a.id = ? AND c.teacher_id = ?
     LIMIT 1`,
    [Number(attendanceId), userId]
  );
  return Boolean(rows[0]);
}

module.exports = {
  isTeacher,
  getTeacherClassIds,
  teacherOwnsClass,
  teacherOwnsStudent,
  teacherOwnsAttendance,
};
