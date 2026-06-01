const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/db');
const { JWT_SECRET } = require('../services/authMiddleware');

const router = express.Router();

// Registro de Usuário
router.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    // Verificar se já existe
    const userExists = db.prepare ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : db.findOne('users', { email });
    if (userExists) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    db.insert('users', {
      email,
      password_hash: hash,
      role: 'user',
      is_active: 1
    });

    return res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// Login de Usuário
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const user = db.findOne('users', { email });
    if (!user) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    // Verificar se usuário está ativo pelo admin master
    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Sua conta está desativada. Contate o administrador.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Salvar token em um cookie HTTP-only
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    return res.json({ message: 'Login bem-sucedido!', role: user.role });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.redirect('/login');
});

module.exports = router;
