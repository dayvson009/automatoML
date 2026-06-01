const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'ml-saas-secret-key-super-secure';

const authMiddleware = (req, res, next) => {
  // O cookie-parser deve estar configurado no app.js para ler cookies
  const token = req.cookies && req.cookies.token;

  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findOne('users', { id: decoded.id });
    if (!user || user.is_active !== 1) {
      res.clearCookie('token');
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ error: 'Sua conta está desativada. Faça login novamente.' });
      }
      return res.redirect('/login?error=inactive');
    }
    req.user = user;
    
    // Disponibiliza as informações do usuário logado para as views EJS
    res.locals.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    return res.redirect('/login');
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    return res.status(403).send('Acesso negado. Apenas administradores.');
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
