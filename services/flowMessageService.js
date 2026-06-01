const { sendMessage } = require('./messageService');
const { uploadAttachment } = require('./attachmentService');
const db = require('./db');

/**
 * Encontra um fluxo de mensagens para uma conta do Mercado Livre cujo
 * ID de produto corresponda ao ID do produto vendido.
 */
const findFlowForProduct = (mlAccountId, productId) => {
  if (!productId) return null;
  const flows = db.find('message_flows', { ml_account_id: Number(mlAccountId) });

  for (const flow of flows) {
    if (flow.product_id && flow.product_id.trim().toUpperCase() === productId.trim().toUpperCase()) {
      return flow;
    }
  }

  return null;
};

/**
 * Executa o fluxo de envio de mensagens sequenciais de forma assíncrona
 */
const sendFlowMessage = async (orderId, clientId, nameClient, mlAccountId, productId, productTitle) => {
  try {
    const account = db.findOne('ml_accounts', { id: Number(mlAccountId) });
    if (!account) {
      console.error(`Conta ML ID ${mlAccountId} não encontrada para o fluxo de mensagens.`);
      return;
    }

    const flow = findFlowForProduct(mlAccountId, productId);
    if (!flow) {
      console.log(`Nenhum fluxo correspondente encontrado na conta "${account.nickname}" para o produto ID "${productId}" (${productTitle})`);
      db.insert('notifications_log', {
        ml_account_id: account.id,
        order_id: orderId,
        topic: 'orders_v2',
        status: 'ignored',
        log_message: `Nenhum fluxo correspondeu ao ID do produto: "${productId}" (${productTitle})`
      });
      return;
    }

    // Buscar mensagens do fluxo e ordenar por step_order
    const messages = db.find('flow_messages', { flow_id: flow.id })
      .sort((a, b) => a.step_order - b.step_order);

    if (messages.length === 0) {
      console.log(`O fluxo "${flow.name}" não possui nenhuma mensagem configurada.`);
      return;
    }

    console.log(`Iniciando fluxo "${flow.name}" (${messages.length} mensagens) para a ordem ${orderId}...`);

    for (const msg of messages) {
      // Aguardar o tempo configurado (after_seconds)
      if (msg.after_seconds > 0) {
        console.log(`Aguardando ${msg.after_seconds} segundos antes do envio do passo ${msg.step_order}...`);
        await new Promise(resolve => setTimeout(resolve, msg.after_seconds * 1000));
      }

      try {
        // Substituir o placeholder do nome do cliente
        const personalizedMessage = msg.message_text.replace(/{{nameClient}}/g, nameClient);

        // Upload do anexo se houver
        let attachmentIds = null;
        if (msg.attachment_path) {
          try {
            console.log(`Fazendo upload do anexo: ${msg.attachment_path}`);
            const uploaded = await uploadAttachment(msg.attachment_path, account.access_token);
            attachmentIds = [uploaded.id];
          } catch (uploadError) {
            console.error('Erro ao subir anexo no fluxo:', uploadError);
            // Continua o envio do texto mesmo se o upload falhar
          }
        }

        // Enviar a mensagem pós-venda
        await sendMessage(
          orderId, 
          personalizedMessage, 
          clientId, 
          account.ml_user_id, 
          account.access_token, 
          attachmentIds
        );

        console.log(`Passo ${msg.step_order} do fluxo "${flow.name}" enviado com sucesso.`);

        // Registrar log de sucesso para este passo
        db.insert('notifications_log', {
          ml_account_id: account.id,
          order_id: orderId,
          topic: 'orders_v2',
          status: 'success',
          log_message: `Enviado passo ${msg.step_order} do fluxo "${flow.name}"`
        });

      } catch (stepError) {
        console.error(`Erro ao enviar passo ${msg.step_order} do fluxo "${flow.name}":`, stepError);
        db.insert('notifications_log', {
          ml_account_id: account.id,
          order_id: orderId,
          topic: 'orders_v2',
          status: 'error',
          log_message: `Erro no passo ${msg.step_order} do fluxo "${flow.name}": ${stepError.message}`
        });
      }
    }

  } catch (error) {
    console.error(`Erro geral no sendFlowMessage para ordem ${orderId}:`, error);
  }
};

module.exports = { sendFlowMessage, findFlowForProduct };
