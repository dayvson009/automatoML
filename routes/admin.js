const express = require('express');
const db = require('../services/db');
const { authMiddleware, adminMiddleware } = require('../services/authMiddleware');

const router = express.Router();

// Aplicar middlewares de autenticação e papel de admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Listar todos os usuários do SaaS
router.get('/users', (req, res) => {
  try {
    const users = db.get('users');
    // Higienizar removendo senhas
    const sanitized = users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at
    }));
    return res.json(sanitized);
  } catch (error) {
    console.error('Erro ao listar usuários para o admin:', error);
    return res.status(500).json({ error: 'Erro ao obter lista de usuários.' });
  }
});

// Habilitar ou desabilitar conta de usuário (bloqueio por inadimplência)
router.put('/users/:id/toggle-active', (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = db.findOne('users', { id: Number(id) });
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Evitar auto-bloqueio do admin
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode desativar sua própria conta de administrador.' });
    }

    const newStatus = targetUser.is_active === 1 ? 0 : 1;
    db.update('users', { id: targetUser.id }, { is_active: newStatus });

    console.log(`Usuário ${targetUser.email} foi ${newStatus === 1 ? 'ATIVADO' : 'DESATIVADO'} pelo admin ${req.user.email}`);
    return res.json({ 
      message: `Usuário ${newStatus === 1 ? 'ativado' : 'desativado'} com sucesso!`, 
      is_active: newStatus 
    });
  } catch (error) {
    console.error('Erro ao alternar status do usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao alterar status.' });
  }
});

// Obter configurações globais
router.get('/settings', (req, res) => {
  try {
    const settings = db.findOne('settings', { id: 1 }) || { redirect_uri: 'http://localhost:3000/tg' };
    return res.json(settings);
  } catch (error) {
    console.error('Erro ao obter configurações globais:', error);
    return res.status(500).json({ error: 'Erro ao obter configurações.' });
  }
});

// Atualizar configurações globais
router.put('/settings', (req, res) => {
  const { redirect_uri } = req.body;

  if (!redirect_uri) {
    return res.status(400).json({ error: 'A Redirect URI é obrigatória.' });
  }

  try {
    const settings = db.findOne('settings', { id: 1 });
    if (!settings) {
      db.insert('settings', { id: 1, redirect_uri });
    } else {
      db.update('settings', { id: 1 }, { redirect_uri });
    }
    return res.json({ message: 'Configurações globais salvas com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar configurações globais:', error);
    return res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

module.exports = router;
