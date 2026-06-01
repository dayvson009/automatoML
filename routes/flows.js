const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../services/db');
const { authMiddleware } = require('../services/authMiddleware');

const router = express.Router();

// Configuração do multer para upload de imagens nos fluxos
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Proteger todas as rotas
router.use(authMiddleware);

// Obter todos os fluxos (programas) das contas do usuário logado
router.get('/', (req, res) => {
  try {
    const accounts = db.find('ml_accounts', { user_id: req.user.id });
    const accountIds = accounts.map(a => a.id);

    const allFlows = db.get('message_flows').filter(f => accountIds.includes(f.ml_account_id));
    
    // Enriquecer os fluxos com o nickname da conta e a lista de mensagens ordenadas
    const enriched = allFlows.map(flow => {
      const account = accounts.find(a => a.id === flow.ml_account_id);
      const messages = db.find('flow_messages', { flow_id: flow.id })
        .sort((a, b) => a.step_order - b.step_order);
      
      return {
        ...flow,
        account_nickname: account ? account.nickname : 'Desconhecida',
        messages
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('Erro ao listar fluxos:', error);
    return res.status(500).json({ error: 'Erro ao listar fluxos.' });
  }
});

// Criar um novo fluxo (programa)
router.post('/', (req, res) => {
  const { ml_account_id, name, product_id } = req.body;

  if (!ml_account_id || !name || !product_id) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Validar se a conta pertence ao usuário logado
    const account = db.findOne('ml_accounts', { id: Number(ml_account_id), user_id: req.user.id });
    if (!account) {
      return res.status(403).json({ error: 'Conta não encontrada ou permissão negada.' });
    }

    const newFlow = db.insert('message_flows', {
      ml_account_id: Number(ml_account_id),
      name,
      product_id
    });

    return res.status(201).json(newFlow);
  } catch (error) {
    console.error('Erro ao criar fluxo:', error);
    return res.status(500).json({ error: 'Erro ao criar fluxo.' });
  }
});

// Atualizar fluxo (nome ou palavras-chave)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, product_id } = req.body;

  try {
    const flow = db.findOne('message_flows', { id: Number(id) });
    if (!flow) {
      return res.status(404).json({ error: 'Fluxo não encontrado.' });
    }

    // Validar acesso à conta dona do fluxo
    const account = db.findOne('ml_accounts', { id: flow.ml_account_id, user_id: req.user.id });
    if (!account) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (product_id !== undefined) updates.product_id = product_id;

    db.update('message_flows', { id: flow.id }, updates);
    return res.json({ message: 'Fluxo atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar fluxo:', error);
    return res.status(500).json({ error: 'Erro ao atualizar fluxo.' });
  }
});

// Deletar um fluxo
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const flow = db.findOne('message_flows', { id: Number(id) });
    if (!flow) {
      return res.status(404).json({ error: 'Fluxo não encontrado.' });
    }

    // Validar acesso
    const account = db.findOne('ml_accounts', { id: flow.ml_account_id, user_id: req.user.id });
    if (!account) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    // Excluir as mensagens vinculadas ao fluxo
    db.delete('flow_messages', { flow_id: flow.id });
    db.delete('message_flows', { id: flow.id });

    return res.json({ message: 'Fluxo e suas mensagens excluídos com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir fluxo:', error);
    return res.status(500).json({ error: 'Erro ao excluir fluxo.' });
  }
});

// -------------------------------------------------------------
// ROTAS DE MENSAGENS DO FLUXO (STEPS)
// -------------------------------------------------------------

// Adicionar passo de mensagem no fluxo (suporta upload de imagem opcional)
router.post('/:flowId/messages', upload.single('attachment'), (req, res) => {
  const { flowId } = req.params;
  const { message_text, after_seconds } = req.body;

  if (!message_text) {
    return res.status(400).json({ error: 'O texto da mensagem é obrigatório.' });
  }

  try {
    const flow = db.findOne('message_flows', { id: Number(flowId) });
    if (!flow) {
      return res.status(404).json({ error: 'Fluxo não encontrado.' });
    }

    // Validar acesso à conta dona do fluxo
    const account = db.findOne('ml_accounts', { id: flow.ml_account_id, user_id: req.user.id });
    if (!account) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    // Obter ordem sequencial do novo passo
    const existingMessages = db.find('flow_messages', { flow_id: flow.id });
    const nextOrder = existingMessages.length > 0 
      ? Math.max(...existingMessages.map(m => m.step_order || 0)) + 1 
      : 1;

    // Se houver arquivo enviado pelo formulário, salvar o caminho absoluto do sistema
    const attachmentPath = req.file ? req.file.path : null;

    const newMessage = db.insert('flow_messages', {
      flow_id: flow.id,
      step_order: nextOrder,
      message_text,
      attachment_path: attachmentPath,
      after_seconds: Number(after_seconds) || 0
    });

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erro ao adicionar mensagem no fluxo:', error);
    return res.status(500).json({ error: 'Erro ao adicionar mensagem.' });
  }
});

// Excluir passo de mensagem e reordenar os passos restantes
router.delete('/:flowId/messages/:messageId', (req, res) => {
  const { flowId, messageId } = req.params;

  try {
    const flow = db.findOne('message_flows', { id: Number(flowId) });
    if (!flow) {
      return res.status(404).json({ error: 'Fluxo não encontrado.' });
    }

    // Validar acesso
    const account = db.findOne('ml_accounts', { id: flow.ml_account_id, user_id: req.user.id });
    if (!account) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const message = db.findOne('flow_messages', { id: Number(messageId), flow_id: flow.id });
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada neste fluxo.' });
    }

    // Se houver anexo físico, tentar remover do disco
    if (message.attachment_path && fs.existsSync(message.attachment_path)) {
      try {
        fs.unlinkSync(message.attachment_path);
      } catch (err) {
        console.error('Erro ao deletar arquivo físico do anexo:', err);
      }
    }

    // Excluir registro
    db.delete('flow_messages', { id: message.id });

    // Reordenar os passos restantes para não deixar lacunas na sequência
    const remaining = db.find('flow_messages', { flow_id: flow.id })
      .sort((a, b) => a.step_order - b.step_order);
    
    remaining.forEach((msg, index) => {
      db.update('flow_messages', { id: msg.id }, { step_order: index + 1 });
    });

    return res.json({ message: 'Mensagem deletada e fluxo reordenado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    return res.status(500).json({ error: 'Erro ao deletar mensagem.' });
  }
});

// Atualizar passo de mensagem existente (texto e/ou atraso em segundos)
router.put('/:flowId/messages/:messageId', (req, res) => {
  const { flowId, messageId } = req.params;
  const { message_text, after_seconds } = req.body;

  try {
    const flow = db.findOne('message_flows', { id: Number(flowId) });
    if (!flow) {
      return res.status(404).json({ error: 'Fluxo não encontrado.' });
    }

    // Validar acesso à conta dona do fluxo
    const account = db.findOne('ml_accounts', { id: flow.ml_account_id, user_id: req.user.id });
    if (!account) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const message = db.findOne('flow_messages', { id: Number(messageId), flow_id: flow.id });
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada neste fluxo.' });
    }

    const updates = {};
    if (message_text !== undefined) updates.message_text = message_text;
    if (after_seconds !== undefined) updates.after_seconds = Number(after_seconds) || 0;

    db.update('flow_messages', { id: message.id }, updates);

    return res.json({ message: 'Mensagem atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    return res.status(500).json({ error: 'Erro ao atualizar mensagem.' });
  }
});

module.exports = router;
