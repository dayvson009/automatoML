const axios = require('axios');

const sendMessage = async (orderId, message, clientId, sellerId, accessToken, attachments = null) => {
  console.log("SEND MESSAGE -----------------------------------");
  console.log(`orderId: ${orderId}\nSellerId: ${sellerId}\nClienteId: ${clientId}\nMensagem: ${message}`);
  
  const url = `https://api.mercadolibre.com/messages/packs/${orderId}/sellers/${sellerId}?tag=post_sale`;
  
  const data = {
    from: { user_id: Number(sellerId) },
    to: { user_id: Number(clientId) },
    text: message,
    attachments,
  };

  const headerConfig = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json',
    },
  };

  try {
    const response = await axios.post(url, data, headerConfig);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response ? error.response.data : error.message);
    throw new Error('Erro ao enviar mensagem');
  }
};

const getMessagesOrderId = async (orderId, sellerId, accessToken) => {
  try {
    const response = await axios.get(`https://api.mercadolibre.com/messages/packs/${orderId}/sellers/${sellerId}?limit=10&offset=0&tag=post_sale`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao obter mensagens dessa conversa:', error.response ? error.response.data : error.message);
    throw new Error('Erro ao obter mensagens');
  }
};

const getMessage = async (messageId, sellerId, accessToken) => {
  try {
    const response = await axios.get(`https://api.mercadolibre.com/messages/${messageId}?seller_id=${sellerId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter detalhes da mensagem:', error.response ? error.response.data : error.message);
    throw new Error('Erro ao obter detalhes da mensagem');
  }
};

module.exports = { sendMessage, getMessagesOrderId, getMessage };
