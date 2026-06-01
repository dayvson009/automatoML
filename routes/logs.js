const express = require('express');
const db = require('../services/db');
const { authMiddleware } = require('../services/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Obter logs de notificações recentes vinculadas às contas do usuário logado
router.get('/', (req, res) => {
  try {
    const accounts = db.find('ml_accounts', { user_id: req.user.id });
    const accountIds = accounts.map(a => a.id);

    const logs = db.get('notifications_log')
      .filter(l => accountIds.includes(l.ml_account_id))
      // Ordenar decrescente (mais recente primeiro)
      .sort((a, b) => b.id - a.id)
      .slice(0, 100); // Limitar a 100 registros para evitar lentidão

    const enriched = logs.map(log => {
      const account = accounts.find(a => a.id === log.ml_account_id);
      return {
        ...log,
        account_nickname: account ? account.nickname : 'Desconhecida'
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return res.status(500).json({ error: 'Erro ao buscar logs de atividades.' });
  }
});

module.exports = router;
