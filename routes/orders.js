// /routes/orders.js
const express = require('express');
const { getOrder, getOrders } = require('../services/orderService');
const { sendMessage } = require('../services/messageService');
const { uploadAttachment } = require('../services/attachmentService');
const { authMiddleware } = require('../services/authMiddleware');
const db = require('../services/db');

const router = express.Router();

// Proteger rotas de teste de ordens
router.use(authMiddleware);

// Endpoint para obter ordem por ID
router.get('/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        // Encontrar a primeira conta conectada do usuário para teste
        const account = db.findOne('ml_accounts', { user_id: req.user.id });
        if (!account || !account.access_token) {
            return res.status(400).json({ error: 'Nenhuma conta do Mercado Livre vinculada ou autorizada.' });
        }
        const order = await getOrder(orderId, account.access_token);
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter a ordem' });
    }
});

// Endpoint para obter ordens do vendedor
router.get('/userId/:vendedorId', async (req, res) => {
    const { vendedorId } = req.params;
    try {
        const account = db.findOne('ml_accounts', { ml_user_id: String(vendedorId), user_id: req.user.id });
        if (!account || !account.access_token) {
            return res.status(400).json({ error: 'Conta do vendedor não encontrada ou não autorizada.' });
        }
        const orders = await getOrders(vendedorId, account.access_token);
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter as ordens' });
    }
});

// Endpoint para enviar mensagem de teste
router.post('/:orderId/sendMensagem', async (req, res) => {
    const { orderId } = req.params;
    const { message, userId } = req.body; // userId aqui é o clientId do comprador

    try {
        // Encontrar a conta proprietária associada à ordem ou a primeira conectada
        const account = db.findOne('ml_accounts', { user_id: req.user.id });
        if (!account || !account.access_token) {
            return res.status(400).json({ error: 'Nenhuma conta do Mercado Livre autorizada.' });
        }

        const response = await sendMessage(
            orderId, 
            message, 
            userId, 
            account.ml_user_id, 
            account.access_token
        );
        res.status(200).json({ success: 'Mensagem enviada com sucesso', response });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Endpoint para upload de anexo de teste
router.post('/upload', async (req, res) => {
    const { filePath } = req.body;
  
    try {
        const account = db.findOne('ml_accounts', { user_id: req.user.id });
        if (!account || !account.access_token) {
            return res.status(400).json({ error: 'Nenhuma conta do Mercado Livre autorizada.' });
        }
        const result = await uploadAttachment(filePath, account.access_token);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar anexo' });
    }
});

module.exports = router;
