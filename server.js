require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const clientDist = path.join(__dirname, 'client', 'dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'office-mis-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// API + auth must be registered before static/SPA fallback
app.use('/auth', authRoutes);
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/students', require('./routes/students'));
app.use('/api/student-attendance', require('./routes/student-attendance'));
app.use('/api/fee-types', require('./routes/fee-types'));
app.use('/api/fee-payments', require('./routes/fee-payments'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/login.html', (req, res) => res.redirect('/login'));
app.get('/dashboard.html', (req, res) => res.redirect('/dashboard'));

if (hasClientBuild) {
  app.use(express.static(clientDist, { index: false }));

  app.get(
    ['/', '/login', '/dashboard', '/classes', '/students', '/student-attendance', '/fees', '/users', '/roles', '/change-password'],
    (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  );

  app.use((req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    if (req.method === 'GET' && req.accepts('html')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    return res.status(404).json({ error: 'Not found.' });
  });
} else {
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    return res.redirect('http://localhost:5173' + (req.path === '/' ? '/login' : req.path));
  });
}

app.listen(PORT, () => {
  console.log(`Course MIS at http://localhost:${PORT}`);
});
