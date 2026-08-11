const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { getPermissionsForRole } = require('../lib/permissions');

const router = express.Router();

function wantsJson(req) {
  return req.xhr || (req.headers.accept || '').includes('application/json');
}

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const json = wantsJson(req) || req.is('application/json');

  if (!email || !password) {
    if (json) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }
    return res.redirect('/login?error=missing');
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const user = rows[0];
    if (!user) {
      if (json) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      return res.redirect('/login?error=invalid');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      if (json) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      return res.redirect('/login?error=invalid');
    }

    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.role = user.role;
    req.session.email = user.email;

    return req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        if (json) {
          return res.status(500).json({ error: 'Something went wrong. Please try again.' });
        }
        return res.redirect('/login?error=server');
      }
      if (json) {
        return res.json({
          ok: true,
          redirect: '/dashboard',
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
      }
      return res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Login error:', err);
    if (json) {
      return res.status(500).json({ error: 'Server error. Check the SQLite database.' });
    }
    return res.redirect('/login?error=server');
  }
});

router.post('/logout', (req, res) => {
  const json = wantsJson(req) || req.is('application/json');

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    if (json) {
      return res.json({ ok: true, redirect: '/login' });
    }
    return res.redirect('/login');
  });
});

router.get('/me', requireLogin, (req, res) => {
  const role = req.session.role;
  res.json({
    id: req.session.userId,
    name: req.session.name,
    email: req.session.email,
    role,
    permissions: getPermissionsForRole(role),
  });
});

router.post('/change-password', requireLogin, async (req, res) => {
  const currentPassword = req.body.currentPassword || req.body.current_password || '';
  const newPassword = req.body.newPassword || req.body.new_password || '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different from the current password.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
      passwordHash,
      req.session.userId,
    ]);

    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

module.exports = router;
