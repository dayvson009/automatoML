const express = require('express');
const { getOrder } = require('../services/orderService');
const { sendFlowMessage } = require('../services/flowMessageService');
const { getMessagesOrderId, getMessage } = require('../services/messageService');
const { sendNotificationEmail } = require('../services/emailService');
const db = require('../services/db');

const router = express.Router();

// Conjunto em memória para rastrear e travar ordens com fluxos de mensagens ativos
const activeFlows = new Set();

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

    // Verificar se a ordem já está em processamento
    if (activeFlows.has(orderId)) {
      console.log(`Ordem ${orderId} já possui um fluxo ativo ou está em processamento.`);
      return res.status(200).send('Processando.');
    }

    // Trava a ordem em memória antes de qualquer atraso ou requisição HTTP
    activeFlows.add(orderId);

    // Processamento assíncrono em segundo plano para não bloquear a resposta do webhook
    const runProcessing = async () => {
      try {
        // Delay de 3 segundos para garantir que a API do Mercado Livre esteja atualizada
        await new Promise(resolve => setTimeout(resolve, 3000));

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

            // Disparar e aguardar todo o envio do fluxo sequencial (segurando a trava)
            await sendFlowMessage(orderId, clientId, firstNameClient, account.id, productId, nameProduct);

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
      } finally {
        // Garantir que a trava seja liberada sob qualquer circunstância
        activeFlows.delete(orderId);
      }
    };

    // Iniciar processamento em segundo plano
    runProcessing();
  } else if (topic === 'messages') {
    const actions = notificacao.actions || [];
    console.log(`Notificação de mensagens recebida para a conta "${account.nickname}". Ações:`, actions);

    // Salvar no log de notificações
    db.insert('notifications_log', {
      ml_account_id: account.id,
      topic: topic,
      status: 'info',
      log_message: `Notificação de mensagens recebida. Ação: ${actions.join(', ') || 'N/A'}. Recurso: ${resource}`
    });

    // Apenas enviar e-mail se for uma nova mensagem criada
    if (actions.includes('created')) {
      if (account.notification_emails) {
        const subject = `Nova Mensagem - ${account.nickname}`;
        const text = `Olá!\n\nUma nova notificação do tópico "messages" (nova mensagem criada) foi recebida na conta "${account.nickname}".\n\nRecurso: ${resource}\n\nPor favor, acesse seu painel do Mercado Livre para verificar.`;
        sendNotificationEmail(account.notification_emails, subject, text);
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
