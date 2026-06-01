const express = require('express');
const { getOrder } = require('../services/orderService');
const { sendFlowMessage } = require('../services/flowMessageService');
const { getMessagesOrderId, getMessage } = require('../services/messageService');
const { sendNotificationEmail } = require('../services/emailService');
const db = require('../services/db');

const router = express.Router();

router.post('/', async (req, res) => {
  const notificacao = req.body;
  console.log('Notificação recebida do Mercado Livre:', notificacao);

  // Mercado Livre envia topic, resource, user_id (CustID do vendedor) e application_id
  const mlUserId = notificacao.user_id ? String(notificacao.user_id) : null;
  const appId = notificacao.application_id ? String(notificacao.application_id) : null;

  if (!mlUserId) {
    return res.status(200).send('Ignorado: Sem user_id no payload.');
  }

  // Buscar a conta correspondente no banco
  const account = db.findOne('ml_accounts', { ml_user_id: mlUserId }) || db.findOne('ml_accounts', { app_id: appId });

  if (!account) {
    console.log(`Nenhuma conta do ML encontrada no banco para ml_user_id: ${mlUserId} ou app_id: ${appId}`);
    return res.status(200).send('Ignorado: Conta do ML não cadastrada no sistema.');
  }

  // Verificar se o usuário proprietário está ativo
  const user = db.findOne('users', { id: account.user_id });
  if (!user || user.is_active !== 1) {
    console.log(`Conta de usuário ID ${account.user_id} inativa. Processamento ignorado.`);
    return res.status(200).send('Ignorado: Usuário inativo.');
  }

  // Verificar se notificações estão ativadas para esta conta específica
  if (account.notifications_enabled !== 1) {
    console.log(`Notificações desabilitadas para a conta: ${account.nickname}`);
    return res.status(200).send('Ignorado: Notificações desabilitadas nesta conta.');
  }

  const topic = notificacao.topic;
  const resource = notificacao.resource;

  if (topic === 'orders_v2') {
    const orderId = resource.split('/')[2];

    // Verificar se já processamos com sucesso para evitar repetição
    const alreadyProcessed = db.findOne('notifications_log', {
      ml_account_id: account.id,
      order_id: orderId,
      status: 'success'
    });

    if (alreadyProcessed) {
      console.log(`Ordem ${orderId} já processada com sucesso anteriormente.`);
      return res.status(200).send('Já processado.');
    }

    // Delay de 3 segundos para garantir que a API do Mercado Livre esteja atualizada
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const detailOrder = await getOrder(orderId, account.access_token);

      // Extrair informações de pagamento e produto
      const payment = detailOrder.payments && detailOrder.payments[0];
      const nameProduct = payment ? payment.reason : (detailOrder.order_items && detailOrder.order_items[0] && detailOrder.order_items[0].item.title) || 'Produto sem título';
      const productId = (detailOrder.order_items && detailOrder.order_items[0] && detailOrder.order_items[0].item.id) || null;
      const clientId = detailOrder.buyer && detailOrder.buyer.id;
      const firstNameClient = (detailOrder.buyer && detailOrder.buyer.first_name) || 'Cliente';
      const lastNameClient = (detailOrder.buyer && detailOrder.buyer.last_name) || '';

      if (payment && payment.status === 'approved') {
        // Verificar mensagens existentes para garantir que o bot não envie duplicado
        const messagesThisOrder = await getMessagesOrderId(orderId, account.ml_user_id, account.access_token);
        const sellerSent = messagesThisOrder.messages && messagesThisOrder.messages.some(m => String(m.from.user_id) === String(account.ml_user_id));

        if (messagesThisOrder.paging.total === 0 || !sellerSent) {
          // Salvar log inicial de processamento
          db.insert('notifications_log', {
            ml_account_id: account.id,
            order_id: orderId,
            topic: 'orders_v2',
            status: 'processing',
            log_message: `Nova venda aprovada: "${nameProduct}" (ID: ${productId}). Iniciando o fluxo de atendimento.`
          });

          // Disparar o fluxo de mensagens de forma assíncrona
          sendFlowMessage(orderId, clientId, firstNameClient, account.id, productId, nameProduct);

          // Enviar alerta por e-mail se houver destinatários cadastrados
          if (account.notification_emails) {
            const subject = `Venda Aprovada! - ${account.nickname}`;
            const text = `Olá!\n\nUma nova venda foi aprovada na conta "${account.nickname}"!\n\nProduto: ${nameProduct}\nCliente: ${firstNameClient} ${lastNameClient}\nID do Pedido: ${orderId}\n\nO fluxo de atendimento sequencial já foi iniciado no chat do Mercado Livre.`;
            sendNotificationEmail(account.notification_emails, subject, text);
          }
        } else {
          console.log(`O bot já enviou mensagens para a ordem ${orderId}. Ignorando re-envio.`);
        }
      }
    } catch (error) {
      console.error(`Erro ao processar notificação de venda ${orderId}:`, error);
      db.insert('notifications_log', {
        ml_account_id: account.id,
        order_id: orderId,
        topic: 'orders_v2',
        status: 'error',
        log_message: `Erro ao processar notificação de venda: ${error.message}`
      });
    }
  } else if (topic === 'messages') {
    const messageId = resource.includes('/') ? resource.split('/').pop() : resource;
    
    try {
      const messageDetail = await getMessage(messageId, account.access_token);
      
      // Se a mensagem veio do comprador (diferente do ml_user_id do vendedor)
      if (String(messageDetail.from.user_id) !== String(account.ml_user_id)) {
        console.log(`Mensagem recebida do cliente para a conta "${account.nickname}". Enviando e-mail...`);
        
        db.insert('notifications_log', {
          ml_account_id: account.id,
          topic: topic,
          status: 'info',
          log_message: `Mensagem recebida do cliente (${messageDetail.from.name || 'Cliente'}). Conteúdo: "${messageDetail.text}"`
        });

        if (account.notification_emails) {
          const subject = `Nova Mensagem de Cliente - ${account.nickname}`;
          const text = `Olá!\n\nVocê recebeu uma nova mensagem de um cliente na conta "${account.nickname}".\n\nRemetente: ${messageDetail.from.name || 'Cliente'} (ID: ${messageDetail.from.user_id})\nConteúdo da Mensagem:\n"${messageDetail.text}"\n\nPor favor, acesse seu painel do Mercado Livre para responder manualmente, pois o robô não responderá de forma automática.`;
          sendNotificationEmail(account.notification_emails, subject, text);
        }
      } else {
        console.log(`Mensagem enviada pela própria conta (${account.nickname}). Ignorando notificação por e-mail para evitar loop.`);
      }
    } catch (error) {
      console.error(`Erro ao obter detalhes da mensagem ${messageId}:`, error);
      
      // Fallback: se der erro mas notify_other_topics estiver ativado, envia e-mail genérico
      if (account.notify_other_topics === 1) {
        db.insert('notifications_log', {
          ml_account_id: account.id,
          topic: topic,
          status: 'error',
          log_message: `Erro ao obter detalhes da mensagem ${messageId}. Enviando notificação genérica.`
        });

        if (account.notification_emails) {
          const subject = `Nova Notificação (${topic}) - ${account.nickname}`;
          const text = `Olá!\n\nUma nova notificação do tópico "${topic}" foi recebida na conta "${account.nickname}".\n\nRecurso: ${resource}\n\nOcorreu um erro ao obter detalhes da mensagem, mas você pode verificar diretamente no painel do Mercado Livre.`;
          sendNotificationEmail(account.notification_emails, subject, text);
        }
      }
    }
  } else {
    // Outros tópicos (perguntas, feedback, etc.)
    if (account.notify_other_topics === 1) {
      console.log(`Recebida notificação de outro tópico (${topic}). Enviando e-mail...`);
      db.insert('notifications_log', {
        ml_account_id: account.id,
        topic: topic,
        status: 'info',
        log_message: `Notificação recebida para o tópico: ${topic}. Recurso: ${resource}`
      });

      if (account.notification_emails) {
        const subject = `Nova Notificação (${topic}) - ${account.nickname}`;
        const text = `Olá!\n\nUma nova notificação do tópico "${topic}" foi recebida na conta "${account.nickname}".\n\nRecurso: ${resource}\n\nPor favor, acesse seu painel do Mercado Livre para verificar.`;
        sendNotificationEmail(account.notification_emails, subject, text);
      }
    }
  }

  res.status(200).send('Notificação processada com sucesso!');
});

module.exports = router;
