const express = require('express');
const db = require('../services/db');
const { authMiddleware } = require('../services/authMiddleware');

const router = express.Router();

// Middleware de proteção em todas as rotas deste router
router.use(authMiddleware);

// Obter todas as contas do ML do usuário logado
router.get('/', (req, res) => {
  try {
    const accounts = db.find('ml_accounts', { user_id: req.user.id });
    // Remove as chaves secretas e tokens da resposta por segurança
    const sanitized = accounts.map(acc => ({
      id: acc.id,
      nickname: acc.nickname,
      ml_user_id: acc.ml_user_id,
      app_id: acc.app_id,
      notifications_enabled: acc.notifications_enabled,
      notify_other_topics: acc.notify_other_topics,
      notification_emails: acc.notification_emails,
      has_token: !!acc.access_token,
      created_at: acc.created_at
    }));
    return res.json(sanitized);
  } catch (error) {
    console.error('Erro ao listar contas do ML:', error);
    return res.status(500).json({ error: 'Erro ao listar contas.' });
  }
});

// Adicionar uma nova conta do ML
router.post('/', (req, res) => {
  const { nickname, app_id, secret_key, notification_emails } = req.body;

  if (!nickname || !app_id || !secret_key) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    const newAccount = db.insert('ml_accounts', {
      user_id: req.user.id,
      nickname,
      app_id,
      secret_key,
      notifications_enabled: 1,
      notify_other_topics: 0,
      notification_emails: notification_emails || '',
      access_token: null,
      refresh_token: null,
      token_expires_at: null
    });
    return res.status(201).json(newAccount);
  } catch (error) {
    console.error('Erro ao adicionar conta:', error);
    return res.status(500).json({ error: 'Erro ao adicionar conta.' });
  }
});

// Atualizar uma conta do ML
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nickname, app_id, secret_key, notifications_enabled, notify_other_topics, notification_emails } = req.body;

  try {
    // Validar se a conta pertence ao usuário logado
    const account = db.findOne('ml_accounts', { id: Number(id), user_id: req.user.id });
    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada ou sem permissão.' });
    }

    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (app_id !== undefined) {
      updates.app_id = app_id;
    }
    if (secret_key !== undefined) updates.secret_key = secret_key;
    if (notifications_enabled !== undefined) updates.notifications_enabled = Number(notifications_enabled);
    if (notify_other_topics !== undefined) updates.notify_other_topics = Number(notify_other_topics);
    if (notification_emails !== undefined) updates.notification_emails = notification_emails;

    db.update('ml_accounts', { id: account.id }, updates);
    return res.json({ message: 'Conta atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    return res.status(500).json({ error: 'Erro ao atualizar conta.' });
  }
});

// Deletar conta do ML
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const account = db.findOne('ml_accounts', { id: Number(id), user_id: req.user.id });
    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada ou sem permissão.' });
    }

    // Excluir a conta (cascateará exclusões para fluxos e mensagens do banco devido à lógica estruturada)
    db.delete('ml_accounts', { id: account.id });
    
    // Como nossa simulação de JSON DB não implementa Cascading Delete nativo de SQL por chaves estrangeiras:
    // Vamos limpar os fluxos e logs da conta deletada manualmente para manter a integridade!
    const flows = db.find('message_flows', { ml_account_id: account.id });
    for (const flow of flows) {
      db.delete('flow_messages', { flow_id: flow.id });
    }
    db.delete('message_flows', { ml_account_id: account.id });
    db.delete('notifications_log', { ml_account_id: account.id });

    return res.json({ message: 'Conta e dados relacionados excluídos com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    return res.status(500).json({ error: 'Erro ao deletar conta.' });
  }
});

// Obter URL do OAuth do Mercado Livre para autorização
router.get('/:id/auth-url', (req, res) => {
  const { id } = req.params;

  try {
    const account = db.findOne('ml_accounts', { id: Number(id), user_id: req.user.id });
    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada.' });
    }

    const settings = db.findOne('settings', { id: 1 }) || { redirect_uri: 'http://localhost:3000/tg' };
    const redirectUri = settings.redirect_uri;

    // Gerar link de autorização do ML com o ID da conta inserido no state
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${account.app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${account.id}`;
    return res.json({ url: authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    return res.status(500).json({ error: 'Erro ao gerar link de autorização.' });
  }
});

module.exports = router;
